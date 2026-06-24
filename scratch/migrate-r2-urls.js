const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to database...");
  
  // Query all tables and columns that are strings or JSON
  const columns = await prisma.$queryRaw`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND data_type IN ('text', 'character varying', 'json', 'jsonb')
  `;
  
  console.log(`Found ${columns.length} columns to check. Scanning for old R2 URLs...`);
  
  let totalUpdated = 0;
  
  for (const col of columns) {
    const tableName = col.table_name;
    const columnName = col.column_name;
    const dataType = col.data_type;
    
    const checkQuery = `
      SELECT COUNT(*)::int as count 
      FROM "${tableName}" 
      WHERE "${columnName}"::text LIKE '%pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev%'
    `;
    
    try {
      const [{ count }] = await prisma.$queryRawUnsafe(checkQuery);
      if (count > 0) {
        console.log(`Table "${tableName}", Column "${columnName}" (${dataType}): Found ${count} matching records. Updating...`);
        
        let updateQuery = "";
        if (dataType === "jsonb" || dataType === "json") {
          updateQuery = `
            UPDATE "${tableName}" 
            SET "${columnName}" = REPLACE(
              "${columnName}"::text, 
              'https://pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev', 
              'https://saadstudio.app/api/media'
            )::${dataType}
            WHERE "${columnName}"::text LIKE '%pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev%'
          `;
        } else {
          updateQuery = `
            UPDATE "${tableName}" 
            SET "${columnName}" = REPLACE(
              "${columnName}"::text, 
              'https://pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev', 
              'https://saadstudio.app/api/media'
            )
            WHERE "${columnName}"::text LIKE '%pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev%'
          `;
        }
        
        await prisma.$executeRawUnsafe(updateQuery);
        totalUpdated += count;
      }
    } catch (err) {
      console.error(`Failed on table ${tableName}, column ${columnName} (${dataType}):`, err.message);
    }
  }
  
  console.log(`Migration completed! Total fields updated: ${totalUpdated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
