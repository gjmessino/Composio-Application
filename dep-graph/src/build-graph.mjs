import { readFileSync, writeFileSync } from "fs";

const TOKEN_RE = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+){1,}\b/g;

// Legacy Composio toolkit prefixes that got folded into "googlesuper".
// Descriptions still reference tools by their pre-merge names, e.g. GMAIL_LIST_THREADS.
const LEGACY_PREFIXES = [
  "GOOGLE_ANALYTICS_",
  "GOOGLEANALYTICS_",
  "GOOGLESHEETS_",
  "GOOGLESHEET_",
  "GOOGLEDRIVE_",
  "GOOGLEDOCS_",
  "GOOGLECALENDAR_",
  "GOOGLETASKS_",
  "GOOGLESLIDES_",
  "GOOGLEPHOTOS_",
  "GOOGLEADS_",
  "GOOGLEMAPS_",
  "GOOGLEPEOPLE_",
  "GMAIL_",
];

function loadTools(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function buildSlugSet(tools) {
  return new Set(tools.map((t) => t.slug));
}

/** Resolve a candidate uppercase token found in free text to a real tool slug, if possible. */
function resolveReference(token, slugSet, toolkitPrefix) {
  if (slugSet.has(token)) return token;
  if (toolkitPrefix === "GOOGLESUPER") {
    for (const prefix of LEGACY_PREFIXES) {
      if (token.startsWith(prefix)) {
        const suffix = token.slice(prefix.length);
        const candidate = `GOOGLESUPER_${suffix}`;
        if (slugSet.has(candidate)) return candidate;
      }
    }
  }
  return null;
}

function extractTokens(text) {
  if (!text) return [];
  const out = [];
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(text))) out.push(m[0]);
  return out;
}

function buildEdgesForToolkit(tools, toolkitPrefix) {
  const slugSet = buildSlugSet(tools);
  const edges = [];
  const unresolvedRefs = new Set();

  for (const tool of tools) {
    // 1) Explicit references mined from the tool description itself.
    for (const token of extractTokens(tool.description)) {
      if (token === tool.slug) continue;
      const resolved = resolveReference(token, slugSet, toolkitPrefix);
      if (resolved && resolved !== tool.slug) {
        edges.push({
          from: resolved,
          to: tool.slug,
          param: null,
          reason: "mentioned as related/alternative in tool description",
          confidence: "medium",
          source: "description",
        });
      } else if (!resolved && /_/.test(token)) {
        unresolvedRefs.add(token);
      }
    }

    // 2) Explicit references mined from each required input parameter's description
    //    e.g. "Obtain from GMAIL_LIST_THREADS or GMAIL_FETCH_EMAILS."
    for (const [paramName, paramSpec] of Object.entries(tool.input_parameters || {})) {
      for (const token of extractTokens(paramSpec.description)) {
        if (token === tool.slug) continue;
        const resolved = resolveReference(token, slugSet, toolkitPrefix);
        if (resolved && resolved !== tool.slug) {
          edges.push({
            from: resolved,
            to: tool.slug,
            param: paramName,
            required: !!paramSpec.required,
            reason: `param "${paramName}" description references this tool as the source of the value`,
            confidence: "high",
            source: "param_description",
          });
        }
      }
    }
  }

  // de-duplicate identical edges (same from/to/param/source)
  const seen = new Set();
  const deduped = [];
  for (const e of edges) {
    const key = `${e.from}|${e.to}|${e.param}|${e.source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(e);
  }

  return { edges: deduped, unresolvedRefs: [...unresolvedRefs] };
}

const githubTools = loadTools("./github_tools.json");
const googlesuperTools = loadTools("./googlesuper_tools.json");

const githubResult = buildEdgesForToolkit(githubTools, "GITHUB");
const googlesuperResult = buildEdgesForToolkit(googlesuperTools, "GOOGLESUPER");

console.log("GitHub: mined edges =", githubResult.edges.length);
console.log("Google Super: mined edges =", googlesuperResult.edges.length);

writeFileSync(
  "./mined_edges.json",
  JSON.stringify(
    { github: githubResult.edges, googlesuper: googlesuperResult.edges },
    null,
    2
  ),
  "utf-8"
);

writeFileSync(
  "./unresolved_refs.json",
  JSON.stringify(
    {
      github: githubResult.unresolvedRefs.sort(),
      googlesuper: googlesuperResult.unresolvedRefs.sort(),
    },
    null,
    2
  ),
  "utf-8"
);

console.log("wrote mined_edges.json and unresolved_refs.json");
