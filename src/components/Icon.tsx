interface IconProps {
  name: string
  className?: string
  fill?: boolean
  size?: number
  style?: React.CSSProperties
}

export function Icon({ name, className = '', fill = false, size, style }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${fill ? 'icon-fill' : ''} ${className}`}
      style={{ fontSize: size ? `${size}px` : undefined, ...style }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
