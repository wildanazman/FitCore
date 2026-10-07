import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { addDays, daysBetween, shortDate, todayISO } from '../lib/date'
import { toDisplayWeight, weightUnit } from '../lib/nutrition'
import { weightHistory } from '../lib/weightHistory'
import type { WeightEntry } from '../types'
import './weight-history.css'

export function WeightHistory({ entries, units, targetKg, onLog }: { entries: WeightEntry[]; units: 'metric' | 'imperial'; targetKg: number | null; onLog: () => void }) {
  const [period, setPeriod] = useState<number | null>(30)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const plotRef = useRef<SVGSVGElement>(null)
  const [plotWidth, setPlotWidth] = useState(560)
  useEffect(() => {
    if (!plotRef.current) return
    const observer = new ResizeObserver(records => { if (records[0].contentRect.width > 0) setPlotWidth(records[0].contentRect.width) })
    observer.observe(plotRef.current)
    return () => observer.disconnect()
  }, [dataHasReadings(entries, period)])
  const data = weightHistory(entries, todayISO(), period)
  const unit = weightUnit(units)
  const display = (kg: number) => toDisplayWeight(kg, units)
  const points = data.points.map(p => ({ ...p, value: display(p.kg), mean: p.average === null ? null : display(p.average) }))
  const found = points.findIndex(p => p.date === selectedDate)
  const index = found < 0 ? points.length - 1 : found
  const selected = points[index]
  const first = points[0], last = points[points.length - 1]
  const change = first && last ? last.value - first.value : 0
  const signed = (n: number) => `${Math.abs(n) < .05 ? '' : n > 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}`
  const values = points.flatMap(p => [p.value, ...(p.mean === null ? [] : [p.mean])])
  const rawMin = values.length ? Math.min(...values) : 0, rawMax = values.length ? Math.max(...values) : 0
  const padding = Math.max(units === 'metric' ? 1 : 2, (rawMax - rawMin) * .18)
  const min = Math.floor(rawMin - padding), max = Math.ceil(rawMax + padding)
  const W = Math.max(240, plotWidth), H = 268, L = 49, R = 12, T = 34, B = 34
  const span = Math.max(1, daysBetween(data.start, data.end))
  const x = (date: string) => L + daysBetween(data.start, date) / span * (W - L - R)
  const y = (value: number) => T + (max - value) / (max - min || 1) * (H - T - B)
  let path = '', previous: typeof selected | undefined
  for (const p of points) {
    if (p.mean === null) { previous = undefined; continue }
    path += `${previous && daysBetween(previous.date, p.date) <= 7 ? 'L' : 'M'}${x(p.date)},${y(p.mean)} `
    previous = p
  }
  const measuredPath = points.map((p, i) => `${i > 0 && daysBetween(points[i - 1].date, p.date) <= 7 ? 'L' : 'M'}${x(p.date)},${y(p.value)}`).join(' ')
  const validGoal = targetKg !== null && Number.isFinite(targetKg) && targetKg > 0
  const goal = validGoal ? display(targetKg!) : null
  const goalVisible = goal !== null && goal >= min && goal <= max
  function inspect(clientX: number, rect: DOMRect) {
    const chartX = (clientX - rect.left) / rect.width * W
    const nearest = points.reduce((best, p) => Math.abs(x(p.date) - chartX) < Math.abs(x(best.date) - chartX) ? p : best, points[0])
    if (nearest) setSelectedDate(nearest.date)
  }
  return <section className="weight-history" aria-labelledby="weight-history-title">
    <header><h2 id="weight-history-title">Weight history</h2><label><span className="sr-only">Weight history period</span><select value={period ?? 'all'} onChange={e => { setPeriod(e.target.value === 'all' ? null : Number(e.target.value)); setSelectedDate(null) }}><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="all">All history</option></select></label></header>
    {!selected ? <div className="weight-history-empty"><h3>{data.totalDays ? 'No weigh-ins in this window.' : 'Start with one weigh-in.'}</h3><p>{data.totalDays ? 'Try a longer period to see your earlier readings.' : 'Your starting profile weight is not a dated measurement. Log a weight to start your history.'}</p><button type="button" onClick={data.totalDays ? () => setPeriod(null) : onLog}>{data.totalDays ? 'View all history' : 'Log your first weigh-in'}</button></div> : <>
      <div className="weight-history-reading" aria-live="polite"><div><span>{shortDate(selected.date)}, {selected.date.slice(0, 4)}</span><strong>{selected.value.toFixed(1)} <small>{unit}</small></strong><small>Recorded weight</small></div><div className="weight-history-average"><span>7-day average</span><strong>{selected.mean === null ? '—' : selected.mean.toFixed(1)} <small>{selected.mean === null ? '' : unit}</small></strong><small>{selected.mean === null ? 'Not enough readings' : `From ${selected.samples} measured days`}</small></div></div>
      <div className="weight-history-chart-control" role="slider" tabIndex={0} aria-label="Inspect a weigh-in" aria-valuemin={0} aria-valuemax={Math.max(0, points.length - 1)} aria-valuenow={Math.max(0, index)} aria-valuetext={`${shortDate(selected.date)}, ${selected.value.toFixed(1)} ${unit}`} onKeyDown={e => { let next = index; if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next--; else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next++; else if (e.key === 'Home') next = 0; else if (e.key === 'End') next = points.length - 1; else return; e.preventDefault(); setSelectedDate(points[Math.max(0, Math.min(points.length - 1, next))].date) }}>
      <svg ref={plotRef} className="weight-history-plot" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); inspect(e.clientX, e.currentTarget.getBoundingClientRect()) }} onPointerMove={e => { if (e.buttons || e.currentTarget.hasPointerCapture(e.pointerId)) inspect(e.clientX, e.currentTarget.getBoundingClientRect()) }}>
        {[0, 1, 2, 3, 4].map(i => { const value = max - i * (max - min) / 4; return <g key={i}><line x1={L} x2={W - R} y1={y(value)} y2={y(value)} stroke="#dfe5ef" /><text x={L - 9} y={y(value) + 4} textAnchor="end">{value.toFixed(1)}</text></g> })}
        <text x={L - 9} y={10} textAnchor="end">{unit}</text>
        {goalVisible && <line x1={L} x2={W - R} y1={y(goal!)} y2={y(goal!)} stroke="#627089" strokeDasharray="2 5" />}
        <path d={path} fill="none" stroke="#17253a" strokeWidth="1.5" strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d={measuredPath} fill="none" stroke="#2453ee" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <line x1={x(selected.date)} x2={x(selected.date)} y1={T} y2={H - B} stroke="#2453ee" strokeDasharray="2 5" opacity=".45" />
        <circle cx={x(selected.date)} cy={y(selected.value)} r="9" fill="#e8eeff" />
        {points.map(p => <circle key={p.date} cx={x(p.date)} cy={y(p.value)} r={p.date === selected.date ? 5 : 2.5} fill={p.date === selected.date ? '#2453ee' : '#ffffff'} stroke="#2453ee" strokeWidth="1.5" />)}
        {[0, .5, 1].map((ratio, i) => <text key={i} x={L + ratio * (W - L - R)} y={H - 9} textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}>{shortDate(addDays(data.start, Math.round(span * ratio)))}</text>)}
      </svg>
      </div>
      <div className="weight-history-inspect"><p>{points.length} measured {points.length === 1 ? 'day' : 'days'}<span>Drag the chart to inspect</span></p><div><button type="button" aria-label="Previous weigh-in" disabled={index <= 0} onClick={() => setSelectedDate(points[index - 1].date)}><Icon name="chevron_left" size={20} /></button><button type="button" aria-label="Next weigh-in" disabled={index >= points.length - 1} onClick={() => setSelectedDate(points[index + 1].date)}><Icon name="chevron_right" size={20} /></button></div></div>
      <div className="weight-history-legend"><span><i className="weight-history-line" />Recorded</span><span><i className="weight-history-dash" />7-day average</span>{goalVisible && <span><i className="weight-history-goal-line" />Goal</span>}</div>
      <div className="weight-history-footer"><div><span>Recorded change in view</span><strong>{points.length < 2 ? '—' : `${signed(change)} ${unit}`}</strong><small>{points.length} measured {points.length === 1 ? 'day' : 'days'}</small></div>{goal !== null && <div><span>Saved goal</span><strong>{goal.toFixed(1)} {unit}</strong><small>{Math.abs(last.value - goal) < .05 ? 'At your goal' : `${Math.abs(last.value - goal).toFixed(1)} ${unit} ${last.value > goal ? 'above' : 'below'} goal at last reading`}</small></div>}</div>
      <details className="weight-history-data"><summary>Readings & chart details</summary><p>Dates are spaced to actual time. The axis is zoomed, not zero-based. The average uses logged days in the preceding 7 calendar days, not seven entries. Missing days are not filled; lines break across gaps longer than a week. One reading per day; if a day was logged twice, the last saved entry is shown.</p><table><thead><tr><th>Date</th><th>Weight · {unit}</th><th>7-day avg · {unit}</th></tr></thead><tbody>{[...points].reverse().map(p => <tr key={p.date}><td>{shortDate(p.date)}, {p.date.slice(0, 4)}</td><td>{p.value.toFixed(1)}</td><td>{p.mean === null ? '—' : p.mean.toFixed(1)}</td></tr>)}</tbody></table></details>
    </>}
  </section>
}

function dataHasReadings(entries: WeightEntry[], period: number | null) { return weightHistory(entries, todayISO(), period).points.length > 0 }
