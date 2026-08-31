# ParkingDashboard

Vite + React dashboard for the Singha parking system. Every page reads
**ParkingDashboardAPI** — there is no mock data in this project.

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

The API must be running and must list this origin in `Cors:AllowedOrigins`.

## Configuration — `.env`

| Variable | Purpose |
|---|---|
| `VITE_API_BASE` | The ParkingDashboardAPI for this site, e.g. `http://localhost:5075/api` |
| `VITE_BASE` | Path the app is served from (`/`, `/dashboard/`, `./`) |

**One API deployment serves one site and one database**, so the dashboard has no
site switcher: it shows whatever `VITE_API_BASE` points at, and reads the site's
name from `GET /api/master/site`. To look at another site, build against that
site's API.

## How it talks to the API

* `src/lib/api.js` — the only place that calls `fetch`. It attaches the bearer
  token, unwraps the server's `{ success, message, data }` envelope, and turns a
  401 into a sign-out.
* `src/lib/useApi.js` — `useApi(fetcher, deps)` → `{ data, loading, error, reload }`.
  The fetcher gets an `AbortSignal`, so changing the range cancels the request
  that is no longer wanted instead of letting a slow answer overwrite a newer one.
* `src/components/AsyncPanel.jsx` — the loading / error / empty states.

Aggregation happens on the server. The five dashboards read `/api/dashboard/*`
and the ten reports read `/api/reports/{key}`, which returns columns, rows and
footer totals, so `ReportPage` renders any of them and CSV / Excel downloads
come from `/api/reports/{key}/export` rather than being rebuilt in the browser.
"Export PDF" is still the browser's own print dialog.

## Sessions and roles

Signing in calls `/api/auth/login` and stores the JWT. On reload the token is
checked against `/api/auth/me` rather than trusting a cached user, so a revoked
account cannot keep a stale dashboard open.

The role (`admin` / `manager` / `operator` / `viewer`) comes from the API, which
derives it from `PkAdminweb.admin_level_id` through its `Roles` configuration
section. That mapping is a convention rather than something the database states —
**verify it against the site's accounts**, or everyone lands on the default role.
`src/lib/roles.js` holds only the labels and the permission predicates.

Tenant-scoped accounts are narrowed by the API itself, not by this app: a tenant
sees only the transactions its own stamps touched, and only its own tenant and
stamp lists.

## Still held in the browser

Two features have no table in the parking database and no endpoint yet, so they
live in `localStorage` on the client:

* **Emergency-barrier audit log** (`src/lib/gateStore.js`) — the barrier list and
  the open command are real (`/api/door`); the record of who opened what is not,
  and is per browser. An emergency open should be traceable centrally, so this is
  the piece to move server-side first.
* **Full tax invoices and e-Tax delivery** (`src/lib/invoiceStore.js`) — the ABB
  receipts they are built from are real API data (the invoice number on each paid
  exit); issuing the full ใบกำกับภาษีเต็มรูป and "delivering" it is local, and the
  e-Tax submission is simulated.

Both modules are written as the seam for the real service.
