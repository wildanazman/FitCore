interface Props {
  points: { date: string; kg: number }[]
  displayValue: number
  unit: string
  height?: number
}

/** Minimal SVG trend line matching the Kinetic Precision chart styling. */
export function Sparkline({ points, displayValue, unit, height = 180 }: Props) {
  const W = 400
  const H = 150
  if (points.length < 2) {
    return (
      <div className="flex items-center justify-center text-on-surface-variant font-data-mono text-data-mono" style={{ height }}>
        Log more weigh-ins to see your trend.
      </div>
    )
  }
  const vals = points.map((p) => p.kg)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const pad = 12
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * W
    const y = pad + (1 - (p.kg - min) / range) * (H - pad * 2)
    return { x, y }
  })
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const last = coords[coords.length - 1]

  return (
    <div className="w-full relative" style={{ height }}>
      <svg className="w-full h-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        {[25, 75, 125].map((y) => (
          <line key={y} x1="0" x2={W} y1={y} y2={y} stroke="#474553" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
        ))}
        <path d={path} fill="none" stroke="#c5c0ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {coords.slice(0, -1).map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="3" fill="#c5c0ff" opacity="0.5" />
        ))}
        <circle cx={last.x} cy={last.y} r="6" fill="#c5c0ff" style={{ filter: 'drop-shadow(0 0 8px rgba(197,192,255,0.5))' }} />
        <text
          x={last.x - 8}
          y={last.y - 12}
          textAnchor="end"
          fill="#e5e1e4"
          className="font-data-mono"
          style={{ fontSize: 13, fontWeight: 600 }}
        >
          {displayValue.toFixed(1)} {unit}
        </text>
      </svg>
    </div>
  )
}
