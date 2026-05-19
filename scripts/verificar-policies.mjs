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

// Check policies on agentes_sedes
const policies = await client.query(`
  SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
  FROM pg_policies
  WHERE tablename = 'agentes_sedes'
  ORDER BY policyname
`)
console.log("=== Policies on agentes_sedes ===")
console.log(JSON.stringify(policies.rows, null, 2))

// Check if RLS is enabled
const rls = await client.query(`
  SELECT relname, relrowsecurity
  FROM pg_class
  WHERE relname = 'agentes_sedes'
`)
console.log("\n=== RLS status ===")
console.log(JSON.stringify(rls.rows, null, 2))

await client.end()
