import { describe, expect, it } from "vitest";

import {
  COOKIE_CONSENT_VERSION,
  createCookieConsent,
  parseCookieConsent,
} from "@/lib/cookie-consent";

describe("cookie consent", () => {
  it("creates a versioned consent record with necessary cookies enabled", () => {
    const consent = createCookieConsent({ analytics: true, marketing: false });

    expect(consent).toMatchObject({
      version: COOKIE_CONSENT_VERSION,
      necessary: true,
      analytics: true,
      marketing: false,
    });
    expect(Number.isNaN(Date.parse(consent.updatedAt))).toBe(false);
  });

  it("reads encoded consent and rejects invalid or outdated records", () => {
    const consent = createCookieConsent({ analytics: false, marketing: true });
    const encoded = encodeURIComponent(JSON.stringify(consent));

    expect(parseCookieConsent(encoded)).toEqual(consent);
    expect(parseCookieConsent("not-json")).toBeNull();
    expect(parseCookieConsent(JSON.stringify({ ...consent, version: 0 }))).toBeNull();
  });
});

