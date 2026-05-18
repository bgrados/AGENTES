async function getChunks(domain) {
  const r = await fetch("https://" + domain + "/login");
  const html = await r.text();
  const matches = [...html.matchAll(/\/_next\/static\/chunks\/([^"']+)\.js/g)];
  return matches.slice(0, 5).map(m => m[1]);
}

async function main() {
  const prod = await getChunks("agentesmp.vercel.app");
  const preview = await getChunks("agentesmp-lliyfeu7v-ben-468d61e5.vercel.app");
  console.log("PRODUCTION chunks:", prod.join(", "));
  console.log("PREVIEW chunks:   ", preview.join(", "));
  const same = prod.every((v, i) => v === preview[i]);
  console.log("Same build:", same ? "YES" : "NO - different builds!");
}

main().catch(console.error);
