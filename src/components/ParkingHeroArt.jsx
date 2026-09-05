// Decorative illustration for the login hero: a parking-dashboard scene
// (mini dashboard panel + barrier gate + car). Pure inline SVG, no assets.
export default function ParkingHeroArt(props) {
  return (
    <svg viewBox="0 0 420 320" fill="none" role="img" aria-label="Parking dashboard illustration" {...props}>
      <defs>
        <linearGradient id="pha-panel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity=".22" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity=".08" />
        </linearGradient>
        <linearGradient id="pha-bar" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity=".35" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity=".9" />
        </linearGradient>
      </defs>

      {/* ---- Dashboard panel ---- */}
      <g>
        <rect x="24" y="18" width="372" height="188" rx="16"
              fill="url(#pha-panel)" stroke="#ffffff" strokeOpacity=".38" />
        {/* window dots */}
        <circle cx="46" cy="40" r="4" fill="#ffffff" fillOpacity=".55" />
        <circle cx="60" cy="40" r="4" fill="#ffffff" fillOpacity=".35" />
        <circle cx="74" cy="40" r="4" fill="#ffffff" fillOpacity=".25" />
        <rect x="300" y="34" width="76" height="12" rx="6" fill="#ffffff" fillOpacity=".2" />

        {/* KPI cards */}
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${44 + i * 116}, 62)`}>
            <rect width="100" height="52" rx="10" fill="#ffffff" fillOpacity=".16" stroke="#ffffff" strokeOpacity=".28" />
            <rect x="12" y="13" width="34" height="7" rx="3.5" fill="#ffffff" fillOpacity=".45" />
            <rect x="12" y="27" width="60" height="12" rx="6" fill="#ffffff" fillOpacity=".85" />
          </g>
        ))}

        {/* Bar chart */}
        <g transform="translate(44, 130)">
          <rect width="216" height="60" rx="10" fill="#ffffff" fillOpacity=".1" />
          {[26, 40, 18, 46, 32, 52, 38].map((h, i) => (
            <rect key={i} x={16 + i * 28} y={50 - h} width="14" height={h} rx="4" fill="url(#pha-bar)" />
          ))}
        </g>

        {/* Occupancy donut */}
        <g transform="translate(324, 160)">
          <circle r="27" fill="none" stroke="#ffffff" strokeOpacity=".22" strokeWidth="9" />
          <circle r="27" fill="none" stroke="#ffffff" strokeOpacity=".92" strokeWidth="9"
                  strokeLinecap="round" strokeDasharray="120 170" transform="rotate(-90)" />
          <rect x="-16" y="-4" width="32" height="9" rx="4.5" fill="#ffffff" fillOpacity=".7" />
        </g>
      </g>

      {/* ---- Barrier gate + car ---- */}
      <g>
        {/* ground */}
        <path d="M18 286h384" stroke="#ffffff" strokeOpacity=".3" strokeWidth="3" strokeLinecap="round" />
        <path d="M50 296h44M118 296h44M186 296h44M254 296h44M322 296h44"
              stroke="#ffffff" strokeOpacity=".16" strokeWidth="4" strokeLinecap="round" />

        {/* gate post */}
        <rect x="286" y="232" width="22" height="54" rx="5" fill="#ffffff" fillOpacity=".85" />
        <rect x="291" y="242" width="12" height="9" rx="2" fill="#2a78d6" fillOpacity=".85" />
        {/* boom */}
        <g transform="rotate(-28 297 236)">
          <rect x="297" y="230" width="104" height="11" rx="5.5" fill="#ffffff" fillOpacity=".92" />
          <rect x="316" y="230" width="16" height="11" fill="#2a78d6" fillOpacity=".55" />
          <rect x="348" y="230" width="16" height="11" fill="#2a78d6" fillOpacity=".55" />
          <rect x="380" y="230" width="16" height="11" fill="#2a78d6" fillOpacity=".55" />
        </g>

        {/* car */}
        <g transform="translate(96, 224)">
          <path d="M8 44l6-20a12 12 0 0 1 11.4-8.4h53.2A12 12 0 0 1 90 24l6 20"
                fill="#ffffff" fillOpacity=".9" />
          <rect x="2" y="42" width="100" height="24" rx="9" fill="#ffffff" fillOpacity=".95" />
          <path d="M24 26h22v14H19l5-14ZM58 26h20l6 14H58V26Z" fill="#2a78d6" fillOpacity=".55" />
          <circle cx="26" cy="66" r="9" fill="#ffffff" />
          <circle cx="26" cy="66" r="4" fill="#2a78d6" fillOpacity=".6" />
          <circle cx="78" cy="66" r="9" fill="#ffffff" />
          <circle cx="78" cy="66" r="4" fill="#2a78d6" fillOpacity=".6" />
        </g>
      </g>
    </svg>
  )
}
