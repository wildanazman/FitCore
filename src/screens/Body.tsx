import { useRef, useState } from 'react'
import { useApp } from '../store/AppContext'
import { TopBar } from '../components/TopBar'
import { ProgressBar, SectionLabel } from '../components/ui'
import { Sparkline } from '../components/Sparkline'
import { Icon } from '../components/Icon'
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

  const change = trend.length > 1 ? trend[trend.length - 1].kg - trend[0].kg : 0
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
    <div>
      <TopBar />
      <div className="px-margin-mobile pt-sm space-y-xl">
        <nav className="flex gap-sm overflow-x-auto pb-sm no-scrollbar">
          {(['weight', 'photos', 'measurements'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`whitespace-nowrap px-md py-sm rounded-full font-label-caps text-label-caps tracking-wider uppercase transition ${
                tab === t ? 'bg-primary text-on-primary' : 'bg-transparent border border-outline-variant text-on-surface-variant'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        {tab === 'weight' && (
          <>
            <div className="grid grid-cols-2 gap-gutter">
              <div className="bg-tile border border-tile-border rounded-xl p-md flex flex-col justify-between min-h-[130px] relative overflow-hidden">
                <SectionLabel>Current Weight</SectionLabel>
                <div className="mt-auto flex items-baseline gap-xs">
                  <span className="font-display-hero text-display-hero text-on-surface leading-none">{latestDisp.toFixed(1)}</span>
                  <span className="font-metric-md text-metric-md text-on-surface-variant">{unit}</span>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-surface-container-high" />
              </div>
              <div className="bg-tile border border-tile-border rounded-xl p-md flex flex-col justify-between min-h-[130px] relative overflow-hidden">
                <SectionLabel>8-Week Change</SectionLabel>
                <div className={`mt-auto flex items-baseline gap-xs ${change <= 0 ? 'text-secondary' : 'text-tertiary'}`}>
                  <Icon name={change <= 0 ? 'trending_down' : 'trending_up'} fill size={24} />
                  <span className="font-display-hero text-display-hero leading-none">{change <= 0 ? '-' : '+'}{dispChange.toFixed(1)}</span>
                  <span className="font-metric-md text-metric-md">{unit}</span>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-surface-container-high" />
              </div>
            </div>

            <section className="bg-tile border border-tile-border rounded-xl p-md flex flex-col gap-md">
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
          </>
        )}

        {tab === 'measurements' && (
          <section className="bg-tile border border-tile-border rounded-xl p-lg flex flex-col gap-lg">
            <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Composition Estimates</h3>
            {bf == null ? (
              <p className="font-body-md text-body-md text-on-surface-variant">
                Add a weigh-in with neck &amp; waist (and hip for women) measurements to estimate body fat via the Navy method.
              </p>
            ) : (
              <div className="flex flex-col gap-md">
                <CompRow label="Body Fat" value={`${bf}%`} pct={bf} bar="bg-tertiary" note={fat ? `${fat} kg fat mass` : ''} />
                <CompRow label="Lean Mass" value={`${lean} kg`} pct={lean && latest ? (lean / latest.weightKg) * 100 : 0} bar="bg-primary" note="Navy method estimate" />
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

        <div className="bg-primary/10 border-l-2 border-primary rounded-r-xl rounded-bl-xl p-md flex gap-md items-start">
          <Icon name="lightbulb" fill className="text-primary mt-0.5" />
          <p className="font-body-md text-body-md text-on-surface leading-relaxed">{leanMassInsight(profile, state.weights)}</p>
        </div>

        <button onClick={() => setShowLog(true)} className="w-full py-3 rounded-full bg-primary text-on-primary font-metric-md text-metric-md flex items-center justify-center gap-2 active:scale-[0.98] transition">
          <Icon name="add" /> Log weigh-in
        </button>
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
  const cls = 'w-full bg-surface border border-outline-variant rounded-lg px-md py-2 text-on-surface font-data-mono focus:border-primary focus:outline-none'
  const unit = weightUnit(units)

  function save() {
    const w = parseFloat(weight)
    if (!w) return
    const entry: WeightEntry = { id: uid(), date: todayISO(), weightKg: Math.round(fromDisplayWeight(w, units) * 10) / 10 }
    if (neck) entry.neckCm = +neck
    if (waist) entry.waistCm = +waist
    if (hip) entry.hipCm = +hip
    onSave(entry)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-[480px] bg-[#26262A] rounded-t-[24px] p-margin-mobile pb-xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-outline-variant rounded-full mx-auto mb-md" />
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface mb-lg">Log weigh-in</h2>
        <div className="flex flex-col gap-md">
          <label className="flex flex-col gap-1">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Weight ({unit})</span>
            <input type="number" step="0.1" className={cls} value={weight} onChange={(e) => setWeight(e.target.value)} autoFocus />
          </label>
          <p className="font-data-mono text-[12px] text-on-surface-variant">Optional — for body-fat estimate (cm):</p>
          <div className="grid grid-cols-3 gap-md">
            <label className="flex flex-col gap-1"><span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Neck</span><input type="number" className={cls} value={neck} onChange={(e) => setNeck(e.target.value)} /></label>
            <label className="flex flex-col gap-1"><span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Waist</span><input type="number" className={cls} value={waist} onChange={(e) => setWaist(e.target.value)} /></label>
            <label className="flex flex-col gap-1"><span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Hip</span><input type="number" className={cls} value={hip} onChange={(e) => setHip(e.target.value)} /></label>
          </div>
          <button onClick={save} className="py-3 rounded-full bg-primary text-on-primary font-metric-md text-metric-md mt-sm">Save</button>
        </div>
      </div>
    </div>
  )
}
