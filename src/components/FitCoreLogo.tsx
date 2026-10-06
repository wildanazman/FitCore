export function FitCoreMark({ size = 40, color = '#2453EE', ink = '#FFFFFF' }: { size?: number; color?: string; ink?: string }) {
  return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
    <rect width="48" height="48" rx="12" fill={color} />
    <path d="M15 34V14H33M15 24H28" stroke={ink} strokeWidth="4.5" strokeLinecap="square" strokeLinejoin="round" />
    <circle cx="32" cy="33" r="3.5" fill={ink} />
  </svg>
}

export function FitCoreLogo({ size = 40 }: { size?: number }) {
  return <span className="fitcore-wordmark" aria-label="FitCore"><FitCoreMark size={size} /><span>fitcore<span>.</span></span></span>
}
