type CleanupRequest = {
  cleanupRunId: string
  workspaceId: string
  objective: string
}

Deno.serve(async (request) => {
  const body = (await request.json()) as CleanupRequest

  return Response.json({
    cleanupRunId: body.cleanupRunId,
    workspaceId: body.workspaceId,
    objective: body.objective,
    status: "accepted",
    writePolicy: "branch_and_pull_request",
    next: [
      "Run OpenAI Agents SDK cleanup workflow.",
      "Compile raw material into canonical AFS paths.",
      "Push branch through GitHub App.",
      "Open pull request and enqueue sync after branch push.",
    ],
  })
})
