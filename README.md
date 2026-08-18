# Singha Parking — Web Dashboard

A friendly, modern parking-operations dashboard built with **Vite + React**.
It runs entirely on **mock data** today; the data layer (`src/data/mockData.js`)
is isolated so it can be swapped for the **C# backend** API later without touching
the UI. Layout & menu structure mirror the reference *BTS Visionary Park* carpark
system, with a cleaner, more approachable design.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173  (opens automatically)
```

Sign in with the demo account: **`admin` / `parking123`**
(the whole app sits behind this login gate).

Production build:

```bash
npm run build && npm run preview
```

## Multi-site (executive view)

The group runs four parking sites — **Singha Complex (Asoke)**, **S Oasis (Vibhavadi)**,
**Sun Towers (Chatuchak)** and **S-Metro (Sukhumvit)**. A **site switcher in the top bar**
drives the entire app:

* **A single site** → every dashboard, report and export shows that site only.
* **All Sites** → everything is consolidated into one group-level roll-up, and each
  dashboard adds a **Site Comparison** panel: share-of-total bar per site, a metric table
  with a grand-total row (click a row to drill into that site), and a stacked daily chart
  whose bar height is the all-sites total.

Reports carry the same selection as their first filter, so you can also switch site from
inside a report; row-level reports gain a **Site** column while consolidated, and it flows
through to the CSV / Excel / PDF exports. The choice persists across reloads.

Site definitions live in `SITES` (`src/data/mockData.js`) and the selection in
`src/lib/siteContext.jsx` — point `filterSite` / `useSiteTransactions` at a `siteId`
query parameter when the C# backend lands.

## Menu — everything is wired up and usable

**Dashboards**
| Page | Contents |
|------|----------|
| Sales Dashboard | Revenue / transactions / VAT / avg ticket, parking·lost-card·overnight fees, hourly-revenue bar chart, payment-methods donut, recent transactions |
| Transaction Dashboard | Entries / exits / inside / peak hour, status breakdown, hourly-traffic (entries vs exits), member-vs-visitor donut, recent movements |
| Stamp Dashboard | Stamps / companies / fees / avg duration, tenant vs visitor paid, hourly-usage, top-companies, stamp-code table, recent stamps |
| Vehicle Dashboard | Vehicles in/out, peak accumulated, net flow, regular/temporary split, in-out by time period, vehicle-types donut, accumulated-occupancy trend, per-hour stats |
| Opportunity Loss Dashboard | Total loss / vehicles / avg loss, tenant·visitor·total revenue, revenue-vs-loss by company, loss distribution by stamp code, top-loss companies, recent losses |

**Reports** (filter → search → **Export CSV / Excel / PDF**)
Detailed Sales Tax Report · Vehicle Transaction Report · Stamp Report ·
License Plate Reading Issue · Opportunity Loss Summary · Vehicle Volume Time Period ·
Dashboard Member Visitor · Discount Report · Package Member Report · Cash or Online Payment

Extras: **Thai / English language switcher** (globe button in the top bar & on the
login screen; choice persists), **light / dark theme** toggle, responsive layout
with a mobile drawer, time-range presets (today / 7 / 30 / 90 days), and per-report
date/tenant/stamp/status filters that actually recompute the table & charts.

Localization lives in `src/lib/i18n.jsx` (English keys → Thai dictionary); the
shared components translate centrally, so adding a language is a matter of adding
one more dictionary.

## Project structure

```
src/
  auth/          demo login (AuthContext) — swap for real auth
  components/    Layout, StatCard, RangePicker, Donut/DataTable/Panel (ui.jsx),
                 ReportPage scaffold, SiteSwitcher, SiteBreakdown, ChartTooltip, icons
  data/          mockData.js  ← seeded dataset for every site; replace with backend API
  lib/           format, dateRange, selectors (aggregations incl. per-site),
                 siteContext (site filter / roll-up), export (csv/xlsx/pdf)
  nav.js         sidebar menu definition (Dashboards + Reports groups)
  pages/         5 dashboards + pages/reports/ (10 reports)
  styles/        design-system tokens (light + dark)
```

## Connecting the C# backend later

Replace `src/data/mockData.js` (and, if you prefer server-side aggregation, the
helpers in `src/lib/selectors.js`) with `fetch` calls to your API. Pages consume
plain arrays/objects, so no component changes are required.
