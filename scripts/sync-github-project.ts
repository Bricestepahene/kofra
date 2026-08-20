#!/usr/bin/env node
/**
 * Idempotent sync from docs/execution/kofra-v1-backlog.yaml to a GitHub
 * Project (v2) and one issue per epic. Safe to re-run: existing project,
 * fields, issues and field values are detected and only created/updated
 * when missing or different — nothing is duplicated.
 *
 * Requires: `gh` CLI authenticated with `project` and `repo` scopes
 * (`gh auth status`; if missing scopes: `gh auth refresh -s project`).
 *
 * Usage:
 *   pnpm sync:github-project                 # dry run (default, prints the plan)
 *   pnpm sync:github-project -- --apply       # actually create/update on GitHub
 *   pnpm sync:github-project -- --apply --owner Bricestepahene --repo kofra
 *
 * Known limitation (not a bug to fix here): the GitHub Projects v2 API/CLI
 * has no operation to create a saved *view* (grouping + filters). The 6
 * views described in docs/execution/README.md must be created once by hand
 * in the Project UI — this script only guarantees the underlying data
 * (fields, issues, field values) those views would filter/group on.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { load as loadYaml } from "js-yaml";

interface Program {
  id: string;
  name: string;
  depends_on: string[];
}

interface Epic {
  id: string;
  program: string;
  title: string;
  description: string;
  depends_on: string[];
  priority: "P0" | "P1" | "P2";
  risk: "Critical" | "High" | "Medium" | "Low";
  security_critical: boolean;
  release_gate: "None" | "Alpha" | "Beta" | "Pilot" | "Production";
  milestone: string;
  size: "S" | "M" | "L" | "XL";
  acceptance_criteria: string[];
}

interface Milestone {
  id: string;
  name: string;
}

interface Backlog {
  version: number;
  milestones: Milestone[];
  programs: Program[];
  epics: Epic[];
}

interface FieldSpec {
  name: string;
  type: "TEXT" | "NUMBER" | "DATE" | "SINGLE_SELECT";
  options?: string[];
}

const FIELD_SCHEMA: FieldSpec[] = [
  { name: "Program", type: "SINGLE_SELECT", options: [
    "P00", "P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08", "P09", "P10", "P11",
  ] },
  { name: "Epic", type: "TEXT" },
  { name: "Lot", type: "SINGLE_SELECT", options: ["A", "B", "C", "D", "E", "F", "G", "H"] },
  { name: "Status", type: "SINGLE_SELECT", options: [
    "Backlog", "Ready", "In progress", "In review", "Blocked", "Done",
  ] },
  { name: "Priority", type: "SINGLE_SELECT", options: ["P0", "P1", "P2"] },
  { name: "Risk", type: "SINGLE_SELECT", options: ["Critical", "High", "Medium", "Low"] },
  { name: "Security critical", type: "SINGLE_SELECT", options: ["Yes", "No"] },
  { name: "Depends on", type: "TEXT" },
  { name: "Start date", type: "DATE" },
  { name: "Target date", type: "DATE" },
  { name: "Estimate", type: "NUMBER" },
  { name: "Acceptance evidence", type: "TEXT" },
  { name: "Release gate", type: "SINGLE_SELECT", options: ["None", "Alpha", "Beta", "Pilot", "Production"] },
];

const EPIC_MARKER = (id: string) => `<!-- kofra-epic: ${id} -->`;

function parseArgs(argv: string[]) {
  const apply = argv.includes("--apply");
  const owner = argv.includes("--owner") ? argv[argv.indexOf("--owner") + 1] : "Bricestepahene";
  const repo = argv.includes("--repo") ? argv[argv.indexOf("--repo") + 1] : "kofra";
  const projectTitle = argv.includes("--project-title")
    ? argv[argv.indexOf("--project-title") + 1]
    : "KOFRA — Delivery System";
  const backlogPath = argv.includes("--backlog")
    ? argv[argv.indexOf("--backlog") + 1]
    : "docs/execution/kofra-v1-backlog.yaml";
  return { apply, owner: owner!, repo: repo!, projectTitle: projectTitle!, backlogPath: backlogPath! };
}

function gh(args: string[]): string {
  return execFileSync("gh", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}

function ghJSON<T>(args: string[]): T {
  return JSON.parse(gh(args)) as T;
}

function loadBacklog(path: string): Backlog {
  const raw = readFileSync(path, "utf8");
  const backlog = loadYaml(raw) as Backlog;
  validateBacklog(backlog);
  return backlog;
}

function validateBacklog(backlog: Backlog): void {
  const programIds = new Set(backlog.programs.map((p) => p.id));
  const epicIds = new Set(backlog.epics.map((e) => e.id));
  const milestoneIds = new Set(backlog.milestones.map((m) => m.id));
  const errors: string[] = [];

  if (programIds.size !== backlog.programs.length) errors.push("duplicate program id");
  if (epicIds.size !== backlog.epics.length) errors.push("duplicate epic id");

  for (const epic of backlog.epics) {
    if (!programIds.has(epic.program)) {
      errors.push(`epic ${epic.id} references unknown program ${epic.program}`);
    }
    if (!milestoneIds.has(epic.milestone)) {
      errors.push(`epic ${epic.id} references unknown milestone ${epic.milestone}`);
    }
    for (const dep of epic.depends_on) {
      if (!epicIds.has(dep)) {
        errors.push(`epic ${epic.id} depends_on unknown epic ${dep}`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid backlog:\n${errors.map((e) => ` - ${e}`).join("\n")}`);
  }
}

// --- GitHub Project ---------------------------------------------------

interface ProjectRef {
  id: string;
  number: number;
}

function findOrCreateProject(owner: string, title: string, apply: boolean): ProjectRef {
  const list = ghJSON<{ projects: Array<{ id: string; number: number; title: string }> }>([
    "project", "list", "--owner", owner, "--format", "json",
  ]);
  const existing = list.projects.find((p) => p.title === title);
  if (existing) {
    console.log(`[project] found "${title}" (#${existing.number})`);
    return { id: existing.id, number: existing.number };
  }
  if (!apply) {
    console.log(`[dry-run] would create project "${title}" for owner ${owner}`);
    return { id: "DRY-RUN-PROJECT-ID", number: -1 };
  }
  const created = ghJSON<{ id: string; number: number }>([
    "project", "create", "--owner", owner, "--title", title, "--format", "json",
  ]);
  console.log(`[project] created "${title}" (#${created.number})`);
  return created;
}

function ensureProjectLinkedToRepo(owner: string, repo: string, projectNumber: number, apply: boolean): void {
  if (!apply) {
    console.log(`[dry-run] would link project #${projectNumber} to ${owner}/${repo}`);
    return;
  }
  try {
    gh(["project", "link", String(projectNumber), "--owner", owner, "--repo", `${owner}/${repo}`]);
    console.log(`[project] linked to ${owner}/${repo}`);
  } catch (err) {
    // gh returns a non-zero exit if the project is already linked — treat
    // that specific case as success, re-throw anything else.
    const message = err instanceof Error ? err.message : String(err);
    if (!/already linked/i.test(message)) throw err;
    console.log(`[project] already linked to ${owner}/${repo}`);
  }
}

// --- Fields -------------------------------------------------------------

interface FieldOption {
  id: string;
  name: string;
}

interface RemoteField {
  id: string;
  name: string;
  type: string;
  options?: FieldOption[];
}

function ensureFields(
  owner: string,
  projectNumber: number,
  apply: boolean,
): Map<string, RemoteField> {
  const existing = apply
    ? ghJSON<{ fields: RemoteField[] }>([
        "project", "field-list", String(projectNumber), "--owner", owner, "--format", "json",
      ]).fields
    : [];
  const byName = new Map(existing.map((f) => [f.name, f]));

  for (const spec of FIELD_SCHEMA) {
    const found = byName.get(spec.name);
    if (found) {
      if (spec.type === "SINGLE_SELECT" && spec.options) {
        const remoteOptionNames = new Set((found.options ?? []).map((o) => o.name));
        const missing = spec.options.filter((o) => !remoteOptionNames.has(o));
        if (missing.length > 0) {
          console.warn(
            `[fields] WARNING: "${spec.name}" exists but is missing option(s) [${missing.join(", ")}]. ` +
              `gh CLI cannot add options to an existing single-select field — add ${missing.length === 1 ? "it" : "them"} ` +
              `by hand in the Project UI (see docs/execution/README.md).`,
          );
        }
      }
      continue;
    }
    if (!apply) {
      console.log(`[dry-run] would create field "${spec.name}" (${spec.type}${spec.options ? `: ${spec.options.join(", ")}` : ""})`);
      continue;
    }
    const args = [
      "project", "field-create", String(projectNumber),
      "--owner", owner,
      "--name", spec.name,
      "--data-type", spec.type,
    ];
    if (spec.options) args.push("--single-select-options", spec.options.join(","));
    const created = ghJSON<RemoteField>([...args, "--format", "json"]);
    console.log(`[fields] created "${spec.name}"`);
    byName.set(spec.name, created);
  }

  return byName;
}

function optionId(field: RemoteField | undefined, optionName: string): string | undefined {
  return field?.options?.find((o) => o.name === optionName)?.id;
}

// --- Issues ---------------------------------------------------------------

interface RemoteIssue {
  number: number;
  url: string;
  body: string;
}

function buildIssueBody(epic: Epic, backlog: Backlog): string {
  const program = backlog.programs.find((p) => p.id === epic.program)!;
  const deps = epic.depends_on.length > 0 ? epic.depends_on.join(", ") : "aucune";
  const criteria = epic.acceptance_criteria.map((c) => `- [ ] ${c}`).join("\n");
  return [
    EPIC_MARKER(epic.id),
    `**Programme** : ${program.id} — ${program.name}`,
    `**Dépend de** : ${deps}`,
    "",
    epic.description,
    "",
    "**Critères d'acceptation de l'epic :**",
    criteria,
    "",
    "---",
    "_Cette issue représente l'epic. Elle sera découpée en issues techniques " +
      "(1 jour à moins de 3 jours de travail chacune) quand son lot démarre. " +
      "Chaque issue technique héritera de la définition de fini du backlog " +
      "(PR + tests verts + analyse sécurité verte ou exception documentée + " +
      "migrations testées + contrat OpenAPI à jour si nécessaire + aucun " +
      "secret en logs/erreurs/fixtures + doc/ADR à jour si décision changée " +
      "+ revue humaine)._",
    "",
    `_Source : docs/execution/kofra-v1-backlog.yaml — ne pas éditer cette issue directement, éditer le YAML puis relancer le script de synchronisation._`,
  ].join("\n");
}

function findExistingIssue(owner: string, repo: string, epicId: string): RemoteIssue | undefined {
  const results = ghJSON<Array<{ number: number; url: string; body: string }>>([
    "issue", "list",
    "--repo", `${owner}/${repo}`,
    "--search", `"${EPIC_MARKER(epicId)}" in:body`,
    "--state", "all",
    "--json", "number,url,body",
  ]);
  return results[0];
}

function ensureIssue(
  owner: string,
  repo: string,
  epic: Epic,
  backlog: Backlog,
  apply: boolean,
): RemoteIssue {
  const title = `[${epic.id}] ${epic.title}`;
  const body = buildIssueBody(epic, backlog);
  const existing = apply ? findExistingIssue(owner, repo, epic.id) : undefined;

  if (existing) {
    if (existing.body.trim() !== body.trim()) {
      gh(["issue", "edit", String(existing.number), "--repo", `${owner}/${repo}`, "--body", body]);
      console.log(`[issue] updated #${existing.number} (${epic.id})`);
    } else {
      console.log(`[issue] up to date #${existing.number} (${epic.id})`);
    }
    return existing;
  }

  if (!apply) {
    console.log(`[dry-run] would create issue "${title}"`);
    return { number: -1, url: "dry-run", body };
  }

  const created = ghJSON<{ number: number; url: string }>([
    "issue", "create",
    "--repo", `${owner}/${repo}`,
    "--title", title,
    "--body", body,
    "--label", `program:${epic.program}`,
    "--format", "json",
  ]);
  console.log(`[issue] created #${created.number} (${epic.id})`);
  return { ...created, body };
}

// --- Project items and field values ---------------------------------------

interface ProjectItem {
  id: string;
  content?: { url?: string };
}

function findOrAddItem(
  owner: string,
  projectNumber: number,
  issueUrl: string,
  apply: boolean,
): string {
  if (!apply) return "DRY-RUN-ITEM-ID";
  const items = ghJSON<{ items: ProjectItem[] }>([
    "project", "item-list", String(projectNumber), "--owner", owner, "--format", "json", "--limit", "1000",
  ]).items;
  const existing = items.find((i) => i.content?.url === issueUrl);
  if (existing) return existing.id;

  const added = ghJSON<{ id: string }>([
    "project", "item-add", String(projectNumber), "--owner", owner, "--url", issueUrl, "--format", "json",
  ]);
  return added.id;
}

function setFieldValues(
  projectId: string,
  itemId: string,
  fields: Map<string, RemoteField>,
  epic: Epic,
  apply: boolean,
): void {
  const edits: Array<{ field: string; args: string[] }> = [];

  const singleSelect = (fieldName: string, optionName: string) => {
    const field = fields.get(fieldName);
    const optId = optionId(field, optionName);
    if (!field || !optId) {
      console.warn(`[fields] cannot set "${fieldName}"="${optionName}" for ${epic.id} — field or option missing`);
      return;
    }
    edits.push({ field: fieldName, args: ["--single-select-option-id", optId] });
  };
  const text = (fieldName: string, value: string) => {
    const field = fields.get(fieldName);
    if (!field) return;
    edits.push({ field: fieldName, args: ["--text", value] });
  };

  singleSelect("Program", epic.program);
  text("Epic", epic.id);
  singleSelect("Status", "Backlog");
  singleSelect("Priority", epic.priority);
  singleSelect("Risk", epic.risk);
  singleSelect("Security critical", epic.security_critical ? "Yes" : "No");
  text("Depends on", epic.depends_on.join(", "));
  singleSelect("Release gate", epic.release_gate);
  text("Acceptance evidence", "");

  for (const edit of edits) {
    const field = fields.get(edit.field)!;
    if (!apply) {
      console.log(`[dry-run] would set "${edit.field}" for ${epic.id}`);
      continue;
    }
    gh([
      "project", "item-edit",
      "--id", itemId,
      "--project-id", projectId,
      "--field-id", field.id,
      ...edit.args,
    ]);
  }
}

// --- Main -------------------------------------------------------------

async function main() {
  const { apply, owner, repo, projectTitle, backlogPath } = parseArgs(process.argv.slice(2));
  console.log(apply ? "Running in APPLY mode." : "Running in DRY-RUN mode (pass --apply to write to GitHub).");

  const backlog = loadBacklog(backlogPath);
  console.log(`Loaded ${backlog.programs.length} programs and ${backlog.epics.length} epics from ${backlogPath}`);

  const project = findOrCreateProject(owner, projectTitle, apply);
  ensureProjectLinkedToRepo(owner, repo, project.number, apply);
  const fields = ensureFields(owner, project.number, apply);

  for (const epic of backlog.epics) {
    const issue = ensureIssue(owner, repo, epic, backlog, apply);
    const itemId = findOrAddItem(owner, project.number, issue.url, apply);
    setFieldValues(project.id, itemId, fields, epic, apply);
  }

  console.log(apply ? "Sync complete." : "Dry run complete — re-run with --apply to write to GitHub.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
