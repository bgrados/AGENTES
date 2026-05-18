const { createClient } = require("@supabase/supabase-js")

const supabase = createClient(
  "https://aoxyeucljienuilwdxli.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  const { error: bucketErr } = await supabase.storage.createBucket("agent-photos", {
    public: true,
  })
  if (bucketErr) {
    console.log("Bucket create error:", bucketErr.message)
  } else {
    console.log("Bucket 'agent-photos' created successfully")
  }

  const sql = `
    CREATE POLICY IF NOT EXISTS "Public Access" ON storage.objects
      FOR SELECT USING (bucket_id = 'agent-photos');

    CREATE POLICY IF NOT EXISTS "Auth Upload" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'agent-photos' AND auth.role() = 'authenticated');

    CREATE POLICY IF NOT EXISTS "Auth Update" ON storage.objects
      FOR UPDATE USING (bucket_id = 'agent-photos' AND auth.role() = 'authenticated');

    CREATE POLICY IF NOT EXISTS "Auth Delete" ON storage.objects
      FOR DELETE USING (bucket_id = 'agent-photos' AND auth.role() = 'authenticated');
  `

  const { error: sqlErr } = await supabase.rpc("exec_sql", { query: sql })
  if (sqlErr) {
    console.log("SQL error:", sqlErr.message)
    console.log("Run the SQL manually in Supabase SQL Editor (see below)")
    console.log("---")
    console.log(sql)
  }
}

main().catch(console.error)
