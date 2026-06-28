# Gotchas

Load before touching Worker config, OAuth, D1, lint, or browser automation.

- The Oura provider name is spelled Oura in implementation and docs, even if a prompt says Aura.
- Local OAuth and local app testing both need port `8787`; do not keep noVNC on that port once browser login is complete.
- The logged-in Oura browser profile should be restored from ignored workspace cache `.browser-profile/oura` to `/tmp/halo-oura-browser/profile` when a new container session starts.
- Cloudflare local dev can load secrets from `.env`; do not add a `.dev.vars` file unless you intend to stop `.env` loading.
- Local D1 state is keyed by the configured D1 database ID under `.wrangler/state`; after changing `wrangler.jsonc` from a placeholder DB ID to the real DB ID, run `npm run db:migrate` again or invite verification fails before checking the code.
- Oura redirect URIs are exact-origin matches. Local browser testing should use `http://localhost:8787`, not `http://127.0.0.1:8787`, unless that exact redirect URI is also registered in Oura.
- Local invite rate limiting hashes all requests without Cloudflare IP headers to a single `local` identity, so repeated bad local attempts can temporarily block a correct invite code with `rate_limited`.
- Airier's core `indent` ESLint rule crashes on the current stack, so `eslint.config.js` disables only that rule while keeping the rest of Airier.
- `use-query-params` works through the window adapter here; the React Router adapter expects `react-router-dom` exports that are not present in this app setup.
- Import `mentie/modules/logging.js` for logging; importing from `mentie` root pulls helper modules that break Worker/client bundles.
