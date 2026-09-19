# Local repository intelligence

This directory runs Terrain and Litho as local development tools. The Next.js application does not import them, and deployment ignore files exclude the tooling and all generated state.

## Approved provider policy

Litho is locked to Google's native Gemini provider with `gemini-3.5-flash-lite` for both efficient and powerful model slots. There is no cross-model or cross-provider fallback. The policy is stored in `provider-policy.json`; no credential is stored there or in `litho.toml`.

At launch, the helper reads the existing server-side `GOOGLE_API_KEY` from the process, `.env.local`, or `.env`. It exposes the same value to the Litho child process as `LITHO_LLM_API_KEY`, then restores the parent environment. The value is never passed as a command argument or written to logs, generated documents, runtime configuration, or Git.

## Commands

Run from the repository root:

```powershell
pwsh tools/repository-intelligence/repo-intel.ps1 status
pwsh tools/repository-intelligence/repo-intel.ps1 build-terrain-core
pwsh tools/repository-intelligence/repo-intel.ps1 terrain-scan
pwsh tools/repository-intelligence/repo-intel.ps1 terrain-refresh
pwsh tools/repository-intelligence/repo-intel.ps1 terrain-overview
pwsh tools/repository-intelligence/repo-intel.ps1 terrain-freshness
pwsh tools/repository-intelligence/repo-intel.ps1 terrain-grep -Query "spendCredits"
pwsh tools/repository-intelligence/repo-intel.ps1 litho-smoke
pwsh tools/repository-intelligence/repo-intel.ps1 terrain-litho-smoke
```

`terrain-litho-smoke` indexes a synthetic fixture, selects targeted context through Terrain, and asks Litho to generate architecture, C4-style Mermaid, and SQL ERD documentation. It sends no website source.

`terrain-litho` is the bounded real-repository action. It stages only its explicit allowlist and requires deliberate invocation. It does not run during application requests, builds, tests, deployment, or ordinary Terrain searches.

## Cost and cache controls

- Terrain's provider-free core bridge performs local indexing, search, overview, and freshness checks.
- Litho receives a small staged subset rather than the repository root.
- The subset fingerprint includes file hashes, Terrain context, and provider policy.
- A successful fingerprint writes `run-metadata.json`; unchanged runs return it without an API call.
- Litho's prompt cache is persistent under `.repository-intelligence/litho/cache`.
- Dependencies, build output, `.next`, generated files, media, secrets, and caches are excluded.

All indexes, binaries, runtime configs, logs, caches, fixtures, and generated documentation live under ignored `.repository-intelligence` or `.terrain` paths.

## Local source trees

- Terrain: `E:\saad-agent\release-production-v4\terrain-main\terrain-main`
- Litho: `E:\saad-agent\release-production-v4\deepwiki-rs-main\deepwiki-rs-main`

Set `SAAD_TERRAIN_SOURCE`, `SAAD_LITHO_SOURCE`, or `SAAD_LITHO_BINARY` to use another local checkout. Missing tools or credentials fail only the helper and cannot block the website.
