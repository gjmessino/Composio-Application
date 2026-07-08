import { readFileSync, writeFileSync } from "fs";

const tools = JSON.parse(readFileSync("./googlesuper_tools.json", "utf-8"));
const slugSet = new Set(tools.map((t) => t.slug));
function assertExists(slug) {
  if (!slugSet.has(slug)) throw new Error(`missing slug ${slug}`);
  return slug;
}

const GET_CONTACTS = assertExists("GOOGLESUPER_GET_CONTACTS");

// Composio's own docs describe these params purely as "an email address" - they do NOT
// say what to do if the user only supplies a person's name. This is the readme's second
// example pattern: resolve a name to a canonical identifier (here, an email) before calling.
const EMAIL_PARAMS = [
  "recipient_email",
  "extra_recipients",
  "recipients",
  "from_email",
  "attendee_email",
  "email_address",
  "email",
  "emails",
  "cc",
  "bcc",
];

const edges = [];
for (const tool of tools) {
  if (tool.slug === GET_CONTACTS) continue;
  for (const [param, spec] of Object.entries(tool.input_parameters || {})) {
    if (!EMAIL_PARAMS.includes(param)) continue;
    edges.push({
      from: GET_CONTACTS,
      to: tool.slug,
      param,
      required: !!spec.required,
      reason:
        "if the user supplies a contact's name rather than an email address, resolve it to an email via a contacts lookup first",
      confidence: "medium",
      source: "semantic_resolution",
    });
  }
}

console.log("Google Super semantic-resolution edges:", edges.length);
writeFileSync("./curated_googlesuper_edges.json", JSON.stringify(edges, null, 2), "utf-8");
