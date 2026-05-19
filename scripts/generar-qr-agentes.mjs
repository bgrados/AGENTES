import { createClient } from "@supabase/supabase-js"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { createRequire } from "module"

const require = createRequire(import.meta.url)
const QRCode = require("qrcode")

const SUPABASE_URL = "https://aoxyeucljienuilwdxli.supabase.co"
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFveHlldWNsamllbnVpbHdkeGxpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTExMDE5NywiZXhwIjoyMDk0Njg2MTk3fQ.m8Nvzp46h74THRWe11bbB9qrtlf2kV51X7QroorTIxc"

const sb = createClient(SUPABASE_URL, SERVICE_KEY)

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

async function main() {
  console.log("=== GENERADOR DE QR PARA AGENTES ===\n")

  const [{ data: agentes }, { data: asignaciones }] = await Promise.all([
    sb.from("agentes").select("id, codigo, turno_asignado, usuarios!inner(id, nombre, apellido, email)").eq("activo", true).order("codigo"),
    sb.from("agentes_sedes").select("agente_id, tipo, activo, sedes!inner(nombre)").eq("tipo", "principal").eq("activo", true),
  ])

  if (!agentes || agentes.length === 0) {
    console.error("No se encontraron agentes activos")
    process.exit(1)
  }

  const sedeMap = {}
  if (asignaciones) {
    for (const a of asignaciones) {
      sedeMap[a.agente_id] = a.sedes.nombre
    }
  }

  console.log(`Encontrados ${agentes.length} agentes activos\n`)

  const qrDir = "public/qr"
  if (!existsSync(qrDir)) mkdirSync(qrDir, { recursive: true })

  const agentesData = []
  let generados = 0

  for (const agente of agentes) {
    const codigo = agente.codigo
    const nombreCompleto = `${agente.usuarios.nombre} ${agente.usuarios.apellido}`
    const email = agente.usuarios.email
    const sedeNombre = sedeMap[agente.id] || "Sin sede"
    const qrPath = `${qrDir}/${codigo}.png`

    try {
      await QRCode.toFile(qrPath, codigo, {
        type: "png",
        width: 400,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      })
      generados++

      agentesData.push({
        codigo,
        nombre: nombreCompleto,
        email,
        sede: sedeNombre,
        turno: agente.turno_asignado === "dia" ? "Día" : "Noche",
        qrPath: `/qr/${codigo}.png`,
      })

      if (generados % 10 === 0) console.log(`  ... ${generados} QR generados`)
    } catch (err) {
      console.error(`  [ERR] ${codigo}: ${err.message}`)
    }
  }

  const svgParts = []
  for (const a of agentesData) {
    const filePath = `public${a.qrPath}`
    if (!existsSync(filePath)) continue
    const qrBase64 = readFileSync(filePath, { encoding: "base64" })
    svgParts.push(`
    <div style="display:inline-flex;flex-direction:column;align-items:center;border:2px solid #ccc;border-radius:8px;padding:12px;margin:8px;width:220px;page-break-inside:avoid;">
      <img src="data:image/png;base64,${qrBase64}" style="width:180px;height:180px;" alt="${escapeXml(a.codigo)}" />
      <div style="font-size:16px;font-weight:bold;margin-top:8px;text-align:center;">${escapeXml(a.nombre)}</div>
      <div style="font-size:12px;color:#666;text-align:center;">${escapeXml(a.codigo)}</div>
      <div style="font-size:11px;color:#888;text-align:center;">${escapeXml(a.email)}</div>
      <div style="font-size:11px;color:#555;margin-top:4px;text-align:center;">🏢 ${escapeXml(a.sede)} · ${a.turno}</div>
    </div>`)
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>QR Agentes - Seguridad Control</title>
<style>
  @page { margin: 10mm; size: A4 landscape; }
  body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
  h1 { text-align: center; font-size: 20px; margin-bottom: 10px; }
  .grid { display: flex; flex-wrap: wrap; justify-content: center; }
  @media print {
    .no-print { display: none; }
    .grid { justify-content: flex-start; }
  }
</style>
</head>
<body>
  <h1>Seguridad Control — Códigos QR de Agentes</h1>
  <div class="no-print" style="text-align:center;margin-bottom:16px;">
    <button onclick="window.print()" style="padding:10px 30px;font-size:16px;cursor:pointer;">🖨️ Imprimir</button>
  </div>
  <div class="grid">
    ${svgParts.join("\n    ")}
  </div>
</body>
</html>`

  writeFileSync("data/qr-agentes-print.html", html)
  console.log(`\n✅ ${generados} QR generados en public/qr/`)
  console.log("📄 Página imprimible: data/qr-agentes-print.html")
  console.log("   O desde la web: Admin → QR Agentes → Imprimir")
}

main().catch(console.error)
