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
  sourcePath: "/Users/alvarovillalba/Desktop/afs",
  version: "0.1.0-draft",
  lastUpdated: "2026-05-17",
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
          "Brief dated logs for meaningful changes, actions, decisions, and status updates.",
      },
      {
        path: "/lessons/",
        label: "Lessons",
        description:
          "Reusable lessons learned from experience, especially implementation and workflow lessons.",
      },
      {
        path: "/items/",
        label: "Items",
        description:
          "Durable facts about the user, company, customers, environments, priorities, or reusable context.",
      },
      {
        path: "/fixes/",
        label: "Fixes",
        description:
          "Reusable error solutions and debugging resolutions from problems that were actually fixed.",
      },
      {
        path: "/steers/",
        label: "Steers",
        description:
          "Traces of agent work redirected by a human or secondary model, including what changed.",
      },
      {
        path: "/models/",
        label: "Models",
        description:
          "Short reasoning-state logs: decisions made, problems encountered, and goals set.",
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
      "Work products, raw material, plans, specs, sources, generated libraries, and domain-specific operating surfaces.",
    paths: [
      {
        path: "/audits/",
        label: "Audits",
        description:
          "Comprehensive reports and analytical audits, usually organized in timestamp folders.",
      },
      {
        path: "/raw/",
        label: "Raw",
        description:
          "Unprocessed material waiting to be promoted into knowledge or another canonical destination.",
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
          "Implementation plans and plan-driven development artifacts.",
      },
      {
        path: "/specs/",
        label: "Specs",
        description:
          "Living desired-state documentation with acceptance criteria and constraints.",
      },
      {
        path: "/sources/",
        label: "Sources",
        description:
          "URL-based sources to monitor and mine for high-quality additions.",
      },
      {
        path: "/lib/",
        label: "Library",
        description:
          "Reusable generated content, drafts, registries, templates, and support artifacts.",
      },
      {
        path: "/objects/<type>/",
        label: "Objects",
        description:
          "Structured object records such as clients, employees, vendors, accounts, or projects.",
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
        path: "/references/",
        label: "References",
        description: "Stable code, URL, API, schema, and factual references.",
      },
      {
        path: "/cookbook/",
        label: "Cookbook",
        description:
          "Technical guides for how something is actually done in a codebase or operating system.",
      },
      {
        path: "/knowledge/",
        label: "Knowledge",
        description:
          "Timeless maintained knowledge compiled from raw material, decisions, and sources.",
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
          "Continuous research about engineering, markets, business areas, or open questions.",
      },
      {
        path: "/official-documentation/",
        label: "Official Documentation",
        description:
          "External provider documentation preserved as a stable reference.",
      },
      {
        path: "/context/",
        label: "Context",
        description:
          "Contextual docs such as VALUES.md, USER.md, PREFERENCES.md, goals, budget, and roadmap.",
      },
    ],
  },
]

export const afsRootFiles: AfsRootFile[] = [
  {
    file: "BRAIN.md",
    label: "Brain",
    description: "Decides how the AFS should be managed.",
  },
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
    description: "Defines general operating rules for AI agents working in the workspace.",
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
    file: "FRICTION.md",
    label: "Friction",
    description: "Documents adoption barriers, inefficiencies, complaints, and pain.",
  },
  {
    file: "PREDICTION.md",
    label: "Prediction",
    description: "Captures expected future risks, opportunities, and product bets.",
  },
  {
    file: "REGRESSIONS.md",
    label: "Regressions",
    description: "Tracks recurring bugs, fragile assumptions, and regression traps.",
  },
  {
    file: "HEARTBEAT.md",
    label: "Heartbeat",
    description: "Defines recurring status, active priorities, blockers, and health checks.",
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
    path: "BRAIN.md",
    title: "Brain",
    description: "Workspace management contract for this AFS repository.",
    content: `# BRAIN.md
Last updated: 2026-05-17

This repository is an AFS-compliant agents-fs workspace.

## Operating Rules
- Search canonical knowledge before raw sources.
- Put unprocessed inputs in raw/.
- Promote durable knowledge into knowledge/, references/, runbooks/, or another canonical path.
- Preserve source references and dates when compiling knowledge.
- Cleanup agents must write through a branch and pull request.
`,
  },
  {
    path: "README.md",
    title: "agents-fs",
    description: "Repository entrypoint for humans and agents.",
    content: `# agents-fs
Last updated: 2026-05-17

This repository stores AFS-compatible knowledge for a user or workspace.
It is the source of truth for vAFS; Supabase stores metadata only.
`,
  },
  {
    path: "knowledge/README.md",
    title: "Knowledge",
    description: "Canonical durable knowledge compiled from raw inputs.",
    content: `# Knowledge
Last updated: 2026-05-17

Keep durable, current, reusable knowledge here. Prefer updating an existing page over creating duplicates.
`,
  },
  {
    path: "raw/README.md",
    title: "Raw",
    description: "Inbox for unprocessed sources.",
    content: `# Raw
Last updated: 2026-05-17

Store unprocessed uploads, transcripts, notes, files, and links here until they are compiled into canonical knowledge.
`,
  },
  {
    path: "logs/2026/2026-05-17/bootstrap.md",
    title: "Bootstrap Log",
    description: "Initial vAFS bootstrap log.",
    content: `# Bootstrap Log
Last updated: 2026-05-17

- Created agents-fs from the vAFS template.
- Next action: connect sync and run the first index job.
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
