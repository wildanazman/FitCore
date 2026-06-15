// Date helpers — all dates handled as local-time yyyy-mm-dd strings.

export function todayISO(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return todayISO(d)
}

export function daysBetween(aISO: string, bISO: string): number {
  const a = parseISO(aISO).getTime()
  const b = parseISO(bISO).getTime()
  return Math.round((b - a) / 86_400_000)
}

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function weekday(iso: string): string {
  return WEEKDAY[parseISO(iso).getDay()]
}

/** Monday-based day index 0..6 (Mon=0 .. Sun=6) */
export function mondayIndex(iso: string): number {
  return (parseISO(iso).getDay() + 6) % 7
}

export function shortDate(iso: string): string {
  const d = parseISO(iso)
  return `${MONTH[d.getMonth()]} ${d.getDate()}`
}

export function startOfWeek(iso: string): string {
  return addDays(iso, -mondayIndex(iso))
}

export function timeLabel(isoTimestamp: string): string {
  const d = new Date(isoTimestamp)
  let h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${String(h).padStart(2, '0')}:${m} ${ap}`
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}
