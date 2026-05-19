import { createRequire } from "module"
const require = createRequire(import.meta.url)
const { Client } = require("pg")

const client = new Client({
  host: "aws-1-sa-east-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: "postgres.aoxyeucljienuilwdxli",
  password: "650gW4w7joCGN8VRH9Ii",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
})

await client.connect()

const cols = await client.query(`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'agentes_sedes'
  ORDER BY ordinal_position
`)
console.log("=== agentes_sedes columns ===")
console.log(JSON.stringify(cols.rows, null, 2))

const idx = await client.query(`
  SELECT indexname, indexdef
  FROM pg_indexes
  WHERE tablename = 'agentes_sedes'
`)
console.log("\n=== indexes ===")
console.log(JSON.stringify(idx.rows, null, 2))

await client.end()
