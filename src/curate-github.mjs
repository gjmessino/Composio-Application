import { readFileSync, writeFileSync } from "fs";

const tools = JSON.parse(readFileSync("./github_tools.json", "utf-8"));
const slugSet = new Set(tools.map((t) => t.slug));

function assertExists(slug) {
  if (!slugSet.has(slug)) {
    throw new Error(`Producer slug does not exist in github_tools.json: ${slug}`);
  }
  return slug;
}

const ORG_HINT = /(ORGANIZATION|_ORG_|_ORG$)/;

// Each rule: which input parameter name triggers it, a function that picks producer
// slug(s) given the consumer's own slug (so org-scoped vs repo-scoped variants of the
// same parameter name resolve to the right list/search/get tool), a human-readable
// reason, and a confidence level.

const RULES = [
  {
    param: "branch",
    producers: () => [assertExists("GITHUB_LIST_BRANCHES")],
    reason: "branch must already exist in the repository; list branches to get a valid name",
    confidence: "high",
  },
  {
    param: "base",
    producers: () => [assertExists("GITHUB_LIST_BRANCHES")],
    reason: "base ref for a compare/PR must be an existing branch name",
    confidence: "medium",
  },
  {
    param: "head",
    producers: () => [assertExists("GITHUB_LIST_BRANCHES")],
    reason: "head ref for a compare/PR must be an existing branch name",
    confidence: "medium",
  },
  {
    param: "org",
    producers: () => [assertExists("GITHUB_LIST_ORGANIZATIONS_FOR_THE_AUTHENTICATED_USER")],
    reason: "org login must be selected from the orgs the authenticated user belongs to",
    confidence: "medium",
  },
  {
    param: "username",
    producers: () => [
      assertExists("GITHUB_SEARCH_USERS"),
      assertExists("GITHUB_GET_THE_AUTHENTICATED_USER"),
    ],
    reason: "resolve a display name/'me' to a concrete GitHub login before use",
    confidence: "medium",
  },
  {
    param: "secret_name",
    producers: (slug) => {
      if (ORG_HINT.test(slug)) return [assertExists("GITHUB_LIST_ORGANIZATION_SECRETS")];
      if (slug.includes("ENVIRONMENT")) return [assertExists("GITHUB_LIST_ENVIRONMENT_SECRETS")];
      if (slug.includes("AUTHENTICATED_USER")) return [assertExists("GITHUB_LIST_SECRETS_FOR_THE_AUTHENTICATED_USER")];
      return [assertExists("GITHUB_LIST_REPOSITORY_SECRETS")];
    },
    reason: "secret name must match an existing secret in the same scope (repo/org/env)",
    confidence: "high",
  },
  {
    param: "team_slug",
    producers: () => [assertExists("GITHUB_LIST_TEAMS")],
    reason: "team_slug must be one of the org's existing teams",
    confidence: "high",
  },
  {
    param: "ref",
    producers: () => [
      assertExists("GITHUB_LIST_MATCHING_REFERENCES"),
      assertExists("GITHUB_LIST_BRANCHES"),
      assertExists("GITHUB_LIST_REPOSITORY_TAGS"),
    ],
    reason: "a git ref can be resolved from branches, tags, or a reference search",
    confidence: "medium",
  },
  {
    param: "pull_number",
    producers: () => [assertExists("GITHUB_LIST_PULL_REQUESTS")],
    reason: "pull_number must reference an existing PR in the repo",
    confidence: "high",
  },
  {
    param: "issue_number",
    producers: () => [assertExists("GITHUB_LIST_REPOSITORY_ISSUES")],
    reason: "issue_number must reference an existing issue in the repo",
    confidence: "high",
  },
  {
    param: "milestone_number",
    producers: () => [assertExists("GITHUB_LIST_MILESTONES")],
    reason: "milestone_number must reference an existing milestone",
    confidence: "high",
  },
  {
    param: "environment_name",
    producers: () => [assertExists("GITHUB_LIST_ENVIRONMENTS")],
    reason: "environment_name must match an existing deployment environment",
    confidence: "high",
  },
  {
    param: "package_type",
    producers: (slug) => {
      if (ORG_HINT.test(slug)) return [assertExists("GITHUB_LIST_PACKAGES_FOR_AN_ORGANIZATION")];
      if (slug.includes("AUTHENTICATED_USER")) return [assertExists("GITHUB_LIST_PACKAGES_FOR_THE_AUTHENTICATED_USER")];
      return [assertExists("GITHUB_LIST_PACKAGES_FOR_A_USER")];
    },
    reason: "package_type/package_name pair must match an existing package",
    confidence: "high",
  },
  {
    param: "package_name",
    producers: (slug) => {
      if (ORG_HINT.test(slug)) return [assertExists("GITHUB_LIST_PACKAGES_FOR_AN_ORGANIZATION")];
      if (slug.includes("AUTHENTICATED_USER")) return [assertExists("GITHUB_LIST_PACKAGES_FOR_THE_AUTHENTICATED_USER")];
      return [assertExists("GITHUB_LIST_PACKAGES_FOR_A_USER")];
    },
    reason: "package_type/package_name pair must match an existing package",
    confidence: "high",
  },
  {
    param: "package_version_id",
    producers: (slug) => {
      if (ORG_HINT.test(slug)) return [assertExists("GITHUB_LIST_ORG_PACKAGE_VERSIONS")];
      return [assertExists("GITHUB_LIST_OWNED_PACKAGE_VERSIONS")];
    },
    reason: "package_version_id must reference an existing version of the package",
    confidence: "high",
  },
  {
    param: "comment_id",
    producers: (slug) => {
      if (slug.includes("ISSUE")) return [assertExists("GITHUB_LIST_ISSUE_COMMENTS")];
      if (slug.includes("COMMIT")) return [assertExists("GITHUB_LIST_COMMIT_COMMENTS")];
      if (slug.includes("PULL_REQUEST") || slug.includes("REVIEW")) return [assertExists("GITHUB_LIST_REVIEW_COMMENTS_ON_A_PULL_REQUEST")];
      if (slug.includes("GIST")) return [assertExists("GITHUB_LIST_GIST_COMMENTS")];
      if (slug.includes("DISCUSSION")) return [assertExists("GITHUB_LIST_DISCUSSION_COMMENTS")];
      return [];
    },
    reason: "comment_id must reference an existing comment on the same parent object",
    confidence: "high",
  },
  {
    param: "run_id",
    producers: () => [assertExists("GITHUB_LIST_WORKFLOW_RUNS_FOR_A_REPOSITORY")],
    reason: "run_id must reference an existing workflow run",
    confidence: "high",
  },
  {
    param: "workflow_id",
    producers: () => [assertExists("GITHUB_LIST_REPOSITORY_WORKFLOWS")],
    reason: "workflow_id must reference an existing workflow file/definition",
    confidence: "high",
  },
  {
    param: "hook_id",
    producers: (slug) => [
      ORG_HINT.test(slug)
        ? assertExists("GITHUB_LIST_ORGANIZATION_WEBHOOKS")
        : assertExists("GITHUB_LIST_REPOSITORY_WEBHOOKS"),
    ],
    reason: "hook_id must reference an existing webhook in the same scope (repo/org)",
    confidence: "high",
  },
  {
    param: "repository_id",
    producers: () => [
      assertExists("GITHUB_SEARCH_REPOSITORIES"),
      assertExists("GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER"),
    ],
    reason: "numeric repository_id is obtained from a repo lookup/search, not typed by hand",
    confidence: "medium",
  },
  {
    param: "gist_id",
    producers: () => [
      assertExists("GITHUB_LIST_GISTS_FOR_THE_AUTHENTICATED_USER"),
      assertExists("GITHUB_LIST_PUBLIC_GISTS"),
    ],
    reason: "gist_id must reference an existing gist",
    confidence: "high",
  },
  {
    param: "runner_id",
    producers: (slug) => [
      ORG_HINT.test(slug)
        ? assertExists("GITHUB_LIST_SELF_HOSTED_RUNNERS_FOR_AN_ORGANIZATION")
        : assertExists("GITHUB_LIST_SELF_HOSTED_RUNNERS_FOR_A_REPOSITORY"),
    ],
    reason: "runner_id must reference an existing self-hosted runner in the same scope",
    confidence: "high",
  },
  {
    param: "discussion_number",
    producers: () => [assertExists("GITHUB_LIST_DISCUSSIONS")],
    reason: "discussion_number must reference an existing discussion",
    confidence: "high",
  },
  {
    param: "project_number",
    producers: (slug) => {
      if (slug.includes("USER")) return [assertExists("GITHUB_LIST_USER_PROJECTS")];
      if (ORG_HINT.test(slug)) return [assertExists("GITHUB_LIST_ORGANIZATION_PROJECTS")];
      return [assertExists("GITHUB_LIST_REPOSITORY_PROJECTS")];
    },
    reason: "project_number must reference an existing project board",
    confidence: "high",
  },
  {
    param: "project_id",
    producers: (slug) => {
      if (slug.includes("USER")) return [assertExists("GITHUB_LIST_USER_PROJECTS")];
      if (ORG_HINT.test(slug)) return [assertExists("GITHUB_LIST_ORGANIZATION_PROJECTS")];
      return [assertExists("GITHUB_LIST_REPOSITORY_PROJECTS")];
    },
    reason: "project_id must reference an existing (classic) project",
    confidence: "high",
  },
  {
    param: "labels",
    producers: () => [assertExists("GITHUB_LIST_LABELS_FOR_A_REPOSITORY")],
    reason: "label names applied to an issue must already exist on the repository",
    confidence: "medium",
  },
  {
    param: "sha",
    producers: () => [assertExists("GITHUB_LIST_COMMITS")],
    reason: "commit sha is obtained by listing/finding commits, not guessed",
    confidence: "medium",
  },
  {
    param: "commit_sha",
    producers: () => [assertExists("GITHUB_LIST_COMMITS")],
    reason: "commit sha is obtained by listing/finding commits, not guessed",
    confidence: "medium",
  },
  {
    param: "codespace_name",
    producers: () => [assertExists("GITHUB_LIST_CODESPACES_FOR_THE_AUTHENTICATED_USER")],
    reason: "codespace_name must reference an existing codespace",
    confidence: "high",
  },
  {
    param: "role_id",
    producers: () => [assertExists("GITHUB_LIST_ORGANIZATION_ROLES_FOR_AN_ORGANIZATION")],
    reason: "role_id must reference an existing custom organization role",
    confidence: "high",
  },
  {
    param: "release_id",
    producers: () => [assertExists("GITHUB_LIST_RELEASES")],
    reason: "release_id must reference an existing release",
    confidence: "high",
  },
  {
    param: "tag_name",
    producers: () => [assertExists("GITHUB_LIST_REPOSITORY_TAGS")],
    reason: "when referencing an existing release/tag, tag_name should match a real tag",
    confidence: "low",
  },
  {
    param: "asset_id",
    producers: () => [assertExists("GITHUB_LIST_RELEASE_ASSETS")],
    reason: "asset_id must reference an existing release asset",
    confidence: "high",
  },
  {
    param: "invitation_id",
    producers: (slug) => [
      slug.includes("TEAM")
        ? assertExists("GITHUB_LIST_PENDING_TEAM_INVITATIONS")
        : assertExists("GITHUB_LIST_REPOSITORY_INVITATIONS"),
    ],
    reason: "invitation_id must reference an existing pending invitation",
    confidence: "high",
  },
  {
    param: "installation_id",
    producers: () => [assertExists("GITHUB_LIST_APP_INSTALLATIONS")],
    reason: "installation_id must reference an existing GitHub App installation",
    confidence: "high",
  },
  {
    param: "check_run_id",
    producers: () => [assertExists("GITHUB_LIST_CHECK_RUNS_FOR_A_REF")],
    reason: "check_run_id must reference an existing check run on that ref",
    confidence: "high",
  },
  {
    param: "check_suite_id",
    producers: () => [assertExists("GITHUB_LIST_CHECK_SUITES_FOR_A_GIT_REFERENCE")],
    reason: "check_suite_id must reference an existing check suite on that ref",
    confidence: "high",
  },
  {
    param: "deployment_id",
    producers: () => [assertExists("GITHUB_LIST_DEPLOYMENTS")],
    reason: "deployment_id must reference an existing deployment",
    confidence: "high",
  },
  {
    param: "artifact_id",
    producers: () => [
      assertExists("GITHUB_LIST_ARTIFACTS_FOR_A_REPOSITORY"),
      assertExists("GITHUB_LIST_WORKFLOW_RUN_ARTIFACTS"),
    ],
    reason: "artifact_id must reference an existing build artifact",
    confidence: "high",
  },
  {
    param: "review_id",
    producers: () => [assertExists("GITHUB_LIST_REVIEWS_FOR_A_PULL_REQUEST")],
    reason: "review_id must reference an existing PR review",
    confidence: "high",
  },
  {
    param: "event_id",
    producers: () => [assertExists("GITHUB_LIST_ISSUE_EVENTS_FOR_A_REPOSITORY")],
    reason: "event_id must reference an existing issue timeline event",
    confidence: "medium",
  },
  {
    param: "assignees",
    producers: () => [assertExists("GITHUB_LIST_REPOSITORY_COLLABORATORS")],
    reason: "only existing collaborators can be assigned; resolve valid usernames first",
    confidence: "medium",
  },
  {
    param: "reviewers",
    producers: () => [assertExists("GITHUB_LIST_REPOSITORY_COLLABORATORS")],
    reason: "requested reviewers must be repo collaborators; resolve valid usernames first",
    confidence: "medium",
  },
  {
    param: "team_reviewers",
    producers: () => [assertExists("GITHUB_LIST_TEAMS")],
    reason: "requested team reviewers must be existing teams",
    confidence: "medium",
  },
];

const edges = [];
for (const tool of tools) {
  for (const rule of RULES) {
    const paramSpec = tool.input_parameters?.[rule.param];
    if (!paramSpec) continue;
    const producers = rule.producers(tool.slug);
    for (const producer of producers) {
      if (producer === tool.slug) continue;
      edges.push({
        from: producer,
        to: tool.slug,
        param: rule.param,
        required: !!paramSpec.required,
        reason: rule.reason,
        confidence: rule.confidence,
        source: "curated_rule",
      });
    }
  }
}

// de-duplicate
const seen = new Set();
const deduped = edges.filter((e) => {
  const key = `${e.from}|${e.to}|${e.param}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

console.log("GitHub curated edges:", deduped.length);
writeFileSync("./curated_github_edges.json", JSON.stringify(deduped, null, 2), "utf-8");
