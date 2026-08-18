// Small rounded SVG national flags (render everywhere, unlike flag emoji).
let uid = 0

function Frame({ children, w = 22, h = 15, ...p }) {
  const id = `fc${++uid}`
  return (
    <svg width={w} height={h} viewBox="0 0 24 16" className="flag" {...p}>
      <defs>
        <clipPath id={id}><rect width="24" height="16" rx="3" /></clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>{children}</g>
      <rect x="0.5" y="0.5" width="23" height="15" rx="2.6" fill="none" stroke="rgba(0,0,0,.14)" />
    </svg>
  )
}

// Thailand — 5 stripes (red / white / blue×2 / white / red)
export function FlagTH(p) {
  const u = 16 / 6
  return (
    <Frame {...p}>
      <rect width="24" height="16" fill="#A51931" />
      <rect y={u} width="24" height={u} fill="#F4F5F8" />
      <rect y={u * 2} width="24" height={u * 2} fill="#2D2A4A" />
      <rect y={u * 4} width="24" height={u} fill="#F4F5F8" />
    </Frame>
  )
}

// United States — simplified (13 stripes + star canton)
export function FlagUS(p) {
  const h = 16 / 13
  const stripes = []
  for (let i = 0; i < 13; i++) {
    stripes.push(<rect key={i} y={i * h} width="24" height={h} fill={i % 2 === 0 ? '#B22234' : '#FFFFFF'} />)
  }
  const stars = []
  const cw = 10.2
  const ch = h * 7
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      const x = 1.2 + c * ((cw - 1.6) / 4)
      const y = 1.1 + r * ((ch - 1.6) / 3)
      stars.push(<circle key={`${r}-${c}`} cx={x} cy={y} r="0.55" fill="#FFFFFF" />)
    }
  }
  return (
    <Frame {...p}>
      {stripes}
      <rect width={cw} height={ch} fill="#3C3B6E" />
      {stars}
    </Frame>
  )
}

/** Flag of the currently-active language. */
export function LangFlag({ lang, ...p }) {
  return lang === 'th' ? <FlagTH {...p} /> : <FlagUS {...p} />
}
