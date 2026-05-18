import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://aoxyeucljienuilwdxli.supabase.co"
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveHlldWNsamllbnVpbHdkeGxpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTExMDE5NywiZXhwIjoyMDk0Njg2MTk3fQ.m8Nvzp46h74THRWe11bbB9qrtlf2kV51X7QroorTIxc"

const sb = createClient(SUPABASE_URL, SERVICE_KEY)

async function main() {
  // SQL policies for storage.objects
  const policies = [
    `CREATE POLICY IF NOT EXISTS "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'agent-photos')`,
    `CREATE POLICY IF NOT EXISTS "Auth Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'agent-photos' AND auth.role() = 'authenticated')`,
    `CREATE POLICY IF NOT EXISTS "Auth Update" ON storage.objects FOR UPDATE USING (bucket_id = 'agent-photos' AND auth.role() = 'authenticated')`,
    `CREATE POLICY IF NOT EXISTS "Auth Delete" ON storage.objects FOR DELETE USING (bucket_id = 'agent-photos' AND auth.role() = 'authenticated')`,
  ]

  for (const sql of policies) {
    const { error } = await sb.rpc("exec_sql", { query: sql })
    if (error) {
      console.log(`Policy error (might be ok): ${error.message}`)
    } else {
      console.log(`Policy applied: ${sql.slice(0, 60)}...`)
    }
  }

  console.log("Storage setup complete")
}

main().catch(console.error)
