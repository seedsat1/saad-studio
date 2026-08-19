import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Admin Users Backend Foundation Safety Suite", () => {
  const usersListRoutePath = path.join(process.cwd(), "app", "api", "admin", "users", "route.ts");
  const userDetailRoutePath = path.join(process.cwd(), "app", "api", "admin", "users", "[userId]", "route.ts");

  describe("Task 1: User List Read Model & Pagination", () => {
    const content = fs.readFileSync(usersListRoutePath, "utf-8");

    it("verifies server-side pagination with clamped limits (10 to 100)", () => {
      expect(content).toContain('rawPage = parseInt(searchParams.get("page") || "1"');
      expect(content).toContain('rawLimit = parseInt(searchParams.get("limit") || "25"');
      expect(content).toContain("rawLimit >= 10 && rawLimit <= 100");
      expect(content).toContain("skip: (page - 1) * limit");
      expect(content).toContain("take: limit");
    });

    it("verifies server-side search handles name, email, and phone with case-insensitivity", () => {
      expect(content).toContain('mode: "insensitive"');
      expect(content).toContain("name: { contains: search");
      expect(content).toContain("email: { contains: search");
      expect(content).toContain("phone: { contains: search");
    });

    it("verifies status filters for subscriber, annual, free, and banned", () => {
      expect(content).toContain('status === "subscriber"');
      expect(content).toContain('status === "annual"');
      expect(content).toContain('status === "free"');
      expect(content).toContain('status === "banned"');
    });

    it("verifies zero N+1 queries via batch userSubscription lookup", () => {
      expect(content).toContain("prismadb.userSubscription.findMany");
      expect(content).toContain("userId: { in: pageUserIds }");
      expect(content).toContain("const subMap = new Map");
    });

    it("verifies list payload does NOT load heavy generations or transaction arrays", () => {
      expect(content).not.toContain("generations: true");
      expect(content).not.toContain("transactions: true");
      expect(content).not.toContain("providerUsageRecords: true");
    });
  });

  describe("Task 2: User Detail Inspector Read Model", () => {
    const content = fs.readFileSync(userDetailRoutePath, "utf-8");

    it("verifies GET /api/admin/users/[userId] returns compact on-demand inspector data", () => {
      expect(content).toContain("export async function GET");
      expect(content).toContain("prismadb.adminTransaction.findMany");
      expect(content).toContain("take: 10");
      expect(content).toContain("prismadb.generation.count");
    });
  });

  describe("Task 3: Safe Delete Semantics & Financial History Preservation", () => {
    const content = fs.readFileSync(userDetailRoutePath, "utf-8");

    it("verifies safe delete anonymizes user and preserves primary row for AdminTransaction FK", () => {
      expect(content).toContain('name: "Deleted User"');
      expect(content).toContain('role: "DELETED"');
      expect(content).toContain("creditBalance: 0");
      expect(content).toContain("isBanned: true");
      // Does not delete prismadb.user so AdminTransaction cascade is NOT triggered
      expect(content).not.toContain("prismadb.user.delete");
    });

    it("verifies safe delete cleans up orphan UserSubscription and UserApiLimit", () => {
      expect(content).toContain("tx.userSubscription.deleteMany");
      expect(content).toContain("tx.userApiLimit.deleteMany");
    });

    it("verifies Clerk failure is not silently ignored", () => {
      expect(content).toContain("clerk.users.deleteUser");
      expect(content).toContain("status !== 404");
      expect(content).toContain("Clerk authentication deletion failed");
    });
  });
});
