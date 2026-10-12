import { useEffect, useRef, useState } from 'react'
import { elapsedWorkoutMs } from '../lib/workoutClock'
export function useWorkoutClock(paused: boolean) {
  const accumulated = useRef(0)
  const started = useRef<number | null>(paused ? null : Date.now())
  const [, tick] = useState(0)
  const milliseconds = () => elapsedWorkoutMs(accumulated.current, started.current, Date.now())
  useEffect(() => {
    if (paused && started.current !== null) { accumulated.current = milliseconds(); started.current = null }
    if (!paused && started.current === null) started.current = Date.now()
    tick(value=>value+1)
    if (paused) return
    const timer = window.setInterval(()=>tick(value=>value+1), 500)
    return ()=>window.clearInterval(timer)
  }, [paused])
  return { seconds: milliseconds()/1000, milliseconds }
}
