import { addDays, isLogDate, todayISO } from '../lib/date'
import './log-date-picker.css'

export function LogDatePicker({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  const today = todayISO()
  return <div className="log-date-picker">
    <label>Log date<input type="date" required min="1900-01-01" max={today} value={date} onChange={(event) => { if (isLogDate(event.target.value)) onChange(event.target.value) }} /></label>
    <div role="group" aria-label="Choose log date">
      <button type="button" aria-pressed={date === today} onClick={() => onChange(today)}>Today</button>
      <button type="button" aria-pressed={date === addDays(today, -1)} onClick={() => onChange(addDays(today, -1))}>Yesterday</button>
    </div>
    {date !== today && <p>Logging for {new Date(`${date}T12:00:00`).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })}. Today’s totals stay unchanged.</p>}
  </div>
}
