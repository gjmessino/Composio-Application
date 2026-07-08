import { readFileSync, writeFileSync } from "fs";

/**
 * composio.tools.getRawComposioTools() returns each tool's params as a JSON-Schema
 * object: { type, properties: { name: {type,description,...} }, required: [names] }.
 * The rest of this pipeline (build-graph.mjs, curate-*.mjs) was written against the
 * flatter shape scraped from docs.composio.dev: { name: {type,description,required} }.
 * This just reshapes SDK output into that flat form so both data sources are
 * interchangeable, without needing "required" to be looked up from a separate array.
 */
function flattenParams(schema) {
  if (!schema?.properties) return {};
  const requiredSet = new Set(schema.required || []);
  const out = {};
  for (const [name, spec] of Object.entries(schema.properties)) {
    out[name] = {
      type: spec.type || (spec.$ref ? "object" : "unknown"),
      description: spec.description || "",
      required: requiredSet.has(name),
      default: spec.default,
      enum: spec.enum,
      items: spec.items,
    };
  }
  return out;
}

function normalize(tool) {
  return {
    slug: tool.slug,
    name: tool.name,
    description: tool.description,
    input_parameters: flattenParams(tool.inputParameters),
    output_parameters: flattenParams(tool.outputParameters),
    scopes: tool.scopes,
    tags: tool.tags,
    is_deprecated: tool.isDeprecated,
  };
}

for (const name of ["github", "googlesuper"]) {
  const raw = JSON.parse(readFileSync(`./raw/${name}_tools_raw.json`, "utf-8"));
  const tools = raw.map(normalize);
  console.log(`${name}: normalized ${tools.length} tools`);
  writeFileSync(`./${name}_tools.json`, JSON.stringify(tools, null, 2), "utf-8");
}
