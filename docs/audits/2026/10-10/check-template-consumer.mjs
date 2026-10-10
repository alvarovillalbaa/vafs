// Focused, read-only check; run with Node 26 from the repository root.
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { registerHooks } from "node:module"
import path from "node:path"
import { pathToFileURL } from "node:url"

const root = process.cwd()
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/lib/vafs/")) {
      return {
        url: pathToFileURL(path.join(root, specifier.slice(2) + ".ts")).href,
        shortCircuit: true,
      }
    }
    return nextResolve(specifier, context)
  },
})

const contract = await import(pathToFileURL(path.join(root, "lib/vafs/afs-contract.ts")))
const services = await import(pathToFileURL(path.join(root, "lib/vafs/services.ts")))
const forbiddenFiles = new Set(["BRAIN.md", "FRICTION.md", "PREDICTION.md", "REGRESSIONS.md", "VISION.md", "FOCUS.md", "RUNBOOK.md", "DECISIONS.md"])
const forbiddenFolders = new Set(["raw", "sources", "templates", "goals", "items", "cookbook", "official-documentation", "context"])
const requiredFiles = ["AGENTS.md", "REFERENCES.md", "SOURCES.md", "GAPS.md"]
const template = contract.agentsFsTemplateFiles
const paths = template.map((file) => file.path)
assert.equal(new Set(paths).size, paths.length, "Template paths must be unique")
for (const file of requiredFiles) assert.ok(paths.includes(file), file)
for (const file of template) {
  assert.ok(!forbiddenFiles.has(file.path), file.path)
  assert.ok(!forbiddenFolders.has(file.path.split("/")[0]), file.path)
  assert.equal(await readFile(path.join(root, "packages/skills/vafs-use/assets/agents-fs-template", file.path), "utf8"), file.content, file.path)
  if (file.path.startsWith("logs/")) {
    assert.match(file.path, /^logs\/\d{4}\/\d{2}-\d{2}\//)
    assert.ok(file.content.trimEnd().split("\n").length <= 2)
  }
}
const proposal = services.createAgentsFsRepo({ owner: "example", kind: "personal", workspaceId: "template-check" })
assert.equal(proposal.repo.status, "creating")
assert.deepEqual(proposal.initialCommit.files, template, "Repository proposal must use the maintained scaffold")
assert.deepEqual(services.discoverAgentsFsRepos().createTemplate, template)
assert.equal(services.getFile({ workspaceId: "ws_personal_alvaro", path: "AGENTS.md" }).title, "Agent Rules")
assert.equal(services.getFile({ workspaceId: "ws_personal_alvaro", path: "PRODUCT.md" }).section, "truth")
const overview = services.getPlatformOverview()
for (const file of requiredFiles) assert.ok(overview.rootFiles.some((entry) => entry.file === file), file)
for (const file of overview.rootFiles) assert.ok(!forbiddenFiles.has(file.file), file.file)
for (const group of overview.pathGroups) {
  for (const entry of group.paths) assert.ok(!forbiddenFolders.has(entry.path.split("/")[1]), entry.path)
}
for (const heading of ["Questions and order", "Hypotheses", "Reasoning", "Method", "Evidence and status"]) {
  assert.ok(template.find((file) => file.path === "research/README.md").content.includes(heading), heading)
}
console.log(JSON.stringify({ templateFiles: template.length, assetByteParity: true, repositoryProposalConsumer: true, discoveryConsumer: true, catalogRetiredPathsAbsent: true, networkOrRepositoryMutations: false }))
