import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Mobile Video Generation & Gallery Contracts", () => {
  const mVideoPath = path.join(__dirname, "../app/(dash)/(routes)/m/video/page.tsx");
  const mGalleryPath = path.join(__dirname, "../app/(dash)/(routes)/m/gallery/page.tsx");
  const mAudioPath = path.join(__dirname, "../app/(dash)/(routes)/m/audio/page.tsx");
  const apiAssetsPath = path.join(__dirname, "../app/api/assets/route.ts");

  it("ensures /m/video sends modelRoute, payload, and profileId in request body", () => {
    const content = fs.readFileSync(mVideoPath, "utf8");

    expect(content).toContain("useAuthenticatedFetch");
    expect(content).toContain("useActiveProfile");
    expect(content).toContain("useGenerationGate");

    expect(content).toContain("modelRoute: selectedModel.apiRoute");
    expect(content).toContain("payload: videoPayload");
    expect(content).toContain("profileId: activeProfileId");
    expect(content).toContain('"Idempotency-Key": idempotencyKey');
    expect(content).toContain('"x-profile-id": activeProfileId');

    expect(content).toContain("videoPayload.image = firstImage");
    expect(content).toContain("videoPayload.first_frame_url = firstImage");
    expect(content).toContain("videoPayload.reference_image_urls = uploadedImageUrls");
  });

  it("ensures /api/assets returns both assets and items for backward compatibility", () => {
    const content = fs.readFileSync(apiAssetsPath, "utf8");

    expect(content).toContain("assets: normalized");
    expect(content).toContain("items: normalized");
  });

  it("ensures /m/gallery consumes both data.assets and data.items with profile support", () => {
    const content = fs.readFileSync(mGalleryPath, "utf8");

    expect(content).toContain("useAuthenticatedFetch");
    expect(content).toContain("useActiveProfile");
    expect(content).toContain("data.assets");
    expect(content).toContain("data.items");
    expect(content).toContain("saad-profile-switched");
    expect(content).toContain("profileId: targetProfileId");
  });

  it("ensures /m/audio supports data.assets alongside data.items", () => {
    const content = fs.readFileSync(mAudioPath, "utf8");

    expect(content).toContain("data.assets");
    expect(content).toContain("data.items");
  });

  it("ensures /m/video has a direct link to the gallery/library", () => {
    const content = fs.readFileSync(mVideoPath, "utf8");

    expect(content).toContain('href="/m/gallery"');
    expect(content).toContain("المكتبة");
  });

  it("ensures /m/video correctly calls guardGeneration and never invokes showUpgradeModal", () => {
    const content = fs.readFileSync(mVideoPath, "utf8");

    expect(content).toContain("guardGeneration");
    expect(content).not.toContain("showUpgradeModal");
    expect(content).not.toContain("gate.canGenerate");
  });

  it("ensures TopNavbar and DashLayout suppress desktop navbar and drawer on /m/ routes", () => {
    const dashLayoutPath = path.join(__dirname, "../app/(dash)/layout.tsx");
    const topNavbarPath = path.join(__dirname, "../components/TopNavbar.tsx");

    const dashContent = fs.readFileSync(dashLayoutPath, "utf8");
    expect(dashContent).toContain('pathname?.startsWith("/m/")');
    expect(dashContent).toContain("<main>{children}</main>");

    const topNavbarContent = fs.readFileSync(topNavbarPath, "utf8");
    expect(topNavbarContent).toContain('pathname?.startsWith("/m/") || pathname === "/m"');
    expect(topNavbarContent).toContain("return null;");
  });

  it("ensures /api/assets and /m/gallery support and reconcile in-flight processing tasks", () => {
    const assetsContent = fs.readFileSync(apiAssetsPath, "utf8");
    expect(assetsContent).toContain("reconcileUserInFlightGenerations");
    expect(assetsContent).toContain("isProcessing");

    const galleryContent = fs.readFileSync(mGalleryPath, "utf8");
    expect(galleryContent).toContain("isProcessing");
    expect(galleryContent).toContain("جارٍ التوليد...");
  });

  it("ensures video posters and thumbnails resolve cleanly without broken mp4 posters", () => {
    const assetsContent = fs.readFileSync(apiAssetsPath, "utf8");
    expect(assetsContent).toContain("effectiveVideoPoster");
    expect(assetsContent).toContain("startImageUrl");
    expect(assetsContent).toContain("thumbnailUrl: isTextMarker ? undefined : (type === \"video\" ? effectiveVideoPoster : galleryThumbnailUrl(row.id, type))");

    const galleryContent = fs.readFileSync(mGalleryPath, "utf8");
    expect(galleryContent).toContain("isVideoFile");
    expect(galleryContent).toContain("item.posterUrl ?");
    expect(galleryContent).toContain("#t=0.001");
    // Ensure we do not blindly pass mp4 url to poster attribute
    expect(galleryContent).not.toContain("poster={item.thumbnailUrl || item.posterUrl || mediaUrl}");
  });

  it("ensures mobile video download provides dual paths: Web Share and direct attachment download", () => {
    const galleryContent = fs.readFileSync(mGalleryPath, "utf8");
    expect(galleryContent).toContain("handleDirectDownload");
    expect(galleryContent).toContain("تنزيل مباشر كملف");
    expect(galleryContent).toContain("حفظ في ألبوم الصور");

    const clientDownloadPath = path.join(__dirname, "../lib/client-download.ts");
    const clientDownloadContent = fs.readFileSync(clientDownloadPath, "utf8");
    expect(clientDownloadContent).toContain("isMobileDevice()");
    expect(clientDownloadContent).toContain("window.location.assign(downloadEndpoint)");

    const downloadApiPath = path.join(__dirname, "../app/api/download/route.ts");
    const downloadApiContent = fs.readFileSync(downloadApiPath, "utf8");
    expect(downloadApiContent).toContain("fetchUrl = rawUrl.startsWith(\"/\") ? `${req.nextUrl.origin}${rawUrl}` : rawUrl");
    expect(downloadApiContent).toContain("responseContentType = \"video/mp4\"");
  });
});
