import "dotenv/config";
import { Composio } from "@composio/core";
import { writeFile } from "fs/promises";

const composio = new Composio();

for (const toolkit of ["googlesuper", "github"]) {
  console.log(`Fetching tools for ${toolkit}...`);
  const tools = await composio.tools.getRawComposioTools({
    toolkits: [toolkit],
    limit: 1000,
  });
  console.log(`${toolkit}: ${tools.length} tools`);
  await writeFile(
    `raw/${toolkit}_tools_raw.json`,
    JSON.stringify(tools, null, 2),
    "utf-8"
  );
}

console.log("Done.");
