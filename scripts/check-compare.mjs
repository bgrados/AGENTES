async function getChunkHashes(domain) {
  const r = await fetch("https://" + domain + "/login?_=" + Date.now());
  const html = await r.text();
  const regex = /\/_next\/static\/chunks\/([^"']+)\.js/g;
  const chunks = [...html.matchAll(regex)].map(m => m[1]);
  return chunks.slice(0, 4).join(",");
}

async function main() {
  const prod = await getChunkHashes("agentesmp.vercel.app");
  const preview = await getChunkHashes("agentesmp-630wkypbp-ben-468d61e5.vercel.app");
  console.log("Production:", prod);
  console.log("Preview:   ", preview);
  console.log(prod === preview ? "SAME - production updated" : "DIFFERENT - production NOT updated");
}

main().catch(console.error);
