const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to database to revert changes...");
  
  const columns = await prisma.$queryRaw`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND data_type IN ('text', 'character varying', 'json', 'jsonb')
  `;
  
  console.log(`Found ${columns.length} columns to check. Scanning for proxied URLs to revert...`);
  
  let totalUpdated = 0;
  
  for (const col of columns) {
    const tableName = col.table_name;
    const columnName = col.column_name;
    const dataType = col.data_type;
    
    const checkQuery = `
      SELECT COUNT(*)::int as count 
      FROM "${tableName}" 
      WHERE "${columnName}"::text LIKE '%saadstudio.app/api/media%'
    `;
    
    try {
      const [{ count }] = await prisma.$queryRawUnsafe(checkQuery);
      if (count > 0) {
        console.log(`Table "${tableName}", Column "${columnName}" (${dataType}): Found ${count} matching records. Reverting...`);
        
        let updateQuery = "";
        if (dataType === "jsonb" || dataType === "json") {
          updateQuery = `
            UPDATE "${tableName}" 
            SET "${columnName}" = REPLACE(
              "${columnName}"::text, 
              'https://saadstudio.app/api/media',
              'https://pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev'
            )::${dataType}
            WHERE "${columnName}"::text LIKE '%saadstudio.app/api/media%'
          `;
        } else {
          updateQuery = `
            UPDATE "${tableName}" 
            SET "${columnName}" = REPLACE(
              "${columnName}"::text, 
              'https://saadstudio.app/api/media',
              'https://pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev'
            )
            WHERE "${columnName}"::text LIKE '%saadstudio.app/api/media%'
          `;
        }
        
        await prisma.$executeRawUnsafe(updateQuery);
        totalUpdated += count;
      }
    } catch (err) {
      console.error(`Failed on table ${tableName}, column ${columnName} (${dataType}):`, err.message);
    }
  }
  
  console.log(`Reversion completed! Total fields reverted: ${totalUpdated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
