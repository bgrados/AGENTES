async function main() {
  console.log("Waiting 20s for Vercel deploy...");
  await new Promise(r => setTimeout(r, 20000));

  // Fetch the login page to get chunk references
  const r = await fetch("https://agentesmp.vercel.app/login?_=" + Date.now());
  const html = await r.text();
  console.log("Cache:", r.headers.get("x-vercel-cache"));

  // Extract all JS chunks
  const chunkMatches = [...html.matchAll(/\/_next\/static\/chunks\/([^"']+)\.js/g)];
  console.log("Found", chunkMatches.length, "chunk refs");

  // Check a few chunks for "VERSION 2"
  let found = false;
  for (const m of chunkMatches.slice(0, 15)) {
    const chunkUrl = "https://agentesmp.vercel.app/_next/static/chunks/" + m[1] + ".js";
    const resp = await fetch(chunkUrl + "?_=" + Date.now());
    const code = await resp.text();
    if (code.includes("VERSION 2")) {
      console.log("FOUND 'VERSION 2' in chunk:", m[1].substring(0, 30));
      found = true;
      break;
    }
  }
  if (!found) {
    console.log("'VERSION 2' NOT found in login page chunks - checking admin page directly");
    // Try fetching the admin page (will get redirect, but the response headers might tell us)
    const adminResp = await fetch("https://agentesmp.vercel.app/admin/usuarios?_=" + Date.now(), { redirect: "manual" });
    console.log("Admin page status:", adminResp.status, "location:", adminResp.headers.get("location"));
    console.log("Cache:", adminResp.headers.get("x-vercel-cache"));
  }
}

main().catch(console.error);
