import { readFileSync } from "fs"
import { createRequire } from "module"
import dns from "dns"

dns.setServers(["8.8.8.8", "8.8.4.4"])

const require = createRequire(import.meta.url)
const { Client } = require("pg")

const PASSWORD = "650gW4w7joCGN8VRH9Ii"
const REF = "aoxyeucljienuilwdxli"
const REGION = "sa-east-1"
const POOLER = "aws-1"

const configs = [
  { connectionString: `postgresql://postgres.${REF}:${PASSWORD}@${POOLER}-${REGION}.pooler.supabase.com:5432/postgres`, ssl: { rejectUnauthorized: false } },
  { connectionString: `postgresql://postgres.${REF}:${PASSWORD}@${POOLER}-${REGION}.pooler.supabase.com:6543/postgres`, ssl: { rejectUnauthorized: false } },
  { connectionString: `postgresql://postgres:${PASSWORD}@db.${REF}.supabase.co:5432/postgres`, ssl: { rejectUnauthorized: false } },
]

const migrationFile = process.argv[2] || "00005_rls_agentes_sedes"
const sql = readFileSync(`supabase/migrations/${migrationFile}.sql`, "utf8")
console.log(`Applying migration: ${migrationFile}.sql\n`)

for (const cfg of configs) {
  try {
    const client = new Client({ ...cfg, connectionTimeoutMillis: 10000 })
    await client.connect()
    console.log("Connected!")
    await client.query(sql)
    console.log("\nMigration applied successfully")
    await client.end()
    process.exit(0)
  } catch (e) {
    const label = cfg.connectionString ? cfg.connectionString.split("@")[1]?.split("?")[0] : `${cfg.host}:${cfg.port}`
    console.log(`Failed: ${label} - ${e.message?.slice(0, 100)}`)
  }
}

console.log("\nAll connections failed. Run this SQL manually in Supabase SQL Editor:")
console.log("```")
console.log(sql)
console.log("```")
process.exit(1)
