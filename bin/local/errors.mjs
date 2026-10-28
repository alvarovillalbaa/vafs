const codes = new Set([
  "local_root_required", "local_root_invalid", "local_path_invalid", "local_path_outside_root",
  "local_symlink_forbidden", "local_file_unavailable", "local_file_too_large", "local_corpus_too_large",
  "local_invalid_utf8", "local_rg_unavailable", "local_rg_failed", "local_rg_invalid_output", "local_qmd_unavailable",
  "local_qmd_failed", "local_qmd_invalid_output", "local_qmd_collection_invalid", "local_query_invalid", "local_limit_invalid",
  "local_process_missing", "local_process_failed", "local_process_timeout", "local_process_output_limit",
  "local_request_cancelled", "local_index_write_failed", "local_index_exists", "local_index_location_invalid", "local_failed",
]);

export class LocalError extends Error {
  constructor(code) {
    const safe = codes.has(code) ? code : "local_failed";
    super(safe);
    this.name = "LocalError";
    this.code = safe;
  }
}
