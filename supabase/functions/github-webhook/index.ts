type WebhookPayload = {
  repository?: {
    full_name?: string
    default_branch?: string
  }
  installation?: {
    id?: number
  }
  after?: string
}

Deno.serve(async (request) => {
  const signature = request.headers.get("x-hub-signature-256")
  const event = request.headers.get("x-github-event")
  const payload = (await request.json()) as WebhookPayload

  if (!signature) {
    return Response.json({ error: "missing_signature" }, { status: 401 })
  }

  return Response.json({
    queued: true,
    event,
    repo: payload.repository?.full_name,
    installationId: payload.installation?.id,
    after: payload.after,
    next: "Verify signature, resolve repo connection, enqueue vafs_sync_jobs.",
  })
})
