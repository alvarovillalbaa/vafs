import Link from "next/link"
import {
  Activity,
  ArrowRight,
  Bot,
  Boxes,
  Braces,
  CheckCircle2,
  Cloud,
  Code2,
  Database,
  FileSearch,
  FolderGit2,
  GitPullRequestArrow,
  KeyRound,
  LockKeyhole,
  RefreshCcw,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react"

import { afsPathGroups, vafsProductContract } from "@/lib/vafs/afs-contract"
import {
  demoCleanupRuns,
  demoRepoConnections,
  demoSyncJobs,
} from "@/lib/vafs/fixtures"
import {
  getHealth,
  getPlatformOverview,
  listWorkspaces,
  searchWorkspace,
} from "@/lib/vafs/services"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const workspaceRows = listWorkspaces()
const overview = getPlatformOverview()
const health = getHealth()
const searchResults = searchWorkspace({ query: "hybrid retrieval qmd" })

export default function Home() {
  const activeWorkspace = workspaceRows[0]
  const activeRepo = activeWorkspace?.repo
  const activeCleanupRun = demoCleanupRuns[0]

  return (
    <main className="min-h-svh bg-[#f6f8fb] text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-heading">
            <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-950 text-white">
              <Boxes className="size-4" aria-hidden="true" />
            </span>
            <span>vAFS</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/docs">Docs</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/api/v1/health">
                API
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          <Card className="rounded-lg py-4 shadow-sm">
            <CardHeader className="px-4">
              <CardTitle>Workspaces</CardTitle>
              <CardDescription>Personal and company agents-fs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-4">
              {workspaceRows.map((workspace) => (
                <div
                  key={workspace.id}
                  className="rounded-lg border border-zinc-200 bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{workspace.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {workspace.type} / {workspace.role}
                      </p>
                    </div>
                    <Badge variant="secondary">{workspace.memberCount}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-lg py-4 shadow-sm">
            <CardHeader className="px-4">
              <CardTitle>Runtime</CardTitle>
              <CardDescription>{health.status}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-4 text-sm">
              <RuntimeLine icon={LockKeyhole} label="Auth" value="Supabase" />
              <RuntimeLine icon={FolderGit2} label="Source" value="GitHub" />
              <RuntimeLine icon={Database} label="Vectors" value="S3 Vectors" />
              <RuntimeLine icon={Cloud} label="Jobs" value="Edge workers" />
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Workspaces" value={overview.counts.workspaces} icon={Boxes} />
            <MetricCard
              label="Repos"
              value={overview.counts.connectedRepos}
              icon={FolderGit2}
            />
            <MetricCard
              label="Indexed files"
              value={overview.counts.indexedFiles}
              icon={FileSearch}
            />
            <MetricCard
              label="Sync jobs"
              value={overview.counts.activeSyncJobs}
              icon={Activity}
            />
          </div>

          <Tabs defaultValue="operate" className="gap-4">
            <TabsList className="rounded-lg">
              <TabsTrigger value="operate">Operate</TabsTrigger>
              <TabsTrigger value="retrieval">Retrieval</TabsTrigger>
              <TabsTrigger value="access">Access</TabsTrigger>
              <TabsTrigger value="developer">Developer</TabsTrigger>
            </TabsList>

            <TabsContent value="operate" className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <Card className="rounded-lg shadow-sm">
                  <CardHeader>
                    <CardTitle>Repository connection</CardTitle>
                    <CardDescription>
                      {activeRepo?.fullName ?? "No agents-fs connected"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      {demoRepoConnections.map((repo) => (
                        <div
                          key={repo.id}
                          className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <FolderGit2 className="size-4 text-zinc-600" />
                            <Badge
                              variant={
                                repo.status === "connected" ? "secondary" : "outline"
                              }
                            >
                              {repo.status}
                            </Badge>
                          </div>
                          <p className="mt-3 text-sm font-medium">{repo.fullName}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {repo.kind} / {repo.defaultBranch}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm">
                        <FolderGit2 aria-hidden="true" />
                        Connect GitHub
                      </Button>
                      <Button size="sm" variant="outline">
                        <RefreshCcw aria-hidden="true" />
                        Queue sync
                      </Button>
                      <Button size="sm" variant="outline">
                        <Upload aria-hidden="true" />
                        Upload raw
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-lg shadow-sm">
                  <CardHeader>
                    <CardTitle>Cleanup agent</CardTitle>
                    <CardDescription>
                      {activeCleanupRun.status.replace("_", " ")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                      <div className="flex items-start gap-3">
                        <Bot className="mt-0.5 size-5 text-zinc-700" />
                        <div>
                          <p className="text-sm font-medium">
                            {activeCleanupRun.objective}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {activeCleanupRun.branchName}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {activeCleanupRun.proposedChanges.map((change) => (
                        <div
                          key={`${change.path}-${change.action}`}
                          className="flex items-center gap-2 text-sm"
                        >
                          <GitPullRequestArrow className="size-4 text-emerald-700" />
                          <span className="font-mono text-xs">{change.path}</span>
                          <Badge variant="outline">{change.action}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-lg shadow-sm">
                <CardHeader>
                  <CardTitle>Sync queue</CardTitle>
                  <CardDescription>
                    GitHub webhooks, manual runs, and cleanup-triggered indexing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {demoSyncJobs.map((job) => (
                      <div
                        key={job.id}
                        className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-3 md:grid-cols-[1fr_120px_120px_120px]"
                      >
                        <div>
                          <p className="text-sm font-medium">{job.id}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {job.trigger} / {job.repoConnectionId}
                          </p>
                        </div>
                        <Badge variant="outline" className="w-fit">
                          {job.status}
                        </Badge>
                        <p className="text-sm text-zinc-600">
                          {job.changedFiles} files
                        </p>
                        <p className="text-sm text-zinc-600">
                          {job.indexedChunks} chunks
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="retrieval" className="space-y-4">
              <Card className="rounded-lg shadow-sm">
                <CardHeader>
                  <CardTitle>Search</CardTitle>
                  <CardDescription>
                    Metadata, BM25, S3 vectors, rerank, and local rg through CLI/MCP
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input defaultValue="hybrid retrieval qmd" aria-label="Search query" />
                    <Button>
                      <Search aria-hidden="true" />
                      Search
                    </Button>
                  </div>
                  <div className="grid gap-3">
                    {searchResults.map((result) => (
                      <div
                        key={result.path}
                        className="rounded-lg border border-zinc-200 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-heading text-base font-medium">
                              {result.title}
                            </p>
                            <p className="mt-1 font-mono text-xs text-zinc-500">
                              {result.path}
                            </p>
                          </div>
                          <Badge variant="secondary">{result.score}</Badge>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-zinc-600">
                          {result.description}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {result.modes.map((mode) => (
                            <Badge key={mode} variant="outline">
                              {mode}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="access" className="space-y-4">
              <Card className="rounded-lg shadow-sm">
                <CardHeader>
                  <CardTitle>OAuth and scopes</CardTitle>
                  <CardDescription>
                    Supabase identity, VAFS grants, and workspace permissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {vafsProductContract.scopes.map((scope) => (
                      <div
                        key={scope}
                        className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3"
                      >
                        <KeyRound className="size-4 text-zinc-600" />
                        <code className="text-xs">{scope}</code>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="developer" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-3">
                <SurfaceCard
                  icon={Braces}
                  title="API"
                  value="/api/v1/search"
                  href="/docs#api"
                />
                <SurfaceCard
                  icon={Code2}
                  title="CLI"
                  value="vafs search"
                  href="/docs#cli"
                />
                <SurfaceCard
                  icon={ShieldCheck}
                  title="MCP"
                  value="vafs-mcp"
                  href="/api/mcp"
                />
              </div>
              <Card className="rounded-lg shadow-sm">
                <CardHeader>
                  <CardTitle>AFS contract</CardTitle>
                  <CardDescription>
                    {afsPathGroups.length} path groups from the local standard
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                  {afsPathGroups.map((group) => (
                    <div
                      key={group.id}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                    >
                      <p className="font-heading text-sm font-medium">
                        {group.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-zinc-600">
                        {group.summary}
                      </p>
                      <Separator className="my-3" />
                      <p className="text-xs text-zinc-500">
                        {group.paths.length} paths
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </main>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: typeof Boxes
}) {
  return (
    <Card className="rounded-lg py-4 shadow-sm">
      <CardContent className="flex items-center justify-between gap-4 px-4">
        <div>
          <p className="text-xs font-medium uppercase text-zinc-500">{label}</p>
          <p className="mt-1 font-heading text-3xl font-semibold">{value}</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-lg bg-zinc-100">
          <Icon className="size-5 text-zinc-700" aria-hidden="true" />
        </span>
      </CardContent>
    </Card>
  )
}

function RuntimeLine({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof LockKeyhole
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-zinc-600">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function SurfaceCard({
  icon: Icon,
  title,
  value,
  href,
}: {
  icon: typeof Braces
  title: string
  value: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:bg-zinc-50"
    >
      <div className="flex items-center justify-between gap-4">
        <Icon className="size-5 text-zinc-700" aria-hidden="true" />
        <CheckCircle2 className="size-4 text-emerald-700" aria-hidden="true" />
      </div>
      <p className="mt-4 font-heading text-base font-medium">{title}</p>
      <p className="mt-1 font-mono text-sm text-zinc-500">{value}</p>
    </Link>
  )
}
