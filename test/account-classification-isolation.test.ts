import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  OWNER_TEST_ACCOUNTS,
  ADMIN_ACCOUNTS,
  LEGACY_TEST_ACCOUNTS,
  EXCLUDED_FROM_COMMERCIAL_ANALYTICS_EMAILS,
  isCommercialCustomerEmail,
  isExcludedFromCommercialAnalytics,
} from "@/lib/admin/account-classification";

describe("Central Account Classification & Commercial Analytics Isolation Suite", () => {
  it("verifies single source of truth account classifications", () => {
    expect(OWNER_TEST_ACCOUNTS).toEqual([
      "seedsat81@gmail.com",
      "seedsat@gmail.com",
      "cookwife5@gmail.com",
    ]);

    expect(ADMIN_ACCOUNTS).toEqual(["seedsat2@gmail.com"]);

    expect(LEGACY_TEST_ACCOUNTS).toEqual(["seedsat@googlemail.com"]);

    expect(EXCLUDED_FROM_COMMERCIAL_ANALYTICS_EMAILS).toHaveLength(5);
    expect(EXCLUDED_FROM_COMMERCIAL_ANALYTICS_EMAILS).toContain("seedsat81@gmail.com");
    expect(EXCLUDED_FROM_COMMERCIAL_ANALYTICS_EMAILS).toContain("seedsat@gmail.com");
    expect(EXCLUDED_FROM_COMMERCIAL_ANALYTICS_EMAILS).toContain("cookwife5@gmail.com");
    expect(EXCLUDED_FROM_COMMERCIAL_ANALYTICS_EMAILS).toContain("seedsat2@gmail.com");
    expect(EXCLUDED_FROM_COMMERCIAL_ANALYTICS_EMAILS).toContain("seedsat@googlemail.com");
  });

  it("verifies Omar is strictly recognized as a real paying commercial customer", () => {
    expect(isCommercialCustomerEmail("omarworkimn@gmail.com")).toBe(true);
    expect(isCommercialCustomerEmail("OMARWORKIMN@GMAIL.COM")).toBe(true);
    expect(isCommercialCustomerEmail(" omarworkimn@gmail.com ")).toBe(true);
    expect(isExcludedFromCommercialAnalytics("omarworkimn@gmail.com")).toBe(false);
  });

  it("verifies owner test and admin accounts are strictly excluded from commercial analytics", () => {
    expect(isCommercialCustomerEmail("seedsat81@gmail.com")).toBe(false);
    expect(isCommercialCustomerEmail("seedsat@gmail.com")).toBe(false);
    expect(isCommercialCustomerEmail("cookwife5@gmail.com")).toBe(false);
    expect(isCommercialCustomerEmail("seedsat2@gmail.com")).toBe(false);
    expect(isCommercialCustomerEmail("seedsat@googlemail.com")).toBe(false);

    expect(isExcludedFromCommercialAnalytics("seedsat81@gmail.com")).toBe(true);
    expect(isExcludedFromCommercialAnalytics("seedsat2@gmail.com")).toBe(true);
  });

  it("verifies subscriber-analytics API route imports from central classification source", () => {
    const routePath = path.join(process.cwd(), "app", "api", "admin", "subscriber-analytics", "route.ts");
    const content = fs.readFileSync(routePath, "utf-8");
    expect(content).toContain('from "@/lib/admin/account-classification"');
    expect(content).toContain("EXCLUDED_FROM_COMMERCIAL_ANALYTICS_EMAILS");
  });

  it("verifies provider reconciliation read model imports from central classification source", () => {
    const servicePath = path.join(process.cwd(), "lib", "admin", "provider-reconciliation-read-model.ts");
    const content = fs.readFileSync(servicePath, "utf-8");
    expect(content).toContain('from "@/lib/admin/account-classification"');
  });
});
