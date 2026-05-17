import { agentsFsTemplateFiles } from "@/lib/vafs/afs-contract"
import { demoFiles } from "@/lib/vafs/fixtures"
import type { AfsFileRecord, CleanupRun } from "@/lib/vafs/types"

const cleanupModel = process.env.VAFS_CLEANUP_MODEL ?? "gpt-5.5"

function destinationForRaw(file: AfsFileRecord) {
  const content = `${file.title} ${file.description} ${file.content}`.toLowerCase()

  if (content.includes("retrieval") || content.includes("qmd")) {
    return "knowledge/retrieval/hybrid-rag.md"
  }
  if (content.includes("oauth") || content.includes("scope")) {
    return "specs/oauth-provider.md"
  }
  if (content.includes("runbook") || content.includes("sync")) {
    return "runbooks/sync.md"
  }

  return `knowledge/${file.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`
}

export function draftCleanupRun({
  workspaceId,
  objective = "Compile raw material and optimize canonical AFS content.",
  sourcePaths,
}: {
  workspaceId: string
  objective?: string
  sourcePaths?: string[]
}): CleanupRun {
  const candidateFiles = demoFiles.filter((file) => {
    if (file.workspaceId !== workspaceId) return false
    if (sourcePaths?.length) return sourcePaths.includes(file.path)
    return file.section === "raw"
  })

  const proposedChanges = candidateFiles.flatMap((file) => [
    {
      path: destinationForRaw(file),
      action: "create" as const,
      reason: `Compile durable material from ${file.path}.`,
    },
    {
      path: file.path,
      action: "update" as const,
      reason: "Mark raw source as compiled while preserving provenance.",
    },
  ])

  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "")

  return {
    id: `cleanup_${timestamp}_${workspaceId}`,
    workspaceId,
    status: "queued",
    objective,
    sourcePaths: candidateFiles.map((file) => file.path),
    branchName: `vafs/cleanup/${timestamp}`,
    pullRequestUrl: null,
    proposedChanges,
    trace: [
      `Selected model: ${cleanupModel}.`,
      "Loaded AFS contract and workspace scope.",
      `Found ${candidateFiles.length} raw candidate files.`,
      "Prepared branch-and-PR writeback plan.",
    ],
    createdAt: new Date().toISOString(),
  }
}

export function getCleanupAgentSystemPrompt() {
  return `You are the VAFS cleanup agent. Use the OpenAI Agents SDK for TypeScript when the runtime is configured.

Rules:
- Never commit directly to the default branch.
- Compile raw/ into canonical AFS paths.
- Prefer updating existing canonical pages over creating duplicates.
- Preserve provenance, source paths, dates, and author-visible rationale.
- Open a branch and pull request with a concise trace.
- Trigger sync only after the PR branch is pushed.

Available template files: ${agentsFsTemplateFiles.map((file) => file.path).join(", ")}.`
}
