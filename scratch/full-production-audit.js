const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=========================================");
  console.log("    SAAD STUDIO FULL PRODUCTION AUDIT    ");
  console.log("=========================================\n");

  const auditResults = {
    staleR2Links: [],
    duplicatedMediaUrls: [],
    taskMediaUrls: [],
    httpMediaUrls: [],
    brokenCmsLayouts: [],
    brokenPresetAssets: [],
    userCreditDiscrepancies: []
  };

  // 1. SCAN TABLES FOR STALE R2 LINKS OR INVALID PREFIXES
  console.log("--- 1. Scanning Tables for Invalid Media URL Formats ---");
  const models = [
    { name: "Generation", fields: ["mediaUrl", "outputUrl"] },
    { name: "ShowcaseItem", fields: ["videoUrl", "thumbnailUrl"] },
    { name: "StudioImg", fields: ["beforeUrl", "afterUrl", "videoUrl", "posterUrl"] },
    { name: "StudioImgStep", fields: ["beforeUrl", "afterUrl", "videoUrl", "posterUrl"] },
    { name: "CinemaAsset", fields: ["url", "thumbnailUrl"] },
    { name: "TransitionOutput", fields: ["url", "thumbnailUrl", "inputAUrl", "inputBUrl"] },
    { name: "VariationOutput", fields: ["assetUrl", "thumbnailUrl"] }
  ];

  for (const m of models) {
    try {
      const records = await prisma[m.name.charAt(0).toLowerCase() + m.name.slice(1)].findMany();

      for (const rec of records) {
        for (const f of m.fields) {
          const val = rec[f];
          if (!val || typeof val !== "string") continue;

          // Check for stale R2 links
          if (val.includes("pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev") || val.includes(".r2.dev")) {
            auditResults.staleR2Links.push({ model: m.name, field: f, id: rec.id, value: val });
          }

          // Check for duplicated media prefix
          if (val.startsWith("/api/media/media") || val.includes("/api/media/api/media") || val.includes("api/media/api/media")) {
            auditResults.duplicatedMediaUrls.push({ model: m.name, field: f, id: rec.id, value: val });
          }

          // Check for task prefix
          if (val.includes("/api/media/task:") || val.startsWith("task:")) {
            auditResults.taskMediaUrls.push({ model: m.name, field: f, id: rec.id, value: val });
          }

          // Check for double proxying of http/https urls
          if (val.startsWith("/api/media/http") || val.includes("api/media/https")) {
            auditResults.httpMediaUrls.push({ model: m.name, field: f, id: rec.id, value: val });
          }
        }
      }
    } catch (e) {
      console.log(`Skipping or failed model ${m.name}: ${e.message}`);
    }
  }

  console.log(`- Stale R2 links found: ${auditResults.staleR2Links.length}`);
  console.log(`- Duplicated media prefixes found: ${auditResults.duplicatedMediaUrls.length}`);
  console.log(`- Task media URLs found: ${auditResults.taskMediaUrls.length}`);
  console.log(`- Proxy HTTP/HTTPS media URLs found: ${auditResults.httpMediaUrls.length}`);

  if (auditResults.staleR2Links.length > 0) {
    console.log("Sample Stale R2 Links:", JSON.stringify(auditResults.staleR2Links.slice(0, 5), null, 2));
  }
  if (auditResults.duplicatedMediaUrls.length > 0) {
    console.log("Sample Duplicated Media Prefixes:", JSON.stringify(auditResults.duplicatedMediaUrls.slice(0, 5), null, 2));
  }
  if (auditResults.taskMediaUrls.length > 0) {
    console.log("Sample Task Media URLs:", JSON.stringify(auditResults.taskMediaUrls.slice(0, 5), null, 2));
  }

  // 2. AUDIT CMS PAGE LAYOUTS
  console.log("\n--- 2. Auditing CMS Page Layouts (Presets, Cinematic Styles, Transitions) ---");
  try {
    const layouts = await prisma.pageLayout.findMany();
    console.log(`Total page layouts: ${layouts.length}`);
    for (const layout of layouts) {
      const contentStr = JSON.stringify(layout.layoutData || {});
      
      // Check for R2 links in layoutData
      if (contentStr.includes(".r2.dev")) {
        auditResults.brokenCmsLayouts.push({ id: layout.id, slug: layout.slug, reason: "Contains R2 links" });
      }
      
      // Check for Supabase links (which might be payment-required 402 blocked)
      if (contentStr.includes("lkanvahqkggmhzlknduc.supabase.co")) {
        auditResults.brokenCmsLayouts.push({ id: layout.id, slug: layout.slug, reason: "Contains Supabase links" });
      }
    }
  } catch (e) {
    console.log(`Failed to audit page layouts: ${e.message}`);
  }
  console.log(`- Broken or problematic CMS layouts: ${auditResults.brokenCmsLayouts.length}`);
  if (auditResults.brokenCmsLayouts.length > 0) {
    console.log(JSON.stringify(auditResults.brokenCmsLayouts.slice(0, 10), null, 2));
  }

  // 3. AUDIT USER CREDIT BALANCES & ADVANCES
  console.log("\n--- 3. Auditing User Credit Balances & Advances ---");
  try {
    const users = await prisma.user.findMany();
    for (const u of users) {
      if (u.creditBalance < 0) {
        auditResults.userCreditDiscrepancies.push({ id: u.id, email: u.email, balance: u.creditBalance, reason: "Negative credit balance" });
      }
    }
  } catch (e) {
    console.log(`Failed to audit users: ${e.message}`);
  }
  console.log(`- User credit balance issues: ${auditResults.userCreditDiscrepancies.length}`);

  console.log("\n=========================================");
  console.log("              AUDIT COMPLETE             ");
  console.log("=========================================");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
