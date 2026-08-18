// Lightweight inline icons (stroke-based) — no icon dependency.
const base = {
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round',
}
const I = (path) => (p) => <svg {...base} {...p}>{path}</svg>

/* Brand / chrome */
export const IconCar = I(<><path d="M5 13l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13M5 13h14v4a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-4Z"/><circle cx="7.5" cy="15.5" r=".6"/><circle cx="16.5" cy="15.5" r=".6"/></>)
export const IconMenu = I(<><path d="M4 6h16M4 12h16M4 18h16"/></>)
export const IconGlobe = I(<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/></>)
export const IconLogout = I(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></>)
export const IconSun = I(<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>)
export const IconMoon = I(<><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></>)

/* Nav group markers */
export const IconGrid = I(<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M17.5 14v7M14 17.5h7"/></>)
export const IconDoc = I(<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>)

/* KPI + content */
export const IconCoins = I(<><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/></>)
export const IconReceipt = I(<><path d="M5 21V4a1 1 0 0 1 1.5-.9L9 4l3-1 3 1 2.5-1a1 1 0 0 1 1.5.9v17l-2.5-1-3 1-3-1-3 1L5 21Z"/><path d="M9 8h6M9 12h6"/></>)
export const IconTrendUp = I(<><path d="M3 17l6-6 4 4 8-8M21 7v5h-5"/></>)
export const IconTrendDown = I(<><path d="M3 7l6 6 4-4 8 8M21 17v-5h-5"/></>)
export const IconClock = I(<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>)
export const IconUser = I(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8"/></>)
export const IconUsers = I(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>)
export const IconTag = I(<><path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L3 13V3h10l7.59 7.59a2 2 0 0 1 0 2.82Z"/><circle cx="7.5" cy="7.5" r="1.5"/></>)
export const IconBuilding = I(<><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01"/></>)
export const IconWarning = I(<><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></>)
export const IconChartBar = I(<><path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="7" rx="1"/><rect x="12.5" y="6" width="3" height="11" rx="1"/><rect x="18" y="13" width="3" height="4" rx="1"/></>)
export const IconArrowIn = I(<><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></>)
export const IconArrowOut = I(<><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4M16 17l5-5-5-5M21 12H9"/></>)
export const IconWallet = I(<><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/></>)
export const IconGauge = I(<><path d="M12 13l3-3M3.5 14a8.5 8.5 0 1 1 17 0"/></>)
export const IconInbox = I(<><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.5Z"/></>)

/* Actions */
export const IconSearch = I(<><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>)
export const IconPrinter = I(<><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6z"/></>)
export const IconDownload = I(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></>)
export const IconFile = I(<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/></>)
