# Deployment
Last updated: 2026-05-17

## Services

- Vercel: Next app and route handlers.
- Supabase: Auth, Postgres metadata, RLS, Edge Functions, Queues, Cron.
- GitHub: OAuth login, GitHub App installations, webhooks, repo contents, pull requests.
- AWS: S3 Vectors for derived vector chunks.
- OpenAI: Agents SDK cleanup agent.

## Required Setup

1. Create Supabase project and run `supabase/migrations/202605170001_initial_vafs.sql`.
2. Configure GitHub OAuth provider in Supabase Auth.
3. Create GitHub App with repository contents, metadata, pull request, and webhook permissions.
4. Create AWS S3 Vector bucket/index and grant worker credentials.
5. Configure Vercel environment variables from `README.md`.
6. Deploy Supabase Edge Functions:
   - `github-webhook`
   - `sync-worker`
   - `cleanup-agent`
7. Add Supabase Cron jobs for sync queue and cleanup queue draining.

## Hosted Shell Policy

Production workers run in Supabase Edge Functions. They do not run bash or `rg`. Hosted search uses TypeScript keyword search plus S3 Vectors. Real shell/grep retrieval is available only through trusted local CLI/MCP usage.
