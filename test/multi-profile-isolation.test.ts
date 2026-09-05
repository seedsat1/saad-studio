import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET as getProfiles, POST as createProfile } from "@/app/api/profiles/route";
import { PATCH as updateProfile, DELETE as deleteProfile } from "@/app/api/profiles/[profileId]/route";
import { GET as getAssets } from "@/app/api/assets/route";
import prismadb from "@/lib/prismadb";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(() => Promise.resolve({ userId: "test-user-123" })),
}));

// Mock BytePlus reconcile
vi.mock("@/lib/providers/byteplus-reconcile", () => ({
  reconcilePendingBytePlusGenerations: vi.fn(() => Promise.resolve()),
}));

describe("Multi-Profile Isolation & Management Suite", () => {
  const userId = "test-user-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Profiles API (/api/profiles)", () => {
    it("initializes and returns default profile if user has no profiles", async () => {
      const mockDbUser = { id: userId, name: "Ahmed", email: "ahmed@example.com" };
      const mockDefaultProfile = {
        id: "profile-default",
        userId,
        name: "Ahmed",
        avatarPreset: 1,
        avatarPhoto: null,
        isDefault: true,
        createdAt: new Date(),
        _count: { generations: 5 },
      };

      vi.spyOn(prismadb.user, "findUnique").mockResolvedValue(mockDbUser as any);
      vi.spyOn((prismadb as any).userProfile, "findMany").mockResolvedValue([]);
      vi.spyOn((prismadb as any).userProfile, "create").mockResolvedValue(mockDefaultProfile as any);
      vi.spyOn(prismadb.generation, "count").mockResolvedValue(10 as any); // unassigned generations

      const req = new NextRequest("http://localhost/api/profiles");
      const res = await getProfiles(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.profiles).toHaveLength(1);
      expect(data.profiles[0].isDefault).toBe(true);
      expect(data.profiles[0].name).toBe("Ahmed");
      expect(data.maxProfiles).toBe(10);
    });

    it("creates a new custom named profile when under the limit", async () => {
      const mockNewProfile = {
        id: "profile-custom-1",
        userId,
        name: "YouTube Channel",
        avatarPreset: 3,
        avatarPhoto: null,
        isDefault: false,
        createdAt: new Date(),
      };

      vi.spyOn((prismadb as any).userProfile, "count").mockResolvedValue(2);
      vi.spyOn((prismadb as any).userProfile, "create").mockResolvedValue(mockNewProfile as any);

      const req = new NextRequest("http://localhost/api/profiles", {
        method: "POST",
        body: JSON.stringify({ name: "YouTube Channel", avatarPreset: 3 }),
      });

      const res = await createProfile(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.profile.name).toBe("YouTube Channel");
      expect(data.profile.avatarPreset).toBe(3);
      expect(data.profile.isDefault).toBe(false);
    });

    it("blocks creating more than 10 profiles", async () => {
      vi.spyOn((prismadb as any).userProfile, "count").mockResolvedValue(10);

      const req = new NextRequest("http://localhost/api/profiles", {
        method: "POST",
        body: JSON.stringify({ name: "11th Profile" }),
      });

      const res = await createProfile(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("10");
    });
  });

  describe("Profile Operations (/api/profiles/[profileId])", () => {
    it("updates profile name and avatar successfully", async () => {
      const existing = { id: "p-2", userId, name: "Old Name", avatarPreset: 1 };
      const updated = { id: "p-2", userId, name: "New Name", avatarPreset: 5, isDefault: false, createdAt: new Date() };

      vi.spyOn((prismadb as any).userProfile, "findUnique").mockResolvedValue(existing as any);
      vi.spyOn((prismadb as any).userProfile, "update").mockResolvedValue(updated as any);

      const req = new NextRequest("http://localhost/api/profiles/p-2", {
        method: "PATCH",
        body: JSON.stringify({ name: "New Name", avatarPreset: 5 }),
      });

      const res = await updateProfile(req, { params: { profileId: "p-2" } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.profile.name).toBe("New Name");
      expect(data.profile.avatarPreset).toBe(5);
    });

    it("prevents deleting the default profile", async () => {
      const defaultProfile = { id: "p-default", userId, name: "Default", isDefault: true };
      vi.spyOn((prismadb as any).userProfile, "findUnique").mockResolvedValue(defaultProfile as any);

      const req = new NextRequest("http://localhost/api/profiles/p-default", { method: "DELETE" });
      const res = await deleteProfile(req, { params: { profileId: "p-default" } });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("لا يمكن حذف البروفايل الرئيسي");
    });

    it("migrates creations to default profile when deleting a non-default profile", async () => {
      const customProfile = { id: "p-custom", userId, name: "Work", isDefault: false };
      const defaultProfile = { id: "p-default", userId, name: "Default", isDefault: true };

      vi.spyOn((prismadb as any).userProfile, "findUnique").mockResolvedValue(customProfile as any);
      vi.spyOn((prismadb as any).userProfile, "findFirst").mockResolvedValue(defaultProfile as any);
      const updateManySpy = vi.spyOn(prismadb.generation, "updateMany").mockResolvedValue({ count: 8 } as any);
      const deleteSpy = vi.spyOn((prismadb as any).userProfile, "delete").mockResolvedValue({ id: "p-custom" } as any);

      const req = new NextRequest("http://localhost/api/profiles/p-custom", { method: "DELETE" });
      const res = await deleteProfile(req, { params: { profileId: "p-custom" } });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(updateManySpy).toHaveBeenCalledWith({
        where: { userId, profileId: "p-custom" },
        data: { profileId: "p-default" },
      });
      expect(deleteSpy).toHaveBeenCalledWith({ where: { id: "p-custom" } });
    });
  });

  describe("Assets Isolation (/api/assets)", () => {
    it("queries only Profile B generations when profileId is set to Profile B", async () => {
      const profileB = { id: "profile-b", userId, isDefault: false };
      vi.spyOn((prismadb as any).userProfile, "findUnique").mockResolvedValue(profileB as any);

      const findManySpy = vi.spyOn((prismadb.generation as any), "findMany").mockResolvedValue([]);
      vi.spyOn(prismadb.generation, "count").mockResolvedValue(0 as any);

      const req = new NextRequest("http://localhost/api/assets?type=all&profileId=profile-b");
      await getAssets(req);

      expect(findManySpy).toHaveBeenCalled();
      const whereArg = findManySpy.mock.calls[0][0].where;
      // Expect profileWhere to contain { profileId: 'profile-b' }
      expect(whereArg.AND).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ profileId: "profile-b" })
        ])
      );
    });

    it("includes legacy unassigned generations when active profile is the default profile", async () => {
      const defaultProfile = { id: "profile-default", userId, isDefault: true };
      vi.spyOn((prismadb as any).userProfile, "findUnique").mockResolvedValue(defaultProfile as any);

      const findManySpy = vi.spyOn((prismadb.generation as any), "findMany").mockResolvedValue([]);
      vi.spyOn(prismadb.generation, "count").mockResolvedValue(0 as any);

      const req = new NextRequest("http://localhost/api/assets?type=all&profileId=profile-default");
      await getAssets(req);

      expect(findManySpy).toHaveBeenCalled();
      const whereArg = findManySpy.mock.calls[0][0].where;
      expect(whereArg.AND).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            OR: [
              { profileId: "profile-default" },
              { profileId: null },
            ]
          })
        ])
      );
    });
  });
});
