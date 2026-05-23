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

// 1. Fix turno_asignado to "noche" for ALL agents (user confirmed all current agents are night shift)
const { rowCount: turnosActualizados } = await client.query(`
  UPDATE agentes SET turno_asignado = 'noche' WHERE turno_asignado != 'noche' OR turno_asignado IS NULL
`)
console.log(`✓ Agentes actualizados a turno noche: ${turnosActualizados}`)

// 2. Fix usuarios.rol_id -> jefe_grupo for agents with es_jefe_grupo = true in agentes_sedes
const { rows: jefes } = await client.query(`
  SELECT DISTINCT a.usuario_id
  FROM agentes_sedes ags
  JOIN agentes a ON a.id = ags.agente_id
  WHERE ags.es_jefe_grupo = true AND ags.activo = true
`)
console.log(`Jefes de grupo encontrados: ${jefes.length}`)

if (jefes.length > 0) {
  const userIds = jefes.map(r => `'${r.usuario_id}'`).join(",")
  const { rowCount: rolesActualizados } = await client.query(`
    UPDATE usuarios u
    SET rol_id = (SELECT id FROM roles WHERE nombre = 'jefe_grupo' LIMIT 1)
    WHERE u.id IN (${userIds})
      AND u.rol_id != (SELECT id FROM roles WHERE nombre = 'jefe_grupo' LIMIT 1)
  `)
  console.log(`✓ Usuarios actualizados a rol jefe_grupo: ${rolesActualizados}`)
} else {
  console.log("⚠ No se encontraron jefes de grupo para actualizar")
}

// Verify
const { rows: resultado } = await client.query(`
  SELECT u.nombre, u.apellido, r.nombre as rol, a.turno_asignado
  FROM usuarios u
  JOIN roles r ON r.id = u.rol_id
  LEFT JOIN agentes a ON a.usuario_id = u.id
  WHERE r.nombre = 'jefe_grupo' OR a.id IS NOT NULL
  ORDER BY u.apellido
`)
console.log("\n=== VERIFICACIÓN ===")
for (const row of resultado) {
  console.log(`${row.nombre} ${row.apellido} - Rol: ${row.rol} - Turno: ${row.turno_asignado || "—"}`)
}

await client.end()
