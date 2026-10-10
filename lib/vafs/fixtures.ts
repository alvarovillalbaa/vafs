import type {
  AfsFileRecord,
  CleanupRun,
  RepoConnection,
  SyncJob,
  Workspace,
} from "@/lib/vafs/types"

export const demoWorkspaces: Workspace[] = [
  {
    id: "ws_personal_alvaro",
    name: "Alvaro Personal",
    slug: "alvaro",
    type: "personal",
    role: "owner",
    repoConnectionId: "repo_personal_agents_fs",
    memberCount: 1,
  },
  {
    id: "ws_company_clous",
    name: "Clous AI",
    slug: "clous-ai",
    type: "company",
    role: "owner",
    repoConnectionId: "repo_company_agents_fs",
    memberCount: 7,
  },
]

export const demoRepoConnections: RepoConnection[] = [
  {
    id: "repo_personal_agents_fs",
    workspaceId: "ws_personal_alvaro",
    kind: "personal",
    provider: "github",
    owner: "alvarovillalbaa",
    name: "agents-fs",
    fullName: "alvarovillalbaa/agents-fs",
    defaultBranch: "main",
    installationId: 120174,
    htmlUrl: "https://github.com/alvarovillalbaa/agents-fs",
    status: "connected",
    lastCommitSha: "aaf5d00",
    lastSyncedAt: "2026-05-17T08:30:00.000Z",
  },
  {
    id: "repo_company_agents_fs",
    workspaceId: "ws_company_clous",
    kind: "company",
    provider: "github",
    owner: "clous-ai",
    name: "agents-fs",
    fullName: "clous-ai/agents-fs",
    defaultBranch: "main",
    installationId: 120175,
    htmlUrl: "https://github.com/clous-ai/agents-fs",
    status: "syncing",
    lastCommitSha: "baf5d01",
    lastSyncedAt: "2026-05-17T08:12:00.000Z",
  },
]

export const demoFiles: AfsFileRecord[] = [
  {
    workspaceId: "ws_personal_alvaro",
    path: "AGENTS.md",
    title: "Agent Rules",
    description: "Rules for how this personal AFS should be managed.",
    section: "root",
    updatedAt: "2026-05-17",
    sourceCommitSha: "aaf5d00",
    content:
      "AFS workspace rules: search maintained knowledge, preserve raw artifacts in private Drive, and record provenance in SOURCES.md.",
  },
  {
    workspaceId: "ws_personal_alvaro",
    path: "PRODUCT.md",
    title: "VAFS Product",
    description:
      "VAFS is the productized implementation of AFS with GitHub source repos, Supabase metadata, and S3 Vectors retrieval.",
    section: "truth",
    updatedAt: "2026-05-17",
    sourceCommitSha: "aaf5d00",
    content:
      "VAFS syncs agents-fs GitHub repositories into AWS S3 Vectors. It exposes MCP, CLI, API, and a Next.js app. Supabase is used for access control and external integration metadata, not document storage.",
  },
  {
    workspaceId: "ws_personal_alvaro",
    path: "raw/2026/2026-05-17/qmd-research.md",
    title: "QMD Retrieval Research",
    description:
      "Raw notes comparing vector similarity with query-model-driven retrieval, reranking, and constraints.",
    section: "raw",
    updatedAt: "2026-05-17",
    sourceCommitSha: "aaf5d00",
    content:
      "QMD retrieval combines semantic recall, BM25, structured filters, reranking, and business logic. Embeddings alone are shallow for compositional queries.",
  },
  {
    workspaceId: "ws_company_clous",
    path: "runbooks/github-sync.md",
    title: "GitHub Sync Runbook",
    description:
      "How VAFS handles GitHub App webhooks, changed-file detection, chunking, and vector index updates.",
    section: "truth",
    updatedAt: "2026-05-17",
    sourceCommitSha: "baf5d01",
    content:
      "GitHub App webhooks enqueue sync jobs. The worker resolves changed files by commit SHA, chunks markdown by heading, writes index manifests, and upserts S3 Vectors with metadata filters.",
  },
  {
    workspaceId: "ws_company_clous",
    path: "specs/oauth-provider.md",
    title: "VAFS OAuth Provider",
    description:
      "Developer OAuth scopes and grants for external applications that connect to VAFS.",
    section: "operational",
    updatedAt: "2026-05-17",
    sourceCommitSha: "baf5d01",
    content:
      "External apps request VAFS scopes such as vafs.search, vafs.read.pages, vafs.write.raw, vafs.write.knowledge, vafs.sync.trigger, and admin scopes. Access is enforced per workspace.",
  },
]

export const demoSyncJobs: SyncJob[] = [
  {
    id: "sync_20260517_0830",
    workspaceId: "ws_personal_alvaro",
    repoConnectionId: "repo_personal_agents_fs",
    status: "completed",
    trigger: "github_webhook",
    changedFiles: 12,
    indexedChunks: 48,
    startedAt: "2026-05-17T08:29:14.000Z",
    completedAt: "2026-05-17T08:30:00.000Z",
    error: null,
  },
  {
    id: "sync_20260517_0912",
    workspaceId: "ws_company_clous",
    repoConnectionId: "repo_company_agents_fs",
    status: "running",
    trigger: "manual",
    changedFiles: 7,
    indexedChunks: 18,
    startedAt: "2026-05-17T09:12:04.000Z",
    completedAt: null,
    error: null,
  },
]

export const demoCleanupRuns: CleanupRun[] = [
  {
    id: "cleanup_20260517_raw_compile",
    workspaceId: "ws_personal_alvaro",
    status: "pr_opened",
    objective: "Compile raw QMD research into canonical VAFS retrieval knowledge.",
    sourcePaths: ["raw/2026/2026-05-17/qmd-research.md"],
    branchName: "vafs/cleanup/raw-compile-20260517",
    pullRequestUrl: "https://github.com/alvarovillalbaa/agents-fs/pull/1",
    proposedChanges: [
      {
        path: "knowledge/retrieval/hybrid-rag.md",
        action: "create",
        reason: "Promote durable retrieval architecture from raw notes.",
      },
      {
        path: "raw/2026/2026-05-17/qmd-research.md",
        action: "update",
        reason: "Mark source as compiled and preserve provenance.",
      },
    ],
    trace: [
      "Searched raw/ for uncompiled material.",
      "Detected retrieval architecture content.",
      "Matched canonical destination: knowledge/retrieval/hybrid-rag.md.",
      "Prepared branch-only writeback and PR summary.",
    ],
    createdAt: "2026-05-17T08:48:00.000Z",
  },
]
