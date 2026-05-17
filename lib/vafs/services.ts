import {
  agentsFsTemplateFiles,
  afsPathGroups,
  afsRootFiles,
  afsStandard,
  vafsProductContract,
} from "@/lib/vafs/afs-contract"
import { draftCleanupRun } from "@/lib/vafs/cleanup-agent"
import {
  demoCleanupRuns,
  demoFiles,
  demoRepoConnections,
  demoSyncJobs,
  demoWorkspaces,
} from "@/lib/vafs/fixtures"
import { searchAfsFiles } from "@/lib/vafs/hybrid-search"
import { createSyncPlan } from "@/lib/vafs/sync"
import type { AfsFileRecord, RepoConnection, SyncJob } from "@/lib/vafs/types"

export function getPlatformOverview() {
  return {
    standard: afsStandard,
    productContract: vafsProductContract,
    pathGroups: afsPathGroups,
    rootFiles: afsRootFiles,
    counts: {
      workspaces: demoWorkspaces.length,
      connectedRepos: demoRepoConnections.filter((repo) => repo.status !== "missing")
        .length,
      indexedFiles: demoFiles.length,
      activeSyncJobs: demoSyncJobs.filter((job) => job.status === "running").length,
      cleanupRuns: demoCleanupRuns.length,
    },
  }
}

export function listWorkspaces() {
  return demoWorkspaces.map((workspace) => ({
    ...workspace,
    repo: demoRepoConnections.find((repo) => repo.id === workspace.repoConnectionId),
  }))
}

export function getWorkspace(workspaceId = demoWorkspaces[0]?.id) {
  const workspace = demoWorkspaces.find((item) => item.id === workspaceId)
  if (!workspace) return null

  return {
    ...workspace,
    repo: demoRepoConnections.find((repo) => repo.id === workspace.repoConnectionId),
  }
}

export function discoverAgentsFsRepos() {
  return {
    selected: demoRepoConnections,
    missing: [
      {
        owner: "new-company",
        kind: "company",
        reason: "No agents-fs repo was found for this workspace owner.",
      },
    ],
    createTemplate: agentsFsTemplateFiles,
  }
}

export function createAgentsFsRepo({
  owner,
  kind,
  workspaceId,
}: {
  owner: string
  kind: RepoConnection["kind"]
  workspaceId: string
}) {
  const repo: RepoConnection = {
    id: `repo_${workspaceId}_${kind}`,
    workspaceId,
    kind,
    provider: "github",
    owner,
    name: "agents-fs",
    fullName: `${owner}/agents-fs`,
    defaultBranch: "main",
    installationId: null,
    htmlUrl: `https://github.com/${owner}/agents-fs`,
    status: "creating",
    lastCommitSha: null,
    lastSyncedAt: null,
  }

  return {
    repo,
    initialCommit: {
      message: "Initialize AFS workspace from VAFS template",
      files: agentsFsTemplateFiles,
    },
  }
}

export function searchWorkspace({
  query,
  workspaceId,
  includeRaw,
}: {
  query: string
  workspaceId?: string
  includeRaw?: boolean
}) {
  return searchAfsFiles({ query, workspaceId, includeRaw })
}

export function getFile({
  workspaceId,
  path,
}: {
  workspaceId: string
  path: string
}) {
  return demoFiles.find(
    (file) => file.workspaceId === workspaceId && file.path === path
  )
}

export function proposeFileWrite({
  workspaceId,
  path,
  content,
  section = "truth",
}: {
  workspaceId: string
  path: string
  content: string
  section?: AfsFileRecord["section"]
}) {
  return {
    mode: "branch_and_pull_request",
    branchName: `vafs/write/${path.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
    proposedFile: {
      workspaceId,
      path,
      content,
      section,
    },
    pullRequest: {
      title: `Update ${path} through VAFS`,
      body: "This write was proposed through the VAFS API and must be reviewed before merge.",
    },
  }
}

export function uploadRaw({
  workspaceId,
  filename,
  content,
}: {
  workspaceId: string
  filename: string
  content: string
}) {
  const date = new Date().toISOString().slice(0, 10)
  return proposeFileWrite({
    workspaceId,
    path: `raw/${date.slice(0, 4)}/${date}/${filename}`,
    content,
    section: "raw",
  })
}

export function triggerSync({
  workspaceId,
  trigger = "manual",
}: {
  workspaceId: string
  trigger?: SyncJob["trigger"]
}) {
  const repo = demoRepoConnections.find((item) => item.workspaceId === workspaceId)
  if (!repo) throw new Error("Workspace has no connected repo")

  const job: SyncJob = {
    id: `sync_${Date.now()}`,
    workspaceId,
    repoConnectionId: repo.id,
    status: "queued",
    trigger,
    changedFiles: 0,
    indexedChunks: 0,
    startedAt: null,
    completedAt: null,
    error: null,
  }

  const plan = createSyncPlan(
    demoFiles.filter((file) => file.workspaceId === workspaceId),
    job
  )

  return {
    ...job,
    changedFiles: plan.changedFiles,
    indexedChunks: plan.indexedChunks,
    vectorNamespace: plan.vectorNamespace,
  }
}

export function listCleanupRuns(workspaceId?: string) {
  return workspaceId
    ? demoCleanupRuns.filter((run) => run.workspaceId === workspaceId)
    : demoCleanupRuns
}

export function startCleanupRun({
  workspaceId,
  objective,
  sourcePaths,
}: {
  workspaceId: string
  objective?: string
  sourcePaths?: string[]
}) {
  return draftCleanupRun({ workspaceId, objective, sourcePaths })
}

export function getHealth() {
  return {
    status: "ok",
    app: "vafs",
    version: "0.1.0",
    checks: {
      supabaseMetadata: "configured-by-env",
      githubApp: "configured-by-env",
      s3Vectors: "configured-by-env",
      openaiAgentsSdk: "configured-by-env",
      localShellHybridRag: "cli-mcp-only",
    },
  }
}
