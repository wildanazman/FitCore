export function FitCoreMark({ size = 40 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
    <rect width="48" height="48" rx="12" fill="#C9F24E" />
    <path d="M15 34V14H33M15 24H28" stroke="#19210D" strokeWidth="4.5" strokeLinecap="square" strokeLinejoin="round" />
    <circle cx="32" cy="33" r="3.5" fill="#19210D" />
  </svg>
}

export function FitCoreLogo({ size = 40 }: { size?: number }) {
  return <span className="fitcore-wordmark" aria-label="FitCore"><FitCoreMark size={size} /><span>Fit<span>Core</span></span></span>
}
