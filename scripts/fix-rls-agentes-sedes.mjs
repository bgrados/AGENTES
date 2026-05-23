import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  host: "aws-0-us-east-1.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  user: "postgres.aoxyeucljienuilwdxli",
  password: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveHlldWNsamllbnVpbHdkeGxpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTExMDE5NywiZXhwIjoyMDk0Njg2MTk3fQ.m8Nvzp46h74THRWe11bbB9qrtlf2kV51X7QroorTIxc",
  ssl: { rejectUnauthorized: false },
});

const sql = `
DROP POLICY IF EXISTS "agentes_view_own" ON agentes_sedes;
DROP POLICY IF EXISTS "admin_all_agentes_sedes" ON agentes_sedes;

CREATE POLICY "admin_all_agentes_sedes" ON agentes_sedes
  FOR ALL TO authenticated
  USING (es_admin()) WITH CHECK (es_admin());

CREATE POLICY "agentes_view_own" ON agentes_sedes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agentes a
      JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.id = agentes_sedes.agente_id AND u.auth_uid = auth.uid()
    )
  );
`;

async function run() {
  try {
    const result = await pool.query(sql);
    console.log("Migration executed successfully:", result);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

run();
