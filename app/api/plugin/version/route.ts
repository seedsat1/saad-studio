import { NextResponse } from "next/server";
import { getPluginOperationalConfig } from "@/lib/admin/plugin-control-plane";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getPluginOperationalConfig();

    const responsePayload = {
      name: "SaadStudio",
      version: config.currentVersion,
      minSupportedVersion: config.minSupportedVersion,
      displayName: "SaadStudio - Adobe Creative Cloud Extension",
      description: "إضافة احترافية لـ Adobe Creative Cloud توفر أدوات متقدمة للتحرير والإنتاج",
      releaseDate: config.releaseDate,
      operationalState: config.status,
      compatibility: {
        minVersion: "2022.0",
        maxVersion: "2026.0",
        platforms: ["Windows", "macOS"],
      },
      downloads: {
        url: config.downloadUrl.startsWith("http") ? config.downloadUrl : `https://www.saadstudio.app${config.downloadUrl}`,
        zxpUrl: config.zxpUrl.startsWith("http") ? config.zxpUrl : `https://www.saadstudio.app${config.zxpUrl}`,
        fileSize: "33.6 MB",
        fileHash: "to-be-computed",
        lastUpdated: config.updatedAt,
      },
      maintenance: {
        isMaintenance: config.status === "maintenance",
        isDisabled: config.status === "disabled",
        message: config.status === "maintenance" ? config.maintenanceMessage : config.status === "disabled" ? config.disabledMessage : "",
      },
      changelog: [
        {
          version: config.currentVersion,
          date: config.releaseDate,
          changes: config.releaseNotes,
        },
      ],
      requirements: {
        ram: "2 GB minimum",
        storage: "100 MB minimum",
        os: "Windows 10+ or macOS 10.15+",
        adobeVersion: "Creative Cloud 2022 or later",
      },
      support: {
        email: "support@saadstudio.app",
        website: "https://www.saadstudio.app",
        documentation: "https://www.saadstudio.app/docs",
      },
    };

    return NextResponse.json(responsePayload, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to load plugin version: ${message}` }, { status: 500 });
  }
}
