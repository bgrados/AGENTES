import { createRequire } from "module"
import { readFileSync } from "fs"
import dns from "dns"

dns.setServers(["8.8.8.8", "8.8.4.4"])

const require = createRequire(import.meta.url)
const { Client } = require("pg")

const PASSWORD = "650gW4w7joCGN8VRH9Ii"
const REF = "aoxyeucljienuilwdxli"
const REGION = "sa-east-1"

const configs = [
  // Standard pooler with project ref in username
  { connectionString: `postgresql://postgres.${REF}:${PASSWORD}@aws-0-${REGION}.pooler.supabase.com:5432/postgres`, ssl: { rejectUnauthorized: false } },
  { connectionString: `postgresql://postgres.${REF}:${PASSWORD}@aws-0-${REGION}.pooler.supabase.com:6543/postgres`, ssl: { rejectUnauthorized: false } },
  // Pooler with pgbouncer flag
  { connectionString: `postgresql://postgres.${REF}:${PASSWORD}@aws-0-${REGION}.pooler.supabase.com:5432/postgres?pgbouncer=true`, ssl: { rejectUnauthorized: false } },
  // Pooler via IP with SNI
  { host: "52.67.1.88", port: 5432, database: "postgres", user: `postgres.${REF}`, password: PASSWORD, ssl: { rejectUnauthorized: false, servername: `aws-0-${REGION}.pooler.supabase.com` } },
  { host: "52.67.1.88", port: 6543, database: "postgres", user: `postgres.${REF}`, password: PASSWORD, ssl: { rejectUnauthorized: false, servername: `aws-0-${REGION}.pooler.supabase.com` } },
  // Direct DB via IPv6 hostname
  { connectionString: `postgresql://postgres:${PASSWORD}@db.${REF}.supabase.co:5432/postgres`, ssl: { rejectUnauthorized: false } },
]

for (const cfg of configs) {
  try {
    const client = new Client({ ...cfg, connectionTimeoutMillis: 10000 })
    await client.connect()
    console.log("Connected!")
    const sql = readFileSync("supabase/migrations/00002_qr_agentes.sql", "utf8")
    await client.query(sql)
    console.log("Migration applied successfully")
    await client.end()
    process.exit(0)
  } catch (e) {
    const label = cfg.connectionString ? cfg.connectionString.split("@")[1]?.split("?")[0] : `${cfg.host}:${cfg.port}`
    const msg = e.message?.slice(0, 100)
    if (!msg.includes("tenant") && !msg.includes("ENOTFOUND") && !msg.includes("ENETUNREACH")) {
      console.log(`Interesting error for ${label}:`, msg)
    }
  }
}

console.log("All direct connections failed. Trying via supabase-js REST workaround...")

// Workaround: use supabase-js to call the auth API
const { createClient } = require("@supabase/supabase-js")
const sb = createClient(`https://${REF}.supabase.co`,
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveHlldWNsamllbnVpbHdkeGxpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTExMDE5NywiZXhwIjoyMDk0Njg2MTk3fQ.m8Nvzp46h74THRWe11bbB9qrtlf2kV51X7QroorTIxc"
)

// Query the pg_catalog to see if columns exist
const { data: cols, error: colErr } = await sb.from("agentes").select("id").limit(1)
console.log("Can query agentes:", colErr ? colErr.message : "OK")

console.error("\nCannot connect to database directly. Run the SQL manually in Supabase SQL Editor:")
console.error("```sql")
console.error(readFileSync("supabase/migrations/00002_qr_agentes.sql", "utf8"))
console.error("```")
process.exit(1)
