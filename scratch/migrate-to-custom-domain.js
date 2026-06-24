const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to database...");
  
  const columns = await prisma.$queryRaw`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND data_type IN ('text', 'character varying', 'json', 'jsonb')
  `;
  
  console.log(`Found ${columns.length} columns to check. Scanning for R2/Proxy URLs to migrate...`);
  
  let totalUpdated = 0;
  
  const targets = [
    {
      find: "https://pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev",
      replaceWith: "https://media.saadstudio.app"
    },
    {
      find: "https://saadstudio.app/api/media",
      replaceWith: "https://media.saadstudio.app"
    }
  ];
  
  for (const col of columns) {
    const tableName = col.table_name;
    const columnName = col.column_name;
    const dataType = col.data_type;
    
    for (const target of targets) {
      const checkQuery = `
        SELECT COUNT(*)::int as count 
        FROM "${tableName}" 
        WHERE "${columnName}"::text LIKE '%${target.find}%'
      `;
      
      try {
        const [{ count }] = await prisma.$queryRawUnsafe(checkQuery);
        if (count > 0) {
          console.log(`Table "${tableName}", Column "${columnName}" (${dataType}): Found ${count} matches for ${target.find}. Migrating...`);
          
          let updateQuery = "";
          if (dataType === "jsonb" || dataType === "json") {
            updateQuery = `
              UPDATE "${tableName}" 
              SET "${columnName}" = REPLACE(
                "${columnName}"::text, 
                '${target.find}', 
                '${target.replaceWith}'
              )::${dataType}
              WHERE "${columnName}"::text LIKE '%${target.find}%'
            `;
          } else {
            updateQuery = `
              UPDATE "${tableName}" 
              SET "${columnName}" = REPLACE(
                "${columnName}"::text, 
                '${target.find}', 
                '${target.replaceWith}'
              )
              WHERE "${columnName}"::text LIKE '%${target.find}%'
            `;
          }
          
          await prisma.$executeRawUnsafe(updateQuery);
          totalUpdated += count;
        }
      } catch (err) {
        console.error(`Failed on table ${tableName}, column ${columnName} (${dataType}) for ${target.find}:`, err.message);
      }
    }
  }
  
  console.log(`Migration completed! Total fields migrated to custom domain: ${totalUpdated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
