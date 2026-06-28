# Halo

Halo is an invite-only Cloudflare Worker PWA for Oura HRV trends and a daily 3-minute psychomotor vigilance test.

Read [SPEC.md](./SPEC.md) before implementing. It is the source of truth for product behavior, architecture, data model, UI, and tests.

## Deployment Target

- Production URL: `https://halo.gratis.sh`
- Runtime: Cloudflare Worker with static assets
- Database: Cloudflare D1 database `halo`
- Deployment: GitHub Actions using Wrangler
- Contact/entity for legal pages: `mentor@palokaj.co`, `MMOH`

## Current App Surface

- Invite-gated Oura OAuth authorization-code login.
- Server-side Oura token storage, refresh, identity lookup, and sleep sync.
- Dashboard for latest average HRV, max sleeping HRV, today's PVT, and 7/30/90/365 baselines.
- 3-minute PVT-B style test with raw trials, invalidation, and deterministic v1 scoring.
- PWA install/offline/update controls.
- Short `/privacy` and `/tos` pages.

## Local Development

Use Node.js 24.

```bash
npm install
npm run db:migrate
npm run dev
```

Local app URL:

```text
http://localhost:8787
```

Run checks:

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

## Required API Keys And Secrets

### Oura

Create an Oura API application for Halo.

Needed values:

- `OURA_CLIENT_ID`
- `OURA_CLIENT_SECRET`

Requested OAuth scope:

- `daily email`

Redirect URIs to add in the Oura developer portal:

```text
https://halo.gratis.sh/auth/oura/callback
http://localhost:8787/auth/oura/callback
```

Oura redirect URIs must match exactly. Localhost does not work automatically; add the localhost URI when local OAuth testing is needed.

### Cloudflare

Needed GitHub Actions secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Recommended token: Cloudflare's "Edit Cloudflare Workers" template, scoped to the account and the `gratis.sh` zone.

Minimum custom permissions:

- Account: `Workers Scripts Edit`
- Account: `D1 Edit`
- Account: `Account Settings Read`
- User: `User Details Read`
- Zone `gratis.sh`: `Workers Routes Edit`
- Zone `gratis.sh`: `DNS Write`, only if the implementation will create or update the `halo.gratis.sh` DNS record

Runtime Worker secrets:

- `OURA_CLIENT_ID`
- `OURA_CLIENT_SECRET`
- `INVITE_CODE`
- `SESSION_SECRET`

Local `.env` values:

```bash
OURA_CLIENT_ID=
OURA_CLIENT_SECRET=
INVITE_CODE=
SESSION_SECRET=
CLOUDFLARE_ACCOUNT_ID=
```

Use `wrangler secret put` for production runtime secrets. Do not commit `.env`.

## Implementation Checklist

1. Scaffold a JavaScript React/Vite Cloudflare Worker app.
2. Add `.nvmrc` with Node.js 24.
3. Install the Airier lint scaffold.
4. Install required app dependencies from `SPEC.md`.
5. Configure PWA install/offline/update behavior.
6. Create D1 migrations for users, Oura connections, sleep nights, PVT sessions/trials, and sync events.
7. Implement invite-gated Oura OAuth code flow.
8. Implement on-open Oura sync from `/v2/usercollection/sleep`.
9. Implement HRV average/max sleeping HRV calculations.
10. Implement rolling 7/30/90/365 calendar-day baseline comparisons and z-score color bands.
11. Implement 3-minute PVT-B with strict invalidation rules.
12. Implement dashboard, history states, `/privacy`, and `/tos`.
13. Add E2E coverage for the invite gate, OAuth state, dashboard calculations, PVT scoring/invalidation, and legal routes.
14. Configure `wrangler.jsonc` so `assets.not_found_handling` is `single-page-application` and `assets.run_worker_first` includes `/api/*`, `/auth/oura/*`, and `/logout`.
15. Configure GitHub Actions to apply remote D1 migrations before deploy.
16. Configure GitHub Actions to deploy with Wrangler on push.

The production deploy job must run migrations before deploying the Worker:

```bash
npm run db:migrate:remote
npm run deploy
```

Use the actual D1 database name if it differs from `halo`.

## Notes For The Implementer

Store only the Oura fields needed for Halo's dashboard and recomputation, not whole unrelated Oura documents. Keep Oura tokens server-side and never expose them to the browser.

The app should remain sober and operational: no medical claims, no advice engine, no notifications in v1.
