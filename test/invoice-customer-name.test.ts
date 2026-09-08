import { describe, it, expect, vi, beforeEach } from "vitest";

// The receipt looks the subscriber up by email; nothing here touches a real DB.
const findUnique = vi.fn();
vi.mock("@/lib/prismadb", () => ({
  default: {
    user: { findUnique: (...a: any[]) => findUnique(...a) },
    siteSetting: { findFirst: async () => null },
  },
}));

import { buildInvoiceHtml, buildInvoiceText } from "@/lib/email-templates/invoice";

const base = {
  to: "Subscriber@Example.com",
  orderId: "SS-TEST-1",
  displayPlan: "Plus Monthly",
  amount: 35,
  credits: 800,
  startsAt: new Date("2026-09-07T00:00:00Z"),
  endsAt: new Date("2026-10-07T00:00:00Z"),
  method: "manual",
};

describe("invoice receipt shows the subscriber", () => {
  beforeEach(() => {
    findUnique.mockClear();
    findUnique.mockImplementation(async () => null);
  });

  it("looks the name up from the account when none is passed", async () => {
    findUnique.mockResolvedValue({ name: "Saad Al-Basri" });
    const html = await buildInvoiceHtml({ ...base });
    expect(html).toContain("Billed To");
    expect(html).toContain("Saad Al-Basri");
    expect(html).toContain("Subscriber@Example.com");
    // looked up by the lowercased address
    expect(findUnique).toHaveBeenCalledWith({
      where: { email: "subscriber@example.com" },
      select: { name: true },
    });
  });

  it("prefers an explicit name over the account name", async () => {
    findUnique.mockResolvedValue({ name: "Account Name" });
    const html = await buildInvoiceHtml({ ...base, customerName: "Typed Name" });
    expect(html).toContain("Typed Name");
    expect(html).not.toContain("Account Name");
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("still renders with the email alone when there is no name", async () => {
    findUnique.mockResolvedValue({ name: null });
    const html = await buildInvoiceHtml({ ...base });
    expect(html).toContain("Billed To");
    expect(html).toContain("Subscriber@Example.com");
  });

  it("never lets a DB failure block the receipt", async () => {
    findUnique.mockImplementation(async () => {
      throw new Error("db down");
    });
    const html = await buildInvoiceHtml({ ...base });
    expect(html).toContain("Subscriber@Example.com");
    expect(html).toContain("US$35.00");
  });

  it("names the subscriber in the plain-text part too", () => {
    expect(buildInvoiceText({ ...base, customerName: "Typed Name" })).toContain(
      "Billed to / المشترك: Typed Name <Subscriber@Example.com>",
    );
    expect(buildInvoiceText({ ...base })).toContain(
      "Billed to / المشترك: Subscriber@Example.com",
    );
  });
});
