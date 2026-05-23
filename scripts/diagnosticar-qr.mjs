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

// 1. Simular la query del QR scan
console.log("=== Simulando QR scan query ===")
const { rows: agentes } = await client.query(`
  SELECT a.id, a.codigo, a.usuario_id, a.sede_principal, u.nombre, u.apellido, u.auth_uid
  FROM agentes a
  JOIN usuarios u ON u.id = a.usuario_id
  WHERE a.codigo = 'AGT-001' AND a.activo = true
`)
console.log("Resultados:", agentes.length)
for (const a of agentes) {
  console.log(`  ${a.codigo} - ${a.nombre} ${a.apellido} - usuario_id:${a.usuario_id?.slice(0,8)} - auth_uid:${a.auth_uid?.slice(0,8)} - sede_principal:${a.sede_principal}`)
}

// 2. RLS en agentes
const { rows: rls } = await client.query(`
  SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'agentes'
`)
console.log(`\n=== RLS en agentes: ${rls[0]?.relrowsecurity ? "HABILITADO" : "DESHABILITADO"} ===`)

// 3. Políticas en agentes
const { rows: policies } = await client.query(`
  SELECT polname, polcmd, polpermissive
  FROM pg_policy
  JOIN pg_class ON pg_policy.polrelid = pg_class.oid
  WHERE relname = 'agentes'
`)
console.log(`Políticas: ${policies.length}`)
for (const p of policies) {
  console.log(`  - ${p.polname} (cmd: ${p.polcmd})`)
}

// 4. Verificar que el middleware server supabase client works
// El middleware usa createServerClient con las cookies
// Verifiquemos que el usuario con auth_uid existe
console.log("\n=== Usuario de prueba ===")
const { rows: users } = await client.query(`
  SELECT u.id, u.auth_uid, u.nombre, u.apellido, u.email, r.nombre as rol
  FROM usuarios u
  JOIN roles r ON r.id = u.rol_id
  WHERE u.email LIKE '%prueba%' OR u.email LIKE '%test%' OR u.codigo = 'AGT-001'
`)
for (const u of users) {
  console.log(`  ${u.nombre} ${u.apellido} - email:${u.email} - rol:${u.rol} - auth_uid:${u.auth_uid?.slice(0,8)}`)
}

// 5. Verificar session del agente prueba
console.log("\n=== Auth users ===")
const { rows: auth } = await client.query(`
  SELECT id, email, raw_user_meta_data
  FROM auth.users
  WHERE email LIKE '%prueba%' OR email LIKE '%test%' OR email LIKE '%agente%'
  LIMIT 5
`)
for (const a of auth) {
  console.log(`  ${a.id?.slice(0,8)} - ${a.email} - ${JSON.stringify(a.raw_user_meta_data)}`)
}

await client.end()
