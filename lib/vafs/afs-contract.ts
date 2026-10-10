import { vafsScopes } from "@/lib/vafs/types"

export type AfsPath = {
  path: string
  label: string
  description: string
}

export type AfsPathGroup = {
  id: "memory" | "operational" | "truth"
  title: string
  summary: string
  paths: AfsPath[]
}

export type AfsRootFile = {
  file: string
  label: string
  description: string
}

export type TemplateFile = {
  path: string
  title: string
  description: string
  content: string
}

export const afsStandard = {
  name: "Agentic FileSystem",
  shortName: "AFS",
  sourcePath: "https://github.com/alvarovillalbaa/afs",
  version: "2026-10-10",
  lastUpdated: "2026-10-10",
} as const

export const afsPathGroups: AfsPathGroup[] = [
  {
    id: "memory",
    title: "Memory",
    summary:
      "Durable history, facts, lessons, fixes, steering traces, and reflections that help agents improve across sessions.",
    paths: [
      {
        path: "/logs/",
        label: "Logs",
        description:
          "At most two lines per change under YYYY/MM-DD/, including actions, patterns, status, and friction.",
      },
      {
        path: "/lessons/<domain>/",
        label: "Lessons",
        description:
          "Lessons grounded in experience, organized by domain and YYYY/MM-DD/.",
      },
      {
        path: "/facts/<domain>/",
        label: "Facts",
        description:
          "Living, source-backed facts organized by domain without dated directories.",
      },
      {
        path: "/fixes/",
        label: "Fixes",
        description:
          "Actual errors, solutions, and regression-prevention evidence under YYYY/MM-DD/.",
      },
      {
        path: "/steers/",
        label: "Steers",
        description:
          "Traces of agent work redirected by a human or secondary model, including what changed.",
      },
      {
        path: "/decisions/",
        label: "Decisions",
        description:
          "Brief living decisions and rationale; canonical goals remain in Notion.",
      },
      {
        path: "/reflections/",
        label: "Reflections",
        description:
          "Detailed reflections based on recurring project, workflow, platform, or agent behavior.",
      },
    ],
  },
  {
    id: "operational",
    title: "Operational",
    summary:
      "Dated work products, living human-owned specifications, generated libraries, and domain-specific surfaces.",
    paths: [
      {
        path: "/audits/",
        label: "Audits",
        description:
          "Comprehensive reports and analytical audits under YYYY/MM-DD/.",
      },
      {
        path: "<domain>/<folder>/",
        label: "Domain folders",
        description:
          "Domain-specific surfaces such as health, investing, sales, or operations when needed.",
      },
      {
        path: "/plans/",
        label: "Plans",
        description:
          "Implementation plans under YYYY/MM-DD/.",
      },
      {
        path: "/specs/",
        label: "Specs",
        description:
          "Living, mainly human-defined desired state; agents propose changes under task authority.",
      },
      {
        path: "/lib/",
        label: "Library",
        description:
          "Generated content, drafts, and support artifacts; templates sit beside the content they generate.",
      },
      {
        path: "/objects/<type>/",
        label: "Objects",
        description:
          "Structured object records such as clients, employees, vendors, accounts, or projects.",
      },
      {
        path: "/results/",
        label: "Results",
        description: "Preserved work outputs under YYYY/MM-DD/.",
      },
    ],
  },
  {
    id: "truth",
    title: "Source of Truth",
    summary:
      "Living documentation that represents current canonical understanding of a user, company, codebase, and workflows.",
    paths: [
      {
        path: "/REFERENCES.md",
        label: "References",
        description: "One reference catalog linking source and technical owner guides.",
      },
      {
        path: "/cookbooks/",
        label: "Cookbooks",
        description:
          "Technical guides for how something is actually done in a codebase or operating system.",
      },
      {
        path: "/knowledge/",
        label: "Knowledge",
        description:
          "Unique generalized knowledge and perspectives with provenance; excludes copied material and operational definitions.",
      },
      {
        path: "/runbooks/",
        label: "Runbooks",
        description:
          "Operational procedures for known repeatable work.",
      },
      {
        path: "/research/",
        label: "Research",
        description:
          "Living units with ordered questions, hypotheses, reasoning, method, evidence, and status.",
      },
      {
        path: "/SOURCES.md",
        label: "Sources",
        description:
          "Source identity, URLs, capture status, verified private Drive artifacts, and compiled destinations.",
      },
      {
        path: "/GAPS.md",
        label: "Gaps",
        description:
          "Unresolved understanding with impact, owner when known, and resolution evidence.",
      },
    ],
  },
]

export const afsRootFiles: AfsRootFile[] = [
  {
    file: "MEMORY.md",
    label: "Memory Rules",
    description: "Defines how memory should be captured, promoted, and maintained.",
  },
  {
    file: "PLAYBOOK.md",
    label: "Playbook",
    description: "Defines decision frameworks and repeatable operating patterns.",
  },
  {
    file: "AGENTS.md",
    label: "Agent Rules",
    description: "Owns operating rules, AFS management, source priority, and verification.",
  },
  {
    file: "PLAN.md",
    label: "Planning",
    description: "Defines how planning should be done and tracked.",
  },
  {
    file: "SPEC.md",
    label: "Specifications",
    description: "Defines how specs should be written and validated.",
  },
  {
    file: "SOUL.md",
    label: "Agent Style",
    description: "Defines personality, attitude, and behavioral style for agents.",
  },
  {
    file: "USER.md",
    label: "User Context",
    description: "Stores reusable user preferences, goals, and constraints.",
  },
  {
    file: "DESIGN.md",
    label: "Design System",
    description: "Defines design principles, layout patterns, and interaction rules.",
  },
  {
    file: "PRODUCT.md",
    label: "Product",
    description: "Defines the product, audience, use cases, and boundaries.",
  },
  {
    file: "COMPANY.md",
    label: "Company",
    description: "Defines company context, mission, operating principles, and priorities.",
  },
  {
    file: "VALUES.md",
    label: "Values",
    description: "Defines values for the company, user, product, and codebase.",
  },
  {
    file: "ICP.md",
    label: "Ideal Customer",
    description: "Defines target segments, buyer personas, pains, and fit criteria.",
  },
  {
    file: "VOICE.md",
    label: "Voice",
    description: "Defines communication style, tone, vocabulary, and messaging patterns.",
  },
  {
    file: "HEARTBEAT.md",
    label: "Heartbeat",
    description: "Defines recurring status, active priorities, blockers, and health checks.",
  },
  {
    file: "ROADMAP.md",
    label: "Roadmap",
    description: "Direction and sequencing linked to canonical Notion goals.",
  },
  {
    file: "TASTE.md",
    label: "Taste",
    description: "Judgment, quality examples, preferences, and anti-patterns.",
  },
  {
    file: "BEHAVIOR.md",
    label: "Behavior",
    description: "Agent action, stopping, collaboration, and escalation rules.",
  },
  {
    file: "IEP.md",
    label: "Ideal Employee",
    description: "Employee capabilities, values, and non-fit.",
  },
  {
    file: "REFERENCES.md",
    label: "References",
    description: "One reference catalog with labeled source and owner-guide links.",
  },
  {
    file: "SOURCES.md",
    label: "Sources",
    description: "Provenance, monitoring, capture status, and verified Drive artifact links.",
  },
  {
    file: "GAPS.md",
    label: "Gaps",
    description: "Unresolved understanding, impact, and resolution evidence.",
  },
]

export const retrievalModes = [
  "metadata",
  "bm25",
  "s3_vectors",
  "rerank",
  "local_rg",
] as const

export const agentsFsTemplateFiles: TemplateFile[] = [
  {
    path: "AGENTS.md",
    title: "Agent Rules",
    description: "Workspace operating rules and AFS management.",
    content: `# AGENTS.md
Last updated: 2026-10-10

This repository is an AFS-compatible agents-fs workspace.

## Operating Rules

- Search maintained knowledge and its references before consulting source artifacts.
- Preserve source identity, URLs, dates, status, and authors when available in SOURCES.md.
- Keep raw inputs and copied artifacts in the correct private Google Drive; verify a recoverable copy before removing original bytes.
- Keep unique generalized knowledge and perspectives in knowledge/; operations belong in cookbooks/ or runbooks/.
- Define continuous research in research/<unit>/README.md with ordered questions, hypotheses, reasoning, method, evidence, and status.
- Use YYYY/MM-DD/ for logs, lessons, fixes, audits, plans, and results; each log entry is at most two lines.
- Keep facts/<domain>/, decisions/, specs/, cookbooks/, knowledge/, runbooks/, and research/ living without date directories.
- Folder docs: core README.md/ARCHITECTURE.md/TESTS.md; conditional SETUP.md/CHANGELOG.md/SECURITY.md; rare OVERVIEW.md/FAQ.md/DEPENDENCIES.md. Procedures and decisions use their topic folders, with no folder-level RUNBOOK.md or DECISIONS.md.
- Goals belong in canonical Notion and link from ROADMAP.md; templates stay beside generated content.
- REFERENCES.md catalogs links and owner guides; GAPS.md records unresolved understanding.
- Use branch and pull request writeback when authorized; never infer permission to merge or publish.
`,
  },
  {
    path: "README.md",
    title: "agents-fs",
    description: "Repository entrypoint for humans and agents.",
    content: `# agents-fs
Last updated: 2026-10-10

This repository stores portable AFS instructions, unique knowledge, work history, and provenance. Start with [AGENTS.md](AGENTS.md), then [REFERENCES.md](REFERENCES.md), [SOURCES.md](SOURCES.md), and [GAPS.md](GAPS.md).

[Knowledge](knowledge/README.md) contains generalized synthesis. [Research](research/README.md) explains unit definitions. Raw artifacts belong in private Drive and goals in canonical Notion.
`,
  },
  {
    path: "REFERENCES.md",
    title: "References",
    description: "One catalog of references and owner guides.",
    content: `# References

- [AFS standard](https://github.com/alvarovillalbaa/afs): canonical filesystem contract.
- [Workspace rules](AGENTS.md): source placement and verification.
- [Knowledge](knowledge/README.md): unique generalized synthesis.
- [Research](research/README.md): continuous unit definitions.

Add labeled external references and technical owner-guide links here rather than creating a duplicate reference registry.
`,
  },
  {
    path: "SOURCES.md",
    title: "Sources",
    description: "Source identity, capture status, and verified Drive provenance.",
    content: `# Sources

No external artifacts have been captured by this template. For each source, record origin, original path or URL, date, author when known, capture/ingestion status, verified private Drive artifact, checksums when migrated, and compiled destinations. Preservation does not prove ingestion.

Personal raw material belongs in alvaro.villalbaperez@gmail.com Drive; Clous raw material in avillalba@clous.app Drive. The workspace owner must select and verify the private destination before any source removal. Keep unread or inaccessible URLs visible.
`,
  },
  {
    path: "GAPS.md",
    title: "Gaps",
    description: "Unresolved understanding and resolution evidence.",
    content: `# Gaps

The workspace owner must select the private Drive destination and canonical Notion goal records. This template has not verified those destinations, source artifacts, or ingestion. Record unresolved understanding with impact, owner when known, next action, and evidence needed to resolve it.
`,
  },
  {
    path: "knowledge/README.md",
    title: "Knowledge",
    description: "Unique generalized knowledge and perspectives with provenance.",
    content: `# Knowledge
Last updated: 2026-10-10

Keep unique generalized knowledge, original perspectives, and source-backed synthesis here. Prefer updating an existing page over creating duplicates. Do not mirror online material or define operations; procedures belong in cookbooks/ or runbooks/. Preserve provenance through SOURCES.md and distinguish hypotheses from verified evidence.
`,
  },
  {
    path: "research/README.md",
    title: "Research",
    description: "Continuous research organized by defined units.",
    content: `# Research

Create one living research/<unit>/ folder per accepted topic. Its README.md must define:

- Questions and order: what to investigate and in which sequence.
- Hypotheses: proposed expectations with uncertainty stated.
- Reasoning: motivation and existing evidence.
- Method: scope, evidence criteria, and stopping/review conditions.
- Evidence and status: results, limits, next questions, and owner when known.

Use those five names as section headings. Keep dated observations inside the unit as evidence; do not invent hypotheses, owners, or completed research to fill a template.
`,
  },
  {
    path: "logs/2026/05-17/bootstrap.md",
    title: "Bootstrap Log",
    description: "Illustrative bootstrap journal retaining the original template date.",
    content: `Created an AFS workspace from the exported template.
Record original sources in SOURCES.md before compiling unique synthesis.
`,
  },
]

export const vafsProductContract = {
  sourceOfTruth: "github_agents_fs",
  metadataStore: "supabase",
  vectorStore: "aws_s3_vectors",
  hostedWorkerRuntime: "supabase_edge_functions",
  localShellMode: "cli_mcp_only",
  cleanupWritePolicy: "branch_and_pull_request",
  scopes: vafsScopes,
} as const
