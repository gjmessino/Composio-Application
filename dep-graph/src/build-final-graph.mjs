import { readFileSync, writeFileSync } from "fs";

const githubTools = JSON.parse(readFileSync("./github_tools.json", "utf-8"));
const googlesuperTools = JSON.parse(readFileSync("./googlesuper_tools.json", "utf-8"));
const mined = JSON.parse(readFileSync("./mined_edges.json", "utf-8"));
const curatedGithub = JSON.parse(readFileSync("./curated_github_edges.json", "utf-8"));
const curatedGooglesuper = JSON.parse(readFileSync("./curated_googlesuper_edges.json", "utf-8"));

function toNode(tool, toolkit) {
  const required = Object.entries(tool.input_parameters || {})
    .filter(([, v]) => v.required)
    .map(([k]) => k);
  const optional = Object.entries(tool.input_parameters || {})
    .filter(([, v]) => !v.required)
    .map(([k]) => k);
  return {
    id: tool.slug,
    toolkit,
    name: tool.name,
    description: tool.description,
    requiredParams: required,
    optionalParams: optional,
  };
}

const nodes = [
  ...githubTools.map((t) => toNode(t, "github")),
  ...googlesuperTools.map((t) => toNode(t, "googlesuper")),
];
const nodeIds = new Set(nodes.map((n) => n.id));

const allEdges = [
  ...mined.github,
  ...mined.googlesuper,
  ...curatedGithub,
  ...curatedGooglesuper,
];

// Sanity check + normalize + dedupe.
const seen = new Set();
const edges = [];
for (const e of allEdges) {
  if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) {
    throw new Error(`Edge references unknown node: ${e.from} -> ${e.to}`);
  }
  const key = `${e.from}|${e.to}|${e.param}|${e.source}`;
  if (seen.has(key)) continue;
  seen.add(key);
  edges.push({
    from: e.from,
    to: e.to,
    param: e.param,
    required: e.required ?? null,
    reason: e.reason,
    confidence: e.confidence,
    source: e.source,
  });
}

const connectedIds = new Set();
edges.forEach((e) => {
  connectedIds.add(e.from);
  connectedIds.add(e.to);
});

const stats = {
  totalNodes: nodes.length,
  githubNodes: githubTools.length,
  googlesuperNodes: googlesuperTools.length,
  totalEdges: edges.length,
  connectedNodes: connectedIds.size,
  bySource: Object.fromEntries(
    Object.entries(
      edges.reduce((acc, e) => {
        acc[e.source] = (acc[e.source] || 0) + 1;
        return acc;
      }, {})
    )
  ),
  byConfidence: Object.fromEntries(
    Object.entries(
      edges.reduce((acc, e) => {
        acc[e.confidence] = (acc[e.confidence] || 0) + 1;
        return acc;
      }, {})
    )
  ),
};

console.log(stats);

writeFileSync(
  "./graph.json",
  JSON.stringify({ nodes, edges, stats }, null, 2),
  "utf-8"
);
console.log("wrote graph.json");
