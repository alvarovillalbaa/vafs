export const vafsScopes = [
  "vafs.search",
  "vafs.read.pages",
  "vafs.write.raw",
  "vafs.write.knowledge",
  "vafs.sync.trigger",
  "vafs.admin.sources",
  "vafs.admin.integrations",
] as const

export type VafsScope = (typeof vafsScopes)[number]

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer"

export type Workspace = {
  id: string
  name: string
  slug: string
  type: "personal" | "company"
  role: WorkspaceRole
  repoConnectionId: string
  memberCount: number
}

export type RepoConnection = {
  id: string
  workspaceId: string
  kind: "personal" | "company"
  provider: "github"
  owner: string
  name: "agents-fs"
  fullName: string
  defaultBranch: string
  installationId: number | null
  htmlUrl: string
  status: "connected" | "missing" | "creating" | "syncing" | "error"
  lastCommitSha: string | null
  lastSyncedAt: string | null
}

export type AfsFileRecord = {
  workspaceId: string
  path: string
  title: string
  description: string
  section: "root" | "memory" | "operational" | "truth" | "raw"
  updatedAt: string
  content: string
  sourceCommitSha: string
}

export type SearchMode = "metadata" | "bm25" | "vector" | "grep" | "rerank"

export type SearchResult = {
  path: string
  title: string
  description: string
  section: AfsFileRecord["section"]
  updatedAt: string
  score: number
  modes: SearchMode[]
  highlights: string[]
}

export type SyncJob = {
  id: string
  workspaceId: string
  repoConnectionId: string
  status: "queued" | "running" | "completed" | "failed"
  trigger: "manual" | "github_webhook" | "cleanup_agent" | "cron"
  changedFiles: number
  indexedChunks: number
  startedAt: string | null
  completedAt: string | null
  error: string | null
}

export type CleanupRun = {
  id: string
  workspaceId: string
  status: "queued" | "running" | "pr_opened" | "failed"
  objective: string
  sourcePaths: string[]
  branchName: string
  pullRequestUrl: string | null
  proposedChanges: {
    path: string
    action: "create" | "update" | "delete"
    reason: string
  }[]
  trace: string[]
  createdAt: string
}

export type ApiEnvelope<T> = {
  data: T
  meta?: Record<string, unknown>
}

export type ApiErrorEnvelope = {
  error: {
    code: string
    message: string
    details?: unknown
  }
}
