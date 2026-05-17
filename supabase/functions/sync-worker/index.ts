type SyncJobRequest = {
  jobId: string
  workspaceId: string
  repoConnectionId: string
}

Deno.serve(async (request) => {
  const body = (await request.json()) as SyncJobRequest

  return Response.json({
    jobId: body.jobId,
    workspaceId: body.workspaceId,
    repoConnectionId: body.repoConnectionId,
    status: "accepted",
    next: [
      "Fetch changed files from GitHub App installation token.",
      "Chunk markdown by headings and frontmatter.",
      "Upsert chunks into S3 Vectors.",
      "Write vafs_index_manifests and audit events.",
    ],
  })
})
