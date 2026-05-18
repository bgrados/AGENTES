const deployments = ["agentesmp.vercel.app", "agentesmp-lliyfeu7v-ben-468d61e5.vercel.app"];

async function checkDeployment(domain) {
  const resp = await fetch("https://" + domain + "/admin/usuarios");
  const html = await resp.text();
  const chunks = [...html.matchAll(/\/_next\/static\/chunks\/([^"']+)\.js/g)].map(m => m[1]);
  console.log(domain + ": " + chunks.length + " chunk refs");
  for (const chunk of chunks.slice(0, 8)) {
    const r = await fetch("https://" + domain + "/_next/static/chunks/" + chunk + ".js");
    const code = await r.text();
    if (code.includes("Trash2") || code.includes("Camera") || code.includes("fotoFile") || code.includes("subiendo")) {
      console.log("  FOUND new code in: " + chunk.substring(0, 40));
    }
  }
}

checkDeployment("agentesmp.vercel.app");
