# Halo Implementation Specification

This specification is the source of truth for an autonomous implementation agent building Halo from scratch. Prefer direct, working implementation over broad abstraction. Use the owner's existing preferences: Node.js, React, Vite, JavaScript over TypeScript, Cloudflare Workers, code with breathing room, and the sensory design defaults in `~/.agents/preferences/design-preferences.md`.

## Product

Halo is an invite-only progressive web app at `https://halo.gratis.sh`.

It connects to an Oura ring account, syncs overnight HRV data, lets the user complete a daily 3-minute psychomotor vigilance test, and shows a compact dashboard comparing today's measurements against personal rolling baselines.

Halo makes no medical, clinical, research-grade, or fitness-for-duty claims. It displays personal trends and measurements only.

Use "Oura" for the ring/service and "Halo" for this app.

## Platform

- Host as a Cloudflare Worker, not Cloudflare Pages.
- Serve the React/Vite PWA through Worker static assets.
- Store application data in Cloudflare D1.
- Use Cloudflare Worker secrets for production secrets.
- Use a local `.env` for local development values.
- Deploy on push through GitHub Actions with Wrangler.
- Allow the implementation agent to create Cloudflare resources: Worker, D1 database, routes, secrets, and required bindings.
- Configure Worker static assets so the Worker runs before assets for `/api/*`, `/auth/oura/*`, and `/logout`.
  In `wrangler.jsonc`, express this with `assets.run_worker_first`; otherwise an OAuth callback navigation can be swallowed by SPA asset routing.

Example Worker asset routing:

```jsonc
{
    "assets": {
        "directory": "./dist",
        "binding": "ASSETS",
        "run_worker_first": [ "/api/*", "/auth/oura/*", "/logout" ]
    }
}
```

## Stack

- Node.js 24 via `.nvmrc`.
- JavaScript, not TypeScript.
- React in frontend mode.
- Vite for bundling.
- Cloudflare Worker for API and static asset hosting.
- `@cloudflare/vite-plugin` or the current Cloudflare-recommended Worker + Vite integration.
- `react-router` with `BrowserRouter`.
- `vite-plugin-pwa` for installable/offline PWA behavior.
- `styled-components` for styling.
- `zustand` only where shared client state is genuinely needed.
- `use-query-params` for URL state where appropriate.
- `react-hot-toast` for notifications/toasts.
- `mentie` for helpers and logging; use `log` instead of `console.*`.
- Install the Airier lint scaffold in the project root:

```bash
curl -o- https://raw.githubusercontent.com/actuallymentor/airier/main/quickstart.sh | bash
```

## App Routes

- `/` dashboard.
- `/login` invite code + Oura login entry.
- `/auth/oura/start` server route that starts Oura OAuth.
- `/auth/oura/callback` server route that completes Oura OAuth.
- `/test` PVT preflight and running test.
- `/test/results/:session_id` PVT result summary.
- `/privacy` short readable privacy policy.
- `/tos` short readable terms.
- `/logout` clears Halo session.

Because this is a React SPA served by a Worker, route all non-API page requests to the SPA entrypoint while preserving Worker API routes.

## Invite-Only Beta

Halo is private beta.

- Require an invite code before Oura OAuth.
- Store the invite code in `INVITE_CODE`.
- Local development reads `INVITE_CODE` from `.env`.
- Production reads `INVITE_CODE` from a Cloudflare Worker secret.
- Do not store a list of invite codes in v1.
- After a correct invite code, set a short-lived signed pre-auth cookie or equivalent server-side session marker so the user can complete Oura OAuth.
- Rate-limit invite attempts per IP/session enough to prevent casual guessing.

## Authentication

Use Oura OAuth2 authorization-code flow through the Worker.

Do not use Oura's browser-only implicit flow because it does not provide refresh tokens and would force re-authentication after token expiry. Do not expose the Oura client secret to the browser.

### Oura OAuth

Authorize URL:

```text
https://cloud.ouraring.com/oauth/authorize
```

Token URL:

```text
https://api.ouraring.com/oauth/token
```

Registered redirect URIs:

```text
https://halo.gratis.sh/auth/oura/callback
http://localhost:8787/auth/oura/callback
```

Oura requires redirect URIs to match the registered URI exactly. Localhost does not automatically work; add the local redirect URI to the Oura developer application when developing locally.

OAuth request:

- `response_type=code`
- `client_id=OURA_CLIENT_ID`
- `redirect_uri` set explicitly
- `scope=daily email`
- `state` must be random, bound to the pre-auth session, and verified on callback

Minimal scope is `daily email`. `daily` is needed for sleep HRV. `email` is needed because Oura is the account system in v1, and Halo needs a stable identity when a user returns without an existing session.

Do not request `personal`, `heartrate`, `workout`, `tag`, `session`, or `spo2` in v1 unless the implementation proves `daily email` is insufficient.

After OAuth succeeds, create a Halo session. Oura login is the only account system in v1.

After exchanging the authorization code for tokens, immediately fetch identity:

```text
GET https://api.ouraring.com/v2/usercollection/personal_info
```

Use the returned Oura `id` as the primary stable external identity. Store email if returned through the `email` scope.

Upsert the local user by Oura `id`. If Oura does not return an `id`, fall back to normalized email. If neither an `id` nor email is returned, fail the login with a clear re-authentication error because Halo cannot safely link future sessions.

### Token Storage

Store Oura tokens server-side in D1:

- `access_token`
- `access_token_expires_at`
- `refresh_token`
- `granted_scopes`
- `oura_user_id` if available from API data
- `email` if available from Oura
- timestamps for creation/update

Refresh tokens are single-use: every refresh must atomically replace both the access token and refresh token. If refresh fails with invalid/revoked token, mark the Oura connection as needing re-authentication.

For v1, D1 plus Cloudflare platform encryption at rest is acceptable. Keep token access isolated to Worker API modules. Never send Oura tokens to the browser.

## Oura Data Sync

Sync when the user opens Halo or visits the dashboard while authenticated. A scheduled sync is not required in v1.

Use:

```text
GET https://api.ouraring.com/v2/usercollection/sleep?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
```

Handle pagination through `next_token`.

On initial sync, fetch at least the last 400 calendar days so the 365-day comparison can populate. On later syncs, fetch from the day after the latest stored sleep day minus a small overlap of 3 days, because wearable sleep data can be corrected after initial publication.

Respect Oura rate limits and retry headers. Oura documents a V1/V2 limit of 5000 requests per 5-minute period and returns 429 when exceeded.

### Night Definition

Only use Oura sleep records with:

```text
type = long_sleep
```

Exclude naps, late naps, deleted records, and rest records from the nightly HRV dashboard.

### Stored Oura Fields

Store a privacy-minimized subset sufficient for current UI and future recomputation:

- Oura sleep document ID.
- Oura user ID / local user ID.
- `day`.
- `type`.
- `bedtime_start`.
- `bedtime_end`.
- `time_in_bed` if available.
- `average_hrv`.
- `hrv.timestamp`.
- `hrv.interval`.
- `hrv.items`.
- `sleep_phase_5_min` or `app_sleep_phase_5_min` if available.
- `sleep_algorithm_version`.
- sync metadata.

Do not store unrelated Oura fields in v1. This gives the app offline/history benefits, lets max HRV and standard-deviation bands be recomputed, avoids repeat API calls, and keeps health data scope tighter than storing whole raw documents.

### HRV Metrics

For each valid nightly sleep document:

- `average_hrv_ms`: use Oura `average_hrv`.
- `max_sleep_hrv_ms`: compute from non-null `hrv.items` after excluding samples aligned to awake phases.
- If sleep phase alignment is unavailable or ambiguous, compute from all non-null `hrv.items` and mark the row with `max_hrv_filter_quality = unfiltered`.
- If multiple `long_sleep` records exist for one Oura day, choose the longest `time_in_bed` if available; otherwise choose the latest `bedtime_end`.

Oura exposes `average_hrv` but no explicit `max_hrv` field in the current V2 sleep schema, so max HRV is derived.

## Dashboard

The dashboard should be the first real app screen after login. Keep it quiet, dense, and scannable, not a marketing page.

Display:

- Today's Oura sync status.
- Last available night's average HRV.
- Last available night's max sleeping HRV.
- Today's latest PVT score if completed.
- A daily PVT call-to-action if not completed.

For HRV and PVT, compare current value against rolling calendar-day windows:

- 7 days.
- 30 days.
- 90 days.
- 365 days.

Calendar windows mean dates on the calendar, not the last N available measurements. Missing days are ignored in calculations but reflected in sample count.

Exclude the current measurement day from the baseline.

For example, a June 28 HRV value compares against June 21-27 for the 7-day baseline, not June 22-28. This prevents the current value from diluting its own z-score.

For each comparison:

- Show rolling mean.
- Show standard deviation.
- Show current delta.
- Show z-score where possible.
- Show sample count.
- If sample count is below a useful minimum, show the comparison as "building baseline" rather than over-interpreting it.

Recommended minimum samples:

- 7-day window: at least 4 measurements.
- 30-day window: at least 14 measurements.
- 90-day window: at least 30 measurements.
- 365-day window: at least 90 measurements.

## Color Rules

Use individual z-scores against each rolling window:

```text
z = (current_value - rolling_mean) / rolling_standard_deviation
```

For HRV, lower than baseline is usually the concerning direction. Still show positive and negative deviation distinctly so high spikes are visible without implying a medical meaning.

Default bands:

- Green: `abs(z) < 1.0`.
- Orange: `1.5 <= abs(z) < 2.0`.
- Red: `abs(z) >= 2.0`.
- Neutral/amber-light: `1.0 <= abs(z) < 1.5`.

Sanity check: these thresholds are reasonable for a first version. A z-score near 1 is common variation, 1.5 is a moderate deviation, and 2 is uncommon enough to be visually meaningful without over-alerting. Keep the thresholds configurable constants, not hardcoded literals in rendering components. HRV is noisy and individual, so the UI must phrase colors as "outside your usual range," not "good/bad health."

If the rolling standard deviation is zero or the sample count is too low, do not assign green/orange/red.

Use color plus icon/label. Never encode status by color alone.

## PVT Protocol

Use a 3-minute PVT-B style test for daily adherence.

This is a within-person trend tool. Do not compare it to 10-minute PVT norms and do not claim research-grade validity.

### Timing

- Test duration: 3 minutes scored.
- Include a short practice phase before the first scored daily test or whenever the user requests practice.
- Inter-stimulus interval: random 1-4 seconds.
- No-response timeout: 30 seconds, counted as a lapse.
- Use `performance.now()` and event timestamps.
- Schedule stimulus display through `requestAnimationFrame`.
- Use `pointerdown` for touch/mouse and `keydown` for keyboard.
- Avoid `click` for timing.
- Keep the test full-screen or fullscreen-like with one fixed high-contrast target.
- Use the Screen Wake Lock API when available.
- Disable text selection, scrolling, double-tap zoom, and accidental gestures in the test surface.

### Validity

Invalidate the session if any of these occur during scored testing:

- Page/tab loses visibility.
- Browser focus is lost.
- Fullscreen exits if fullscreen was entered.
- Orientation changes.
- Viewport resizes substantially.
- Wake lock fails or is released during the scored phase.
- Main thread stall exceeds a threshold that can distort timing.
- The user leaves the route.

An invalidated session is saved with `status = invalidated`, a reason, device metadata, and no dashboard score.

### PVT Metrics

Store raw trial data and derive metrics from it.

Each trial should store:

- trial number.
- planned stimulus timestamp.
- actual stimulus timestamp.
- response timestamp.
- reaction time in milliseconds.
- whether response was valid.
- false start flag.
- lapse flag.
- device/input metadata.

Scoring:

- Valid response: response after stimulus with RT >= 100 ms.
- False start: response before stimulus or RT < 100 ms.
- Lapse threshold for this 3-minute PVT-B: RT >= 355 ms.
- Also store a secondary `lapses_500_ms` count for easier future comparison.
- No response before timeout counts as a lapse.

Dashboard metrics:

- Simple 0-100 score.
- Mean RT.
- Median RT.
- Lapse count.
- False start count.
- Response speed as mean `1 / RT_seconds`.

Use this exact v1 simple score:

```text
if valid_response_count = 0:
    score = 0
else:
    median_penalty = max(0, median_rt_ms - 250) / 10
    lapse_penalty = lapses_355_ms * 5
    false_start_penalty = false_starts * 3
    variability_penalty = min(20, rt_stddev_ms / 20)
    score = round(clamp(100 - median_penalty - lapse_penalty - false_start_penalty - variability_penalty, 0, 100))
```

Keep the formula in an isolated scoring module with constants for the 250 ms baseline, penalty weights, and caps. The formula is provisional and exists to make v1 deterministic; raw trials remain the source of truth for future scoring changes.

### Device Handling

Allow mobile and desktop.

Record and show the measurement context:

- device category: mobile, tablet, desktop, unknown.
- input type: touch, mouse, keyboard.
- browser and OS from user agent or client hints where available.
- viewport size.
- wake lock support and active state.

In the dashboard/history, mark PVT measurements with an icon for device/input context. Warn gently that trends are most comparable when taken on the same device and input method.

### Daily Guidance

Prompt the user to take PVT 60-90 minutes after waking. Do not implement notifications in v1.

## Data Model

Use migrations. Names below are conceptual; adapt only if implementation constraints require it.

### `users`

- `id`
- `oura_user_id`
- `email`
- `created_at`
- `updated_at`
- `last_login_at`

### `oura_connections`

- `id`
- `user_id`
- `access_token`
- `access_token_expires_at`
- `refresh_token`
- `granted_scopes`
- `needs_reauth`
- `created_at`
- `updated_at`

### `oura_sleep_nights`

- `id`
- `user_id`
- `oura_sleep_id`
- `day`
- `type`
- `bedtime_start`
- `bedtime_end`
- `time_in_bed_seconds`
- `average_hrv_ms`
- `max_sleep_hrv_ms`
- `max_hrv_filter_quality`
- `hrv_sample_interval_seconds`
- `hrv_sample_start`
- `hrv_items_json`
- `sleep_phase_5_min`
- `sleep_algorithm_version`
- `synced_at`
- unique key on `user_id, oura_sleep_id`

### `pvt_sessions`

- `id`
- `user_id`
- `started_at`
- `completed_at`
- `status`
- `invalidated_reason`
- `duration_seconds`
- `device_category`
- `input_type`
- `user_agent`
- `viewport_width`
- `viewport_height`
- `wake_lock_supported`
- `wake_lock_active`
- `score`
- `mean_rt_ms`
- `median_rt_ms`
- `rt_stddev_ms`
- `lapses_355_ms`
- `lapses_500_ms`
- `false_starts`
- `mean_response_speed`

### `pvt_trials`

- `id`
- `session_id`
- `trial_index`
- `planned_stimulus_at_ms`
- `actual_stimulus_at_ms`
- `response_at_ms`
- `reaction_time_ms`
- `valid_response`
- `false_start`
- `lapse_355_ms`
- `lapse_500_ms`

### `sync_events`

- `id`
- `user_id`
- `source`
- `started_at`
- `finished_at`
- `status`
- `records_seen`
- `records_written`
- `error_message`

## API Routes

All API routes return JSON and use consistent error envelopes.

- `GET /api/me`
- `POST /api/invite/verify`
- `POST /api/logout`
- `POST /api/oura/sync`
- `GET /api/dashboard`
- `GET /api/hrv/history`
- `POST /api/pvt/sessions`
- `POST /api/pvt/sessions/:id/trials`
- `POST /api/pvt/sessions/:id/complete`
- `POST /api/pvt/sessions/:id/invalidate`
- `GET /api/pvt/history`

Authenticate all user data routes with a signed, HTTP-only, secure session cookie.

## Privacy And Terms

`/privacy` should be short and readable:

- Halo stores Oura sleep/HRV data needed for the dashboard.
- Halo stores PVT results and trial timing data.
- Halo uses the data only to show the user's dashboard.
- Halo does not sell data.
- Halo does not make medical claims.
- Contact: `mentor@palokaj.co`.
- Entity: `MMOH`.

`/tos` should be short and readable:

- Private beta.
- Use at own discretion.
- Not medical advice.
- No guarantee of uptime or correctness.
- User can stop using the app at any time.
- Contact: `mentor@palokaj.co`.
- Entity: `MMOH`.

No export/delete account UI is required in v1.

## Design

Use the owner's sensory design defaults:

- Accent: `#7ec0d0`.
- Body background: `#fafbfc`.
- Heading font: `"Montserrat Variable", system-ui, -apple-system, "Segoe UI", sans-serif`.
- Body font: `"Nunito Variable", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif`.
- Load Montserrat and Nunito from Google Fonts.

Implementation constraints:

- Quiet operational dashboard, not a landing page.
- Cards only for individual repeated items or clearly framed tool surfaces.
- No decorative orbs/blobs.
- Use icons in buttons and status markers.
- Keep touch targets at least 44-48 px equivalent.
- Keep text within containers at mobile and desktop sizes.
- Use color plus icon/label for status.
- Provide accessible contrast.

PWA requirements:

- Offline shell works.
- Dashboard can show last cached data while offline.
- Install App pill at bottom left, hidden in standalone/PWA mode.
- PWA update badge when `onNeedRefresh` fires.
- Menu includes "Update app" action that clears service worker and reloads.

## Testing

Prefer end-to-end tests.

Minimum verification:

- Invite gate blocks users without the correct invite code.
- Oura OAuth start builds the correct URL and state.
- Oura callback rejects invalid state.
- Dashboard handles no-data, partial-data, and synced-data states.
- HRV rolling windows calculate 7/30/90/365 calendar-day baselines correctly.
- HRV colors follow z-score thresholds and low-sample handling.
- PVT captures valid responses, false starts, lapses, and invalidation.
- PVT invalidates on hidden tab/focus loss.
- `/privacy` and `/tos` render.
- PWA install/update controls render.

For PVT timing tests, use browser-level event simulation where possible. Unit-test pure scoring functions with stored raw trials.

## External References

- Oura authentication: https://cloud.ouraring.com/docs/authentication
- Oura getting started and app limit: https://cloud.ouraring.com/docs/
- Oura V2 OpenAPI schema: https://cloud.ouraring.com/v2/static/json/openapi-1.35.json
- Oura error/rate-limit docs: https://cloud.ouraring.com/docs/error-handling
- Cloudflare React + Vite Workers guide: https://developers.cloudflare.com/workers/framework-guides/web-apps/react/
- Cloudflare Worker static asset routing: https://developers.cloudflare.com/workers/static-assets/routing/worker-script/
- Cloudflare GitHub Actions deployment: https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- Cloudflare D1 migrations: https://developers.cloudflare.com/d1/reference/migrations/
- Cloudflare D1 Wrangler commands: https://developers.cloudflare.com/d1/wrangler-commands/
- Cloudflare API token permissions: https://developers.cloudflare.com/fundamentals/api/reference/permissions/
- PVT-B validation: https://www.med.upenn.edu/uep/assets/user-content/documents/Basner2011-ValidityandsensitivityofabriefPVT.pdf
- PVT-3 vs PVT-10 caution: https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2022.815697/full
- HRV longitudinal interpretation review: https://www.mdpi.com/1424-8220/26/1/3
- HRV z-score sanity reference: https://tryterra.co/research/descriptive-hrv-using-z-scores
