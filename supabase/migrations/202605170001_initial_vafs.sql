create extension if not exists pgcrypto;

create table if not exists public.vafs_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  github_login text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vafs_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  type text not null check (type in ('personal', 'company')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vafs_workspace_members (
  workspace_id uuid not null references public.vafs_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.vafs_repo_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.vafs_workspaces(id) on delete cascade,
  provider text not null default 'github',
  kind text not null check (kind in ('personal', 'company')),
  owner text not null,
  name text not null default 'agents-fs',
  full_name text not null,
  default_branch text not null default 'main',
  installation_id bigint,
  html_url text,
  status text not null default 'missing'
    check (status in ('connected', 'missing', 'creating', 'syncing', 'error')),
  last_commit_sha text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, kind)
);

create table if not exists public.vafs_oauth_clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.vafs_workspaces(id) on delete cascade,
  name text not null,
  client_id text not null unique,
  client_secret_hash text not null,
  redirect_uris text[] not null,
  allowed_scopes text[] not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.vafs_oauth_grants (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.vafs_oauth_clients(id) on delete cascade,
  workspace_id uuid not null references public.vafs_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scopes text[] not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.vafs_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.vafs_workspaces(id) on delete cascade,
  repo_connection_id uuid not null references public.vafs_repo_connections(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),
  trigger text not null check (trigger in ('manual', 'github_webhook', 'cleanup_agent', 'cron')),
  changed_files integer not null default 0,
  indexed_chunks integer not null default 0,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.vafs_index_manifests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.vafs_workspaces(id) on delete cascade,
  repo_connection_id uuid not null references public.vafs_repo_connections(id) on delete cascade,
  source_commit_sha text not null,
  vector_namespace text not null,
  file_count integer not null,
  chunk_count integer not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, source_commit_sha)
);

create table if not exists public.vafs_cleanup_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.vafs_workspaces(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'pr_opened', 'failed')),
  objective text not null,
  source_paths text[] not null default '{}',
  branch_name text not null,
  pull_request_url text,
  proposed_changes jsonb not null default '[]'::jsonb,
  trace jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vafs_audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.vafs_workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  event_type text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.vafs_profiles enable row level security;
alter table public.vafs_workspaces enable row level security;
alter table public.vafs_workspace_members enable row level security;
alter table public.vafs_repo_connections enable row level security;
alter table public.vafs_oauth_clients enable row level security;
alter table public.vafs_oauth_grants enable row level security;
alter table public.vafs_sync_jobs enable row level security;
alter table public.vafs_index_manifests enable row level security;
alter table public.vafs_cleanup_runs enable row level security;
alter table public.vafs_audit_events enable row level security;

create or replace function public.vafs_is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vafs_workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
  );
$$;

create policy "profiles_self_read"
on public.vafs_profiles for select
using (id = auth.uid());

create policy "workspaces_member_read"
on public.vafs_workspaces for select
using (public.vafs_is_workspace_member(id));

create policy "members_member_read"
on public.vafs_workspace_members for select
using (public.vafs_is_workspace_member(workspace_id));

create policy "repo_connections_member_read"
on public.vafs_repo_connections for select
using (public.vafs_is_workspace_member(workspace_id));

create policy "sync_jobs_member_read"
on public.vafs_sync_jobs for select
using (public.vafs_is_workspace_member(workspace_id));

create policy "index_manifests_member_read"
on public.vafs_index_manifests for select
using (public.vafs_is_workspace_member(workspace_id));

create policy "cleanup_runs_member_read"
on public.vafs_cleanup_runs for select
using (public.vafs_is_workspace_member(workspace_id));

create policy "audit_events_member_read"
on public.vafs_audit_events for select
using (public.vafs_is_workspace_member(workspace_id));
