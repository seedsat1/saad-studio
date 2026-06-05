// One-off read-only scan: ask Postgres itself which columns contain
// "supabase.co" anywhere. Uses information_schema so we don't have to
// enumerate Prisma model names. Read-only — safe against production.
//
// Usage:  node --env-file=.env.local scripts/scan-supabase-urls.mjs

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const NEEDLE = "supabase.co";

async function listTextColumns() {
  return prisma.$queryRawUnsafe(`
    SELECT table_schema, table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type IN ('text','character varying','varchar','jsonb','json')
    ORDER BY table_name, column_name
  `);
}

async function countHits(schema, table, column, dataType) {
  const fq = `"${schema}"."${table}"`;
  const col = `"${column}"`;
  const expr = dataType.includes("json") ? `${col}::text` : col;
  const sql = `SELECT COUNT(*)::int AS n FROM ${fq} WHERE ${expr} ILIKE $1`;
  try {
    const rows = await prisma.$queryRawUnsafe(sql, `%${NEEDLE}%`);
    return Number(rows?.[0]?.n ?? 0);
  } catch (e) {
    return { error: e.message.split("\n")[0].slice(0, 100) };
  }
}

async function fetchSample(schema, table, column, dataType) {
  const fq = `"${schema}"."${table}"`;
  const col = `"${column}"`;
  const expr = dataType.includes("json") ? `${col}::text` : col;
  const sql = `
    SELECT id::text AS id, ${col} AS val
    FROM ${fq}
    WHERE ${expr} ILIKE $1
    LIMIT 1
  `;
  try {
    const rows = await prisma.$queryRawUnsafe(sql, `%${NEEDLE}%`);
    return rows?.[0] ?? null;
  } catch {
    return null;
  }
}

async function main() {
  console.log(`\nScanning Neon (information_schema) for "${NEEDLE}"…\n`);

  const columns = await listTextColumns();
  console.log(`Found ${columns.length} text/json columns across public schema.\n`);

  let total = 0;
  const hits = [];
  const errors = [];

  for (const c of columns) {
    const result = await countHits(c.table_schema, c.table_name, c.column_name, c.data_type);
    if (typeof result === "object" && result.error) {
      errors.push({ ...c, error: result.error });
    } else if (result > 0) {
      const sample = await fetchSample(c.table_schema, c.table_name, c.column_name, c.data_type);
      hits.push({ ...c, count: result, sample });
      total += result;
    }
  }

  if (hits.length === 0) {
    console.log("✅ NO COLUMN contains supabase.co.\n");
  } else {
    console.log("⚠️  Columns with supabase.co references:");
    for (const h of hits) {
      console.log(`  - ${h.table_name}.${h.column_name} (${h.data_type}): ${h.count} rows`);
      if (h.sample) {
        const val = typeof h.sample.val === "string"
          ? h.sample.val.slice(0, 140)
          : JSON.stringify(h.sample.val).slice(0, 140);
        console.log(`      sample id=${h.sample.id}  →  ${val}`);
      }
    }
    console.log("");
  }

  if (errors.length) {
    console.log(`Note: ${errors.length} columns could not be queried (typically id-less tables, skipped):`);
    for (const e of errors.slice(0, 5)) {
      console.log(`  - ${e.table_name}.${e.column_name}: ${e.error}`);
    }
    if (errors.length > 5) console.log(`  …and ${errors.length - 5} more.`);
    console.log("");
  }

  console.log(`Total rows referencing supabase.co: ${total}`);
  if (total === 0) {
    console.log("✅ SAFE TO CANCEL SUPABASE — no data depends on it.\n");
  } else {
    console.log("⚠️  Migrate or accept link rot for the rows above before canceling Supabase.\n");
  }
}

main()
  .catch((e) => { console.error("FATAL:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
