import { useEffect, type ReactNode } from 'react'
import { animate, motion, useMotionValue, useTransform, type Variants } from 'framer-motion'

// Shared motion language for the redesign: springy taps, staggered reveals,
// animated numbers, and page transitions.

export const spring = { type: 'spring', stiffness: 420, damping: 32 } as const
export const softSpring = { type: 'spring', stiffness: 260, damping: 28 } as const
const EASE = [0.22, 1, 0.36, 1] as const

export const screenVariants: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE, when: 'beforeChildren', staggerChildren: 0.05 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.18, ease: 'easeIn' } },
}

export const listContainer: Variants = {
  animate: { transition: { staggerChildren: 0.06 } },
}

export const listItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
}

/** Springy pressable — scales down on tap. */
export function Press({
  children,
  onClick,
  className = '',
  disabled = false,
  as = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  as?: 'button' | 'div'
}) {
  const Comp = as === 'div' ? motion.div : motion.button
  return (
    <Comp
      onClick={onClick}
      disabled={as === 'button' ? disabled : undefined}
      whileTap={{ scale: 0.955 }}
      transition={spring}
      className={className}
    >
      {children}
    </Comp>
  )
}

/** Staggered-reveal card. */
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={listItem} className={className}>
      {children}
    </motion.div>
  )
}

/** Animated count-up number. */
export function CountUp({
  value,
  format,
  className = '',
}: {
  value: number
  format?: (n: number) => string
  className?: string
}) {
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => (format ? format(v) : Math.round(v).toLocaleString()))
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.9, ease: EASE })
    return () => controls.stop()
  }, [mv, value])
  return <motion.span className={className}>{text}</motion.span>
}
