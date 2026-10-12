/** Timestamp-based clocks stay correct when browser intervals are throttled. */
export function elapsedWorkoutMs(accumulated: number, startedAt: number | null, now: number) {
  return accumulated + (startedAt === null ? 0 : Math.max(0, now - startedAt))
}
export function workoutTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}
