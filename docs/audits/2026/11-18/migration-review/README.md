# Existing scaffold review corrections

The three recorded [PR #1](https://github.com/alvarovillalbaa/vafs/pull/1)
findings have four [failing baseline cases](baseline.json): two arbitrary-owner
proposal kinds, root PRODUCT classification, and literal Markdown path markers.

The generic scaffold now requires its own owner to select and verify a private
Drive destination. It supplies no tenant account. The PRODUCT demo record is
classified as root through both get and search. Placeholder paths in generated
Markdown are inline code; runtime strings and all eight exported files remain
byte-identical. React catalog path values already render inside code elements
and retain their actual values.

Before base reconciliation, the [focused consumer check](../../10-10/check-template-consumer.mjs) passed
actual proposal, discovery, get and search consumers plus all four regressions.
These are existing pure historical mock functions, not live integrations or
repository creation. The existing route/presence validator and whitespace checks
also pass. Node's existing MODULE_TYPELESS_PACKAGE_JSON warning remains; package
settings and dependencies were not changed.

[Canonical validation](canonical-validation.json) uses the exact published AFS
commit `4935baf22571bae68caf4318843e4c1164a8c22d`. Application docs and standalone
scaffold profiles pass with 17 and 16 optional warnings; empty folders were not
created to silence them. All three original template-guide hashes match the
original Git blobs. No user raw artifact was removed by this migration.

The [GitHub GFM check](github-render-verification.json) verifies that three path
markers, invisible in the original rendered prose, now appear as literal code in
the two Markdown assets. It does not establish browser or app rendering.
The [verification receipt](verification.json) binds the checked source bytes.
[Five read-only review lenses](peer-review.json) found no actionable defects;
the final claim-accuracy pass also checks this audit, provenance and log.

## Reconciliation with current main

The PR metadata reported its old base `1f243e4`, but direct branch inspection
found `55eb26c` and 21 accepted intervening commits. Git confirmed the resulting
divergence. A normal merge resolves only AGENTS/README conflicts while retaining
the accepted local reader/MCP profile and its original evidence. The catalogue
and historical hosted prototype remain distinct from that accepted local reader.

The [preservation record](base-reconciliation.json) verifies all 73 other upstream
changed files byte for byte, including every failure receipt and all CLI/MCP code.
The seven prior checked-source hashes remain unchanged. That prior consumer
proof therefore applies to the historical scaffold modules; it does not test the
newer local-reader/MCP code. No additional local consumer, index or MCP tests ran.
The accepted profile's local source/static-only gates remain in force.

The [final reconciliation check](base-reconciliation-final.json) preserves the
upstream profile and local-reader README blocks exactly. The proposed diff
against current main passes whitespace checks. The full staged merge reports
20 inherited trailing-space findings in two original job logs; those files are
byte-identical to upstream and were not reformatted. This limitation is retained,
rather than represented as a clean full staged check.
[Five fresh-base static review lenses](fresh-base-peer-review.json) found no
actionable defects in the reconciled patch and preservation claims.

The virtual filesystem layer remains cancelled. This is maintenance of its
existing AFS catalog and export scaffold. No Next API, access control, runtime
integration, dependency, infrastructure, database, build, server or production
change is included. Local Next guides are absent; the refreshed official guide
is newer than the pinned package and is not version-specific runtime proof.
