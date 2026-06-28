# Timeline

Load when reconstructing decisions around Halo planning documents.

- 2026-06-28: Read `RAMBLE.md`, researched Oura OAuth/API, Cloudflare Worker deployment, PVT implementation, and HRV z-score sanity checks.
- 2026-06-28: User confirmed Halo runs at `https://halo.gratis.sh` as a Cloudflare Worker and is a private beta gated by an environment invite code.
- 2026-06-28: Created implementation-ready `SPEC.md` and setup/deployment `README.md`.
- 2026-06-28: Added `CHANGELOG.md` for the new planning documentation.
- 2026-06-28: Applied fallback phone-a-friend review fixes for Worker routing, D1 migrations, Oura identity, baseline windows, and PVT scoring.
- 2026-06-28: Applied second fallback review fixes for SPA fallback, identity uniqueness, and PVT aggregate definitions.
- 2026-06-28: Implemented Halo as a React/Vite Cloudflare Worker PWA with invite-gated Oura OAuth, D1 schema, Oura sleep sync, HRV baselines, PVT capture/scoring, legal routes, tests, CI, and production deployment to `halo.gratis.sh/*`.
- 2026-06-28: Created remote Cloudflare D1 database `halo`, applied initial migrations, set Worker secrets, and verified production `/api/me`, `/privacy`, and invite-to-Oura redirect.
- 2026-06-28: Diagnosed `mentorwelcomesyou` local invite failure as an unmigrated local D1 namespace after the real D1 ID replaced the placeholder; applied the local migration and added visible invite/OAuth login error feedback.
- 2026-06-28: Ran the full production browser flow through invite, Oura consent, callback, real dashboard sync, and a completed 180-second PVT; fixed service-worker interception of OAuth start/callback and persisted the authenticated browser profile in ignored workspace cache.
