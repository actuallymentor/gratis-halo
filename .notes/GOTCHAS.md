# Gotchas

Load before touching Worker config, OAuth, D1, lint, or browser automation.

- The Oura provider name is spelled Oura in implementation and docs, even if a prompt says Aura.
- Local OAuth and local app testing both need port `8787`; do not keep noVNC on that port once browser login is complete.
- The logged-in Oura browser profile currently lives at `/tmp/halo-oura-browser/profile` for this container session.
- Cloudflare local dev can load secrets from `.env`; do not add a `.dev.vars` file unless you intend to stop `.env` loading.
- Airier's core `indent` ESLint rule crashes on the current stack, so `eslint.config.js` disables only that rule while keeping the rest of Airier.
- `use-query-params` works through the window adapter here; the React Router adapter expects `react-router-dom` exports that are not present in this app setup.
- Import `mentie/modules/logging.js` for logging; importing from `mentie` root pulls helper modules that break Worker/client bundles.
