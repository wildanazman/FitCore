import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDialogFocus } from '../components/useDialogFocus'
import { useApp } from '../store/AppContext'
import { TopBar } from '../components/TopBar'
import { ProgressBar, SectionLabel } from '../components/ui'
import { Sparkline } from '../components/Sparkline'
import { Icon } from '../components/Icon'
import { WeightOutlook } from '../components/WeightOutlook'
import { todayISO, shortDate, uid } from '../lib/date'
import { fatMassKg, latestMeasured, latestWithMeasurements, leanMassKg, navyBodyFat, rollingTrend, sortByDate } from '../lib/body'
import { leanMassInsight } from '../lib/coach'
import { fromDisplayWeight, toDisplayWeight, weightUnit } from '../lib/nutrition'
import type { ProgressPhoto, WeightEntry } from '../types'

type Tab = 'weight' | 'photos' | 'measurements'

export function Body() {
  const { state, profile, addWeight, addPhoto, removePhoto } = useApp()
  const [tab, setTab] = useState<Tab>('weight')
  const [showLog, setShowLog] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const unit = weightUnit(profile.units)
  const sorted = sortByDate(state.weights)
  const latest = latestMeasured(state.weights)
  const trend = rollingTrend(state.weights)

  const change = (latest?.weightKg ?? profile.startWeightKg) - profile.startWeightKg
  const dispChange = toDisplayWeight(Math.abs(change), profile.units)

  const measured = latestWithMeasurements(state.weights)
  const bf = measured ? navyBodyFat(profile.sex, profile.heightCm, measured.neckCm, measured.waistCm, measured.hipCm) : null
  const lean = bf != null && latest ? leanMassKg(latest.weightKg, bf) : null
  const fat = bf != null && latest ? fatMassKg(latest.weightKg, bf) : null

  const trendDisp = trend.map((p) => ({ date: p.date, kg: toDisplayWeight(p.kg, profile.units) }))
  const latestDisp = toDisplayWeight(latest?.weightKg ?? profile.startWeightKg, profile.units)

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => addPhoto({ id: uid(), date: todayISO(), dataUrl: reader.result as string })
    reader.readAsDataURL(file)
  }

  return (
    <div className="body-page">
      <TopBar />
      <header className="page-heading"><h1>Your body, your pace.</h1><p>Watch the trend, not just a single number.</p></header>
      <div className="px-margin-mobile pt-sm space-y-xl">
        <button onClick={() => setShowLog(true)} className="w-full py-3 rounded-full bg-lime text-on-lime font-metric-md text-metric-md flex items-center justify-center gap-2 active:scale-[0.98] transition">
          <Icon name="add" /> Log weigh-in
        </button>
        <nav className="page-switch" aria-label="Body views">
          {(['weight', 'photos', 'measurements'] as Tab[]).map((t) => (
            <button
              key={t}
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className={`whitespace-nowrap px-md py-sm rounded-full font-label-caps text-label-caps tracking-wider uppercase transition ${
                tab === t ? 'bg-lime text-on-lime' : 'bg-transparent border border-outline-variant text-on-surface-variant'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        {tab === 'weight' && (
          <>
            <div className="grid grid-cols-2 gap-gutter">
              <div className="bg-lime text-on-lime rounded-2xl p-md flex flex-col justify-between min-h-[130px]">
                <span className="font-label-caps text-label-caps uppercase opacity-70">Current Weight</span>
                <div className="mt-auto flex items-baseline gap-xs">
                  <span className="font-display-hero text-display-hero leading-none">{latestDisp.toFixed(1)}</span>
                  <span className="font-metric-md text-metric-md opacity-70">{unit}</span>
                </div>
              </div>
              <div className="bg-ink-card text-on-surface border border-tile-border rounded-2xl p-md flex flex-col justify-between min-h-[130px]">
                <span className="font-label-caps text-label-caps uppercase opacity-70">Change since start</span>
                <div className="mt-auto flex items-baseline gap-xs">
                  <Icon name={change <= 0 ? 'trending_down' : 'trending_up'} fill size={24} />
                  <span className="font-display-hero text-display-hero leading-none">{dispChange < 0.05 ? '' : change < 0 ? '−' : '+'}{dispChange.toFixed(1)}</span>
                  <span className="font-metric-md text-metric-md opacity-70">{unit}</span>
                </div>
              </div>
            </div>

            <section className="bg-ink-card border border-tile-border rounded-[24px] p-md flex flex-col gap-md">
              <div className="flex justify-between items-center">
                <SectionLabel>Weight Trend</SectionLabel>
                <span className="font-data-mono text-[12px] text-on-surface-variant">7-day rolling avg</span>
              </div>
              <Sparkline points={trendDisp} displayValue={latestDisp} unit={unit} />
              {sorted.length > 1 && (
                <div className="flex justify-between font-data-mono text-[12px] text-on-surface-variant">
                  <span>{shortDate(sorted[0].date)}</span>
                  <span>{shortDate(sorted[sorted.length - 1].date)}</span>
                </div>
              )}
            </section>
            <details className="body-scenario"><summary><span>Explore a calorie scenario</span><Icon name="expand_more" size={21} /></summary><WeightOutlook profile={profile} weightKg={latest?.weightKg ?? profile.startWeightKg} /></details>
          </>
        )}

        {tab === 'measurements' && (
          <section className="bg-ink-card border border-tile-border rounded-[24px] p-lg flex flex-col gap-lg">
            <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Composition Estimates</h3>
            {bf == null ? (
              <p className="font-body-md text-body-md text-on-surface-variant">
                Add a weigh-in with neck &amp; waist (and hip for women) measurements to estimate body fat via the Navy method.
              </p>
            ) : (
              <div className="flex flex-col gap-md">
                <CompRow label="Body Fat" value={`${bf}%`} pct={bf} bar="bg-pink" note={fat ? `${fat} kg fat mass` : ''} />
                <CompRow label="Lean Mass" value={`${lean} kg`} pct={lean && latest ? (lean / latest.weightKg) * 100 : 0} bar="bg-lime" note="Navy method estimate" />
              </div>
            )}
          </section>
        )}

        {tab === 'photos' && (
          <section className="space-y-md">
            <div className="flex items-center justify-between">
              <SectionLabel>Progress Photos</SectionLabel>
              <span className="font-data-mono text-[11px] text-on-surface-variant flex items-center gap-1"><Icon name="lock" size={14} /> On-device only</span>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
            <div className="grid grid-cols-2 gap-md">
              <button onClick={() => fileRef.current?.click()} className="aspect-[3/4] rounded-xl border-2 border-dashed border-outline-variant flex flex-col items-center justify-center gap-sm text-on-surface-variant hover:border-primary hover:text-primary transition">
                <Icon name="add_a_photo" size={32} />
                <span className="font-label-caps text-label-caps uppercase">Add Photo</span>
              </button>
              {[...state.photos].reverse().map((p) => (
                <PhotoCell key={p.id} photo={p} onDelete={() => removePhoto(p.id)} />
              ))}
            </div>
          </section>
        )}

        <div className="bg-lime/10 border-l-2 border-lime rounded-r-[20px] rounded-bl-[20px] p-md flex gap-md items-start">
          <Icon name="lightbulb" fill className="text-lime mt-0.5" />
          <p className="font-body-md text-body-md text-on-surface leading-relaxed">{leanMassInsight(profile, state.weights)}</p>
        </div>


      </div>

      {showLog && <WeighInSheet onClose={() => setShowLog(false)} onSave={(e) => { addWeight(e); setShowLog(false) }} units={profile.units} />}
    </div>
  )
}

function CompRow({ label, value, pct, bar, note }: { label: string; value: string; pct: number; bar: string; note: string }) {
  return (
    <div className="flex flex-col gap-sm">
      <div className="flex justify-between items-baseline">
        <SectionLabel>{label}</SectionLabel>
        <span className="font-metric-md text-metric-md text-on-surface">{value}</span>
      </div>
      <ProgressBar pct={pct} color={bar} />
      {note && <span className="font-data-mono text-[12px] text-on-surface-variant self-end">{note}</span>}
    </div>
  )
}

function PhotoCell({ photo, onDelete }: { photo: ProgressPhoto; onDelete: () => void }) {
  return (
    <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-tile-border group">
      <img src={photo.dataUrl} alt={`Progress ${photo.date}`} className="w-full h-full object-cover" />
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-sm">
        <span className="font-data-mono text-[11px] text-white">{shortDate(photo.date)}</span>
      </div>
      <button onClick={onDelete} className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
        <Icon name="close" size={16} />
      </button>
    </div>
  )
}

function WeighInSheet({ onClose, onSave, units }: { onClose: () => void; onSave: (e: WeightEntry) => void; units: 'metric' | 'imperial' }) {
  const [weight, setWeight] = useState('')
  const [neck, setNeck] = useState('')
  const [waist, setWaist] = useState('')
  const [hip, setHip] = useState('')
  const [error, setError] = useState('')
  const dialogRef = useDialogFocus(onClose)
  const cls = 'w-full bg-surface border border-outline-variant rounded-lg px-md py-2 text-on-surface font-data-mono focus:border-primary focus:outline-none'
  const unit = weightUnit(units)

  function save() {
    const w = Number(weight)
    if (!Number.isFinite(w) || w <= 0) { setError('Enter a valid weight greater than zero.'); return }
    if ([neck, waist, hip].some(value => value !== '' && (!Number.isFinite(Number(value)) || Number(value) <= 0))) { setError('Measurements must be positive numbers, or left empty.'); return }
    const entry: WeightEntry = { id: uid(), date: todayISO(), weightKg: Math.round(fromDisplayWeight(w, units) * 10) / 10 }
    if (neck) entry.neckCm = +neck
    if (waist) entry.waistCm = +waist
    if (hip) entry.hipCm = +hip
    onSave(entry)
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="weigh-in-title" tabIndex={-1} className="relative w-full max-w-[480px] bg-ink-card border-t border-tile-border rounded-t-[28px] p-margin-mobile pb-xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-outline-variant rounded-full mx-auto mb-md" />
        <div className="flex items-center justify-between mb-lg"><h2 id="weigh-in-title" className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Log weigh-in</h2><button type="button" onClick={onClose} aria-label="Close weigh-in" className="w-11 h-11 grid place-items-center rounded-full text-on-surface-variant"><Icon name="close" /></button></div>
        <div className="flex flex-col gap-md">
          <label className="flex flex-col gap-1">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Weight ({unit})</span>
            <input type="number" step="0.1" min="0.1" aria-describedby={error ? 'weigh-in-error' : undefined} className={cls} value={weight} onChange={(e) => setWeight(e.target.value)} />
          </label>
          <p className="font-data-mono text-[12px] text-on-surface-variant">Optional — for body-fat estimate (cm):</p>
          <div className="grid grid-cols-3 gap-md">
            <label className="flex flex-col gap-1"><span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Neck</span><input type="number" className={cls} value={neck} onChange={(e) => setNeck(e.target.value)} /></label>
            <label className="flex flex-col gap-1"><span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Waist</span><input type="number" className={cls} value={waist} onChange={(e) => setWaist(e.target.value)} /></label>
            <label className="flex flex-col gap-1"><span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Hip</span><input type="number" className={cls} value={hip} onChange={(e) => setHip(e.target.value)} /></label>
          </div>
          {error && <p id="weigh-in-error" role="alert" className="text-error text-sm">{error}</p>}
          <button onClick={save} className="py-3 rounded-full bg-lime text-on-lime font-metric-md text-metric-md mt-sm">Save</button>
        </div>
      </div>
    </div>, document.body
  )
}
