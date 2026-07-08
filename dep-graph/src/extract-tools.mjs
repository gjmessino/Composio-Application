import { readFileSync, writeFileSync } from "fs";

/**
 * Composio's docs pages (https://docs.composio.dev/toolkits/<slug>) are server-rendered
 * with the full tool catalog embedded as JSON inside the page's RSC payload, publicly
 * and without needing an API key. The page embeds the tool array twice: once as a
 * lightweight {slug,name,description} summary (used for the tool grid), and again later
 * with the full {input_parameters, output_parameters, scopes, ...} schema (used for the
 * per-tool reference section). We want the second, richer occurrence.
 */
export function extractTools(html) {
  let marker = '"toolCount":';
  let idx = html.indexOf(marker);
  let escapedMode = false;
  if (idx === -1) {
    marker = '\\"toolCount\\":';
    idx = html.indexOf(marker);
    escapedMode = true;
  }
  if (idx === -1) throw new Error("toolCount marker not found in HTML");

  const toolsKey = escapedMode ? '\\"tools\\":[' : '"tools":[';
  const toolsIdx = html.lastIndexOf(toolsKey);
  if (toolsIdx === -1) throw new Error("tools array not found in HTML");

  const start = toolsIdx + toolsKey.length - 1; // position of '['
  const QUOTE = escapedMode ? '\\"' : '"';
  const ESC_BACKSLASH = escapedMode ? "\\\\" : "\\";

  let depth = 0;
  let i = start;
  let inString = false;
  for (; i < html.length; ) {
    if (inString) {
      if (html.startsWith(ESC_BACKSLASH, i)) {
        i += ESC_BACKSLASH.length;
        continue;
      }
      if (html.startsWith(QUOTE, i)) {
        inString = false;
        i += QUOTE.length;
        continue;
      }
      i += 1;
      continue;
    }
    if (html.startsWith(QUOTE, i)) {
      inString = true;
      i += QUOTE.length;
      continue;
    }
    const ch = html[i];
    if (ch === "[") depth++;
    if (ch === "]") {
      depth--;
      if (depth === 0) {
        i += 1;
        break;
      }
    }
    i += 1;
  }

  const arrayRaw = html.slice(start, i);
  const jsonText = escapedMode ? JSON.parse('"' + arrayRaw + '"') : arrayRaw;
  return JSON.parse(jsonText);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const name of ["github", "googlesuper"]) {
    const html = readFileSync(`./docs/${name}_toolkit_page.html`, "utf-8");
    const tools = extractTools(html);
    console.log(`${name}: extracted ${tools.length} tools`);
    writeFileSync(`./${name}_tools.json`, JSON.stringify(tools, null, 2), "utf-8");
  }
}
