import { describe, expect, it } from "vitest";
import { getDynamicImageModels, getDynamicVideoModels } from "@/lib/dynamic-model-loader";
import { buildCentralModelDefinitions } from "@/lib/model-definition-registry";
import { loadAdminRoutingData } from "@/lib/routing/admin-routing-data";
import { loadModels } from "@/lib/pricing";
import { THREE_D_ROUTING_MODELS } from "@/lib/three-d-models";

describe("Admin Models Deep Reality Audit", () => {
  it("computes exact model counts across all registries and modalities", async () => {
    const [imageModels, videoModels, pricingModels, routingData] = await Promise.all([
      getDynamicImageModels(),
      getDynamicVideoModels(),
      loadModels(),
      loadAdminRoutingData(),
    ]);

    const centralDefinitions = buildCentralModelDefinitions({ imageModels, videoModels });
    const audioPricingModels = pricingModels.filter((m) => m.type === "audio");

    console.log("=== MODEL AUDIT COUNTS ===");
    console.log(`Dynamic Image Models: ${imageModels.length}`);
    console.log(`Dynamic Video Models: ${videoModels.length}`);
    console.log(`Central Definitions (Image+Video): ${centralDefinitions.length}`);
    console.log(`Audio Models (from pricing): ${audioPricingModels.length}`);
    console.log(`3D Models (THREE_D_ROUTING_MODELS): ${THREE_D_ROUTING_MODELS.length}`);
    console.log(`Total Routing Rows: ${routingData.rows.length}`);
    console.log(`Total Pricing Models: ${pricingModels.length}`);

    // Check active vs inactive
    const activeImage = imageModels.filter((m) => m.isActive !== false).length;
    const activeVideo = videoModels.filter((m) => m.isActive !== false).length;
    console.log(`Active Image Models: ${activeImage}/${imageModels.length}`);
    console.log(`Active Video Models: ${activeVideo}/${videoModels.length}`);

    // Check routing modality breakdown
    const imageRouting = routingData.rows.filter((r) => r.modality === "image").length;
    const videoRouting = routingData.rows.filter((r) => r.modality === "video").length;
    const audioRouting = routingData.rows.filter((r) => r.modality === "audio").length;
    const threeDRouting = routingData.rows.filter((r) => r.modality === "3d").length;
    console.log(`Routing Modalities: Image=${imageRouting}, Video=${videoRouting}, Audio=${audioRouting}, 3D=${threeDRouting} -> Sum=${imageRouting + videoRouting + audioRouting + threeDRouting}`);

    // Check pricing linkage
    const pricedIds = new Set(pricingModels.map((p) => p.id.toLowerCase()));
    const unpricedRows = routingData.rows.filter((r) => !pricedIds.has(r.modelId.toLowerCase()));
    console.log(`Unpriced Routing Rows (${unpricedRows.length}):`, unpricedRows.map((r) => `${r.modality}:${r.modelId}`));

    expect(routingData.rows.length).toBe(81);
  });
});
