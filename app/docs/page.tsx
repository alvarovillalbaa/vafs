import Link from "next/link"
import {
  BookOpen,
  Braces,
  Cloud,
  Code2,
  Database,
  FolderGit2,
  GitPullRequestArrow,
  KeyRound,
  Network,
  ShieldCheck,
} from "lucide-react"

import {
  afsPathGroups,
  afsRootFiles,
  afsStandard,
  vafsProductContract,
} from "@/lib/vafs/afs-contract"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const apiRoutes = [
  "GET /api/v1/workspaces",
  "GET|POST /api/v1/search",
  "GET|PUT /api/v1/files",
  "POST /api/v1/raw",
  "POST /api/v1/sync",
  "GET|POST /api/v1/cleanup-runs",
  "GET /api/v1/oauth/authorize",
  "POST /api/v1/oauth/token",
  "GET|POST /api/mcp",
]

export default function DocsPage() {
  return (
    <main className="min-h-svh bg-[#fbfcfe] text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-heading">
            <span className="flex size-8 items-center justify-center rounded-lg bg-zinc-950 text-white">
              <BookOpen className="size-4" aria-hidden="true" />
            </span>
            vAFS Docs
          </Link>
          <Button asChild size="sm" variant="ghost">
            <Link href="/">Console</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[220px_1fr]">
        <nav className="hidden space-y-2 text-sm lg:block">
          {["overview", "standard", "api", "cli", "mcp", "deployment"].map(
            (item) => (
              <a
                key={item}
                href={`#${item}`}
                className="block rounded-lg px-3 py-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
              >
                {item}
              </a>
            )
          )}
        </nav>

        <article className="space-y-10">
          <section id="overview" className="scroll-mt-20">
            <Badge variant="outline">Historical prototype · AFS {afsStandard.lastUpdated}</Badge>
            <h1 className="mt-4 max-w-3xl font-heading text-4xl font-semibold tracking-normal">
              Historical vAFS prototype for AFS-compatible agents-fs repositories.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-600">
              The virtual filesystem layer is cancelled. This repository retains
              its prototype contracts and maintains the existing AFS catalog and
              export template. Raw AFS artifacts belong in private Drive.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-4">
              <DocFact icon={FolderGit2} label="Source" value="agents-fs" />
              <DocFact icon={ShieldCheck} label="Access" value="Supabase" />
              <DocFact icon={Database} label="Vectors" value="S3 Vectors" />
              <DocFact icon={Cloud} label="Workers" value="Edge Functions" />
            </div>
          </section>

          <section id="standard" className="scroll-mt-20">
            <SectionTitle
              title="AFS Standard"
              description={`${afsStandard.sourcePath} owns the portable AFS contract.`}
            />
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {afsPathGroups.map((group) => (
                <div key={group.id} className="rounded-lg border bg-white p-5">
                  <h3 className="font-heading text-lg font-medium">
                    {group.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {group.summary}
                  </p>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    {group.paths.slice(0, 5).map((item) => (
                      <code key={item.path} className="block text-xs">
                        {item.path}
                      </code>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border bg-white p-5">
              <h3 className="font-heading text-lg font-medium">Root files</h3>
              <div className="mt-4 grid gap-2 md:grid-cols-3">
                {afsRootFiles.map((item) => (
                  <code key={item.file} className="text-xs text-zinc-600">
                    {item.file}
                  </code>
                ))}
              </div>
            </div>
          </section>

          <section id="api" className="scroll-mt-20">
            <SectionTitle
              title="API"
              description="Route handlers expose the same primitives used by the app, CLI, and MCP bridge."
            />
            <div className="mt-4 rounded-lg border bg-white p-5">
              <div className="grid gap-2">
                {apiRoutes.map((route) => (
                  <code key={route} className="text-sm">
                    {route}
                  </code>
                ))}
              </div>
            </div>
          </section>

          <section id="cli" className="scroll-mt-20">
            <SectionTitle
              title="CLI"
              description="The local CLI calls the API and is the place where local shell/rg mode belongs."
            />
            <pre className="mt-4 overflow-x-auto rounded-lg bg-zinc-950 p-5 text-sm text-white">
              <code>{`npm run dev
VAFS_API_URL=http://127.0.0.1:3000 node bin/vafs.mjs search "hybrid retrieval" --workspace ws_personal_alvaro
node bin/vafs.mjs sync ws_personal_alvaro`}</code>
            </pre>
          </section>

          <section id="mcp" className="scroll-mt-20">
            <SectionTitle
              title="MCP"
              description="Use the stdio bridge locally or the HTTP route from clients that support remote JSON-RPC style calls."
            />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                "vafs_search",
                "vafs_get_page",
                "vafs_trigger_sync",
                "vafs_cleanup",
                "vafs_health",
              ].map((tool) => (
                <div
                  key={tool}
                  className="flex items-center gap-3 rounded-lg border bg-white p-4"
                >
                  <Network className="size-4 text-zinc-600" />
                  <code className="text-sm">{tool}</code>
                </div>
              ))}
            </div>
          </section>

          <section id="deployment" className="scroll-mt-20">
            <SectionTitle
              title="Deployment"
              description="Vercel serves the app and route handlers. Supabase owns metadata, auth, Edge workers, queues, and cron."
            />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <DocFact icon={KeyRound} label="OAuth" value="Supabase + VAFS scopes" />
              <DocFact icon={GitPullRequestArrow} label="Writes" value="Branch + PR" />
              <DocFact icon={Braces} label="API" value="Next route handlers" />
              <DocFact icon={Code2} label="Skills" value="packages/skills" />
            </div>
            <div className="mt-4 rounded-lg border bg-white p-5">
              <p className="text-sm font-medium">Scopes</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {vafsProductContract.scopes.map((scope) => (
                  <Badge key={scope} variant="outline">
                    {scope}
                  </Badge>
                ))}
              </div>
            </div>
          </section>
        </article>
      </div>
    </main>
  )
}

function SectionTitle({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div>
      <h2 className="font-heading text-2xl font-semibold tracking-normal">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
        {description}
      </p>
    </div>
  )
}

function DocFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FolderGit2
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <Icon className="size-5 text-zinc-700" aria-hidden="true" />
      <p className="mt-3 text-xs font-medium uppercase text-zinc-500">
        {label}
      </p>
      <p className="mt-1 font-heading text-base font-medium">{value}</p>
    </div>
  )
}
