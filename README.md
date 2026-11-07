# FolioSpace frontend

This project is a React single-page application built with Vite. `index.html` is
the single HTML shell required to mount React; the website pages and navigation
are React routes under `src/`.

## Run and verify

From this directory:

```powershell
npm install
npm run dev
npm test
npm run build
```

Vite prints the local URL. The FolioSpace landing page is the first page at `/`.
The earlier David KWIZERA portfolio homepage remains available at `/portfolio-home`. Other pages
use clean paths such as `/about`, `/admin/login`, and `/platform/dashboard`.
Older `.html` links redirect to the matching clean path for compatibility.

## Main source areas

- `src/app/` — app bootstrap and the shared route registry.
- `src/pages/` — public portfolio, admin, platform, and public portfolio pages.
- `src/components/` — shared UI components.
- `src/context/` — app-wide state such as language selection.
- `src/services/` — API and browser session helpers.
- `src/styles/` — global styles.
- `src/tests/` — frontend tests.

The backend remains a separate service. The account, payment, and portfolio
services have not been connected yet; do not treat browser-stored setup
progress as a real account or successful payment.

## Frontend review

Vite development uses a local API adapter by default, so frontend navigation
does not contact the backend. Account and subscription progress is saved only
in the current browser. No real payment is taken. To opt into the existing API
during local development, set `$env:VITE_USE_LOCAL_API = "false"` before
starting Vite. Production builds do not enable the local adapter by default.

## Static deployment

Deploy the contents of `dist/`. The build emits one `index.html` app shell,
static assets, and `_redirects` entries for legacy links and SPA fallback.
Configure the static host to serve `/index.html` for clean application routes
and `/u/*` paths while keeping the requested URL. If the host does not consume
the generated `_redirects` file, add an equivalent catch-all rewrite in its
dashboard. Keep the existing `/api/*` rewrite to the backend or configure
`VITE_PORTFOLIO_API_BASE_URL` at build time.

For the current Render static site, add a Rewrite rule with source `/*` and
destination `/index.html` if direct links such as
`/platform/account/overview` return 404.

The production frontend tries the configured or default backend URL before a
same-origin `/api` rewrite. Set `VITE_PORTFOLIO_API_BASE_URL` to the backend's
`https://.../api` URL in the frontend host's build environment when using a
different backend. On the backend host, set `FRONTEND_URL` to the exact deployed
frontend origin (scheme and hostname only, no path or trailing slash) so
credentialed sign-in and signup requests pass CORS. Local `.env` files are not
copied to either hosting provider.
