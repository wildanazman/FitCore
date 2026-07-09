// Decorative concentric-ring motif used as a watermark on hero/stat cards.
// Inherits currentColor so each card tints it via text-* classes.

export function Rings({ className = '', size = 180 }: { className?: string; size?: number }) {
  const radii = [46, 36, 26, 16]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {radii.map((r, i) => (
        <circle
          key={r}
          cx="50"
          cy="50"
          r={r}
          stroke="currentColor"
          strokeWidth="5"
          opacity={0.55 - i * 0.11}
        />
      ))}
    </svg>
  )
}
