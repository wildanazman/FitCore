import { useState } from 'react'
import { useApp } from '../store/AppContext'
import { todayISO } from '../lib/date'
import { PROGRESS_MACHINES, strengthProgress, type ProgressInput, type ProgressMachine } from '../lib/strengthProgress'

export function StrengthProgress() {
  const { profile } = useApp()
  const [machine, setMachine] = useState<ProgressMachine>(1001)
  const [protocol, setProtocol] = useState(false)
  const [count, setCount] = useState('3')
  const [firstDate, setFirstDate] = useState('')
  const [rows, setRows] = useState(Array.from({ length: 3 }, () => ({ date: '', load: '', duration: '' })))
  const [result, setResult] = useState<ReturnType<typeof strengthProgress> | null>(null)
  function changeRow(index: number, key: keyof typeof rows[number], value: string) {
    setRows(rows.map((row, i) => i === index ? { ...row, [key]: value } : row)); setResult(null)
  }
  function forecast() {
    const input: ProgressInput = { age: profile.age, sex: profile.sex, machine, studyProtocol: protocol,
      historyCount: Number(count), firstDate,
      observations: rows.map(row => ({ date: row.date, loadKg: Number(row.load), durationSeconds: Number(row.duration) })) }
    setResult(strengthProgress(input))
  }
  return <details className="coach-method coach-progress"><summary>Experimental progress forecast</summary>
    <p>For supervised, slow, single-set machine training only. Not for regular multi-set workouts. No changes are made to your plan or logs.</p>
    <p><strong>Not a load recommendation.</strong> In testing, keeping the same load predicted better on average than this model. This preview shows what the experiment learned, not what you should lift.</p>
    <form onSubmit={event => { event.preventDefault(); forecast() }}>
      <label>Machine<select value={machine} onChange={e => { setMachine(Number(e.target.value) as ProgressMachine); setRows(Array.from({ length: 3 }, () => ({ date: '', load: '', duration: '' }))); setCount('3'); setFirstDate(''); setResult(null) }}>{PROGRESS_MACHINES.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}</select></label>
      <p>Enter the machine’s displayed kg and actual timed set duration—not per-dumbbell weight or estimated reps × tempo. Different machines may use different resistance.</p>
      {rows.map((row, index) => <fieldset key={index}><legend>{['Oldest session', 'Previous session', 'Latest session'][index]}</legend><div className="coach-progress-fields">
        <label>Date<input required type="date" max={todayISO()} value={row.date} onChange={e => changeRow(index, 'date', e.target.value)}/></label>
        <label>Machine load (kg)<input required type="number" inputMode="decimal" min="0.1" max={machine === 1001 ? 200 : 115.99} step="any" value={row.load} onChange={e => changeRow(index, 'load', e.target.value)}/></label>
        <label>Actual set time (sec)<input required type="number" inputMode="numeric" min="10" max="300" step="any" value={row.duration} onChange={e => changeRow(index, 'duration', e.target.value)}/></label>
      </div></fieldset>)}
      <div className="coach-progress-fields"><label>Total sessions on this machine<input required type="number" min="3" max="372" step="1" value={count} onChange={e => { setCount(e.target.value); setResult(null) }}/></label><label>First-ever session on this machine<input required type="date" max={rows[0].date || todayISO()} value={firstDate} onChange={e => { setFirstDate(e.target.value); setResult(null) }}/></label></div>
      <label className="coach-clearance"><input type="checkbox" checked={protocol} onChange={e => { setProtocol(e.target.checked); setResult(null) }}/><span>These are actual observations from supervised, slow, single-set machine training. I am not changing my routine to match this experiment.</span></label>
      <button className="coach-primary" type="submit" disabled={!protocol}>Preview forecast</button>
    </form>
    {result && ('error' in result ? <p role="alert">{result.error}</p> : <div className="coach-progress-result" role="status"><h4>Observed-load forecast</h4><p><strong>{result.changePercent > 0 ? '+' : ''}{result.changePercent.toFixed(1)}%</strong> for the next recorded session within 1–21 days.</p><p>Average test error: about {result.typicalError.toFixed(1)} percentage points. This is not a safe increase limit, confidence range or proof your strength improved.</p><p>Your prescribed weights and sessions stay unchanged.</p></div>)}
    <a href="https://osf.io/jn6ay/" target="_blank" rel="noreferrer">Source: Steele et al., Fit20 study · CC BY 4.0</a>
  </details>
}
