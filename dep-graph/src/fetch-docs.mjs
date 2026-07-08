import { writeFile } from "fs/promises";

const TOOLKITS = {
  github: "https://docs.composio.dev/toolkits/github",
  googlesuper: "https://docs.composio.dev/toolkits/googlesuper",
};

for (const [name, url] of Object.entries(TOOLKITS)) {
  console.log(`Fetching ${url} ...`);
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const html = await res.text();
  await writeFile(`./docs/${name}_toolkit_page.html`, html, "utf-8");
  console.log(`Wrote docs/${name}_toolkit_page.html (${html.length} bytes)`);
}
