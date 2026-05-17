# VAFS CLI
Last updated: 2026-05-17

Use CLI when working from a trusted local machine or when local shell/rg retrieval is required.

```bash
vafs health
vafs workspaces
vafs search "query" --workspace ws_personal_alvaro
vafs get ws_personal_alvaro knowledge/page.md
vafs raw upload ws_personal_alvaro note.md "content"
vafs sync ws_personal_alvaro
vafs cleanup ws_personal_alvaro "objective"
```
