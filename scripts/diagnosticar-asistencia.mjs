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

// 1. Check RLS on asistencia
const { rows: rls } = await client.query(`
  SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'asistencia'
`)
console.log("=== RLS en asistencia ===")
console.log(rls[0]?.relrowsecurity ? "HABILITADO" : "DESHABILITADO")

// 2. Check policies
const { rows: policies } = await client.query(`
  SELECT polname, polpermissive, polroles, polqual, polwithcheck
  FROM pg_policy
  JOIN pg_class ON pg_policy.polrelid = pg_class.oid
  WHERE relname = 'asistencia'
`)
console.log(`\n=== Políticas en asistencia: ${policies.length} ===`)
for (const p of policies) {
  console.log(`  - ${p.polname}: permissive=${p.polpermissive}, roles=${p.polroles}`)
}

// 3. Check asistencia data from today
const { rows: asistencias } = await client.query(`
  SELECT a.id, a.tipo, a.fecha_hora::date as fecha, a.created_at::date as created,
         ag.codigo, u.nombre, u.apellido, s.nombre as sede
  FROM asistencia a
  JOIN agentes ag ON ag.id = a.agente_id
  JOIN usuarios u ON u.id = ag.usuario_id
  JOIN sedes s ON s.id = a.sede_id
  WHERE a.fecha_hora >= CURRENT_DATE - INTERVAL '2 days'
  ORDER BY a.fecha_hora DESC
`)
console.log(`\n=== Asistencias últimas 48h: ${asistencias.length} ===`)
for (const a of asistencias) {
  console.log(`  ${a.nombre} ${a.apellido} (${a.codigo}) - ${a.tipo} - ${a.sede} - ${a.fecha}`)
}

// 4. Check current_agente_id function
const { rows: funcExists } = await client.query(`
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'current_agente_id'
  ) as exists
`)
console.log(`\n=== Función current_agente_id existe: ${funcExists[0]?.exists}`)

// 5. Check es_admin function
const { rows: esAdminExists } = await client.query(`
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'es_admin'
  ) as exists
`)
console.log(`Función es_admin existe: ${esAdminExists[0]?.exists}`)

// 6. Check agentes and their usuario relation
const { rows: agentesTest } = await client.query(`
  SELECT a.id as agente_id, a.codigo, u.id as usuario_id, u.auth_uid, u.nombre, u.apellido,
         r.nombre as rol
  FROM agentes a
  JOIN usuarios u ON u.id = a.usuario_id
  JOIN roles r ON r.id = u.rol_id
  WHERE a.codigo LIKE 'AGT%' OR a.codigo LIKE 'JEF%'
  ORDER BY a.codigo
  LIMIT 10
`)
console.log(`\n=== Primeros 10 agentes ===`)
for (const a of agentesTest) {
  console.log(`  ${a.codigo} - ${a.nombre} ${a.apellido} - rol:${a.rol} - usuario_id:${a.usuario_id?.slice(0,8)} - auth_uid:${a.auth_uid?.slice(0,8)}`)
}

await client.end()
