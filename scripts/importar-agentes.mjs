import { createRequire } from "module"
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs"
import { randomBytes } from "crypto"
import dns from "dns"

dns.setServers(["8.8.8.8", "8.8.4.4"])

const require = createRequire(import.meta.url)
const { createClient } = require("@supabase/supabase-js")

const SUPABASE_URL = "https://aoxyeucljienuilwdxli.supabase.co"
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveHlldWNsamllbnVpbHdkeGxpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTExMDE5NywiZXhwIjoyMDk0Njg2MTk3fQ.m8Nvzp46h74THRWe11bbB9qrtlf2kV51X7QroorTIxc"

const sb = createClient(SUPABASE_URL, SERVICE_KEY)

function normalize(s) {
  return s.toLowerCase()
    .trim()
    .replace(/ñ/g, "n")
    .replace(/[áäà]/g, "a")
    .replace(/[éëè]/g, "e")
    .replace(/[íïì]/g, "i")
    .replace(/[óöò]/g, "o")
    .replace(/[úüù]/g, "u")
    .replace(/[^a-z0-9.]/g, "")
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  let pwd = "Seg"
  for (let i = 0; i < 7; i++) pwd += chars[randomBytes(1)[0] % chars.length]
  return pwd + "!"
}

function getFirstName(nombres) {
  return nombres.split(" ")[0]
}

function parseCsv(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(",").map(h => h.trim())
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",").map(v => v.trim())
    const row = {}
    headers.forEach((h, idx) => { row[h] = vals[idx] ?? "" })
    rows.push(row)
  }
  return rows
}

async function main() {
  console.log("=== IMPORTADOR DE AGENTES ===\n")

  const csv = readFileSync("data/agentes.csv", "utf-8")
  const agentes = parseCsv(csv)
  console.log(`Leídos ${agentes.length} agentes del CSV\n`)

  const { data: empresas } = await sb.from("empresas").select("id").limit(1)
  if (!empresas?.[0]) { console.error("No hay empresas"); process.exit(1) }
  const empresaId = empresas[0].id

  const { data: roles } = await sb.from("roles").select("id, nombre")
  const rolAgente = roles?.find(r => r.nombre === "agente")
  if (!rolAgente) { console.error("Rol agente no encontrado"); process.exit(1) }
  console.log(`Empresa: ${empresaId} | Rol agente: ${rolAgente.id}\n`)

  const { data: existingUsuarios } = await sb.from("usuarios").select("email, dni")
  const existingEmails = new Set(existingUsuarios?.map(u => u.email) || [])
  const existingDnis = new Set(existingUsuarios?.map(u => u.dni) || [])

  const qrDir = "public/qr"
  if (!existsSync(qrDir)) mkdirSync(qrDir, { recursive: true })

  const results = []
  let created = 0, skipped = 0, errors = 0

  for (const ag of agentes) {
    const idNum = String(ag.id).padStart(3, "0")
    const codigo = `AGT-${idNum}`
    const nombre = ag.nombres
    const apellido = `${ag.apellido_paterno} ${ag.apellido_materno}`.trim()
    const dni = ag.dni.padStart(8, "0")
    const firstName = getFirstName(nombre)
    const emailBase = normalize(`${firstName}.${ag.apellido_paterno}`)
    let email = `${emailBase}@seguridad.com`
    let emailCounter = 2
    while (existingEmails.has(email)) {
      email = `${emailBase}${emailCounter}@seguridad.com`
      emailCounter++
    }

    if (existingDnis.has(dni)) {
      console.log(`  [SKIP] ${codigo} ${nombre} ${apellido} - DNI ${dni} ya existe`)
      skipped++
      continue
    }

    const password = generatePassword()
    const qrCode = randomBytes(16).toString("hex")

    try {
      const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SERVICE_KEY,
          "Authorization": `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: `${nombre} ${apellido}` },
        }),
      })
      if (!authRes.ok) {
        const errBody = await authRes.text()
        if (errBody.includes("already exists") || errBody.includes("duplicate")) {
          console.log(`  [SKIP] ${codigo} - Email ${email} ya existe en Auth`)
          skipped++
          continue
        }
        throw new Error(`HTTP ${authRes.status}: ${errBody}`)
      }
      const authUser = await authRes.json()
      const authUid = authUser.id

      const { error: usuarioErr } = await sb.from("usuarios").insert({
        auth_uid: authUid,
        empresa_id: empresaId,
        rol_id: rolAgente.id,
        codigo,
        nombre,
        apellido,
        email,
        dni,
        telefono: "",
        activo: true,
      })
      if (usuarioErr) throw usuarioErr

      const { data: usuarioData } = await sb.from("usuarios").select("id").eq("auth_uid", authUid).maybeSingle()
      if (!usuarioData) throw new Error("Usuario no encontrado después de crear")

      const { error: agenteErr } = await sb.from("agentes").insert({
        usuario_id: usuarioData.id,
        codigo,
        turno_asignado: "dia",
        fecha_ingreso: new Date().toISOString().split("T")[0],
        activo: true,
        qr_code: qrCode,
        qr_activo: true,
      })
      if (agenteErr) throw agenteErr

      try {
        const qrResp = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}&format=png`)
        if (qrResp.ok) {
          const buffer = Buffer.from(await qrResp.arrayBuffer())
          writeFileSync(`${qrDir}/${codigo}.png`, buffer)
        }
      } catch (qrErr) {
        console.log(`  [WARN] ${codigo} - QR no descargado`)
      }

      existingEmails.add(email)
      existingDnis.add(dni)
      results.push({ id: idNum, codigo, email, password, nombre: `${nombre} ${apellido}`, dni })
      created++

      if (created % 10 === 0 || created === 1) console.log(`  ... ${created} creados`)

    } catch (err) {
      console.log(`  [ERR] ${codigo} ${nombre}: ${err.message?.slice(0, 100)}`)
      errors++
    }
  }

  console.log("\n=== RESUMEN ===")
  console.log(`Creados: ${created} | Saltados: ${skipped} | Errores: ${errors}\n`)

  if (results.length > 0) {
    console.log("Código".padEnd(10), "Email".padEnd(40), "Password".padEnd(16), "Agente".padEnd(35), "DNI")
    console.log("-".repeat(115))
    for (const r of results) {
      const name = r.nombre.length > 34 ? r.nombre.slice(0, 31) + "..." : r.nombre
      console.log(r.codigo.padEnd(10), r.email.padEnd(40), r.password.padEnd(16), name.padEnd(35), r.dni)
    }

    const csvOut = "codigo,email,password,nombre,dni\n" + results.map(r => `${r.codigo},${r.email},${r.password},"${r.nombre}",${r.dni}`).join("\n")
    writeFileSync("data/importacion-resultado.csv", csvOut)
    console.log(`\nResumen guardado en data/importacion-resultado.csv`)
  }

  process.exit(errors > 0 ? 1 : 0)
}

main()
