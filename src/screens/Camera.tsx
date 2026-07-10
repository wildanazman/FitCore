import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { Icon } from '../components/Icon'
import { detectFood, slotForNow, type Detection } from '../lib/foodAI'
import { todayISO, uid } from '../lib/date'
import type { FoodEntry } from '../types'

type Phase = 'capture' | 'analyzing' | 'result' | 'edit'

export function Camera() {
  const { profile, addFood } = useApp()
  const nav = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>('capture')
  const [photo, setPhoto] = useState<string | null>(null)
  const [det, setDet] = useState<Detection | null>(null)
  const [servings, setServings] = useState(1)
  const [error, setError] = useState<string | null>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await fileToCompressedDataUrl(file)
    e.target.value = ''
    setPhoto(dataUrl)
    setPhase('analyzing')
    setError(null)
    try {
      const result = await detectFood(dataUrl, profile.anthropicApiKey)
      setDet(result)
      setServings(1)
      setPhase('result')
    } catch {
      setError('Detection failed. Try again or log manually.')
      setPhase('result')
    }
  }

  function confirm() {
    if (!det) return
    const entry: FoodEntry = {
      id: uid(),
      name: det.name,
      emoji: det.emoji,
      date: todayISO(),
      loggedAt: new Date().toISOString(),
      slot: slotForNow(),
      kcal: det.kcal,
      protein: det.protein,
      carbs: det.carbs,
      fat: det.fat,
      servings,
      confidence: det.confidence,
      photo: photo ?? undefined,
    }
    addFood(entry)
    nav('/food')
  }

  const confidenceHigh = (det?.confidence ?? 0) >= 0.85

  return (
    <div className="app-shell flex flex-col items-center justify-end relative overflow-hidden">
      {/* Background */}
      {photo ? (
        <div className="absolute inset-0 bg-cover bg-center blur-sm" style={{ backgroundImage: `url(${photo})` }}>
          <div className="absolute inset-0 bg-background/60" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-surface-container-lowest flex items-center justify-center">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-container via-surface to-transparent" />
        </div>
      )}

      {/* Top actions */}
      <div className="absolute top-0 left-0 w-full p-margin-mobile flex justify-between items-center z-30 pt-lg">
        <button onClick={() => nav('/food')} className="w-12 h-12 flex items-center justify-center rounded-full bg-surface/50 backdrop-blur-md border border-outline-variant text-on-surface">
          <Icon name="close" />
        </button>
        {photo && phase !== 'analyzing' && (
          <button onClick={() => { setPhoto(null); setDet(null); setPhase('capture'); fileRef.current?.click() }} className="w-12 h-12 flex items-center justify-center rounded-full bg-surface/50 backdrop-blur-md border border-outline-variant text-on-surface">
            <Icon name="refresh" />
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      {/* No capture attribute — opens the photo library / file picker instead of the camera */}
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {/* Capture phase */}
      {phase === 'capture' && (
        <div className="z-20 flex flex-col items-center text-center px-margin-mobile pb-xl gap-lg">
          <div className="w-28 h-28 border-2 border-primary/40 rounded-full flex items-center justify-center">
            <Icon name="restaurant" size={48} className="text-primary" />
          </div>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Snap your meal</h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
              {profile.anthropicApiKey ? 'Live AI will estimate macros.' : 'Gemini vision estimates calories & macros in seconds.'}
            </p>
          </div>
          <div className="flex items-center gap-lg">
            <button
              onClick={() => galleryRef.current?.click()}
              className="w-14 h-14 rounded-full bg-ink-card border border-white/15 text-on-surface flex items-center justify-center active:scale-95 transition"
              aria-label="Upload from gallery"
            >
              <Icon name="photo_library" size={24} />
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-20 h-20 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-[0_0_24px_rgba(197,192,255,0.4)] active:scale-95 transition"
              aria-label="Take photo"
            >
              <Icon name="photo_camera" fill size={36} />
            </button>
            {/* spacer to keep the shutter centered */}
            <div className="w-14 h-14" aria-hidden="true" />
          </div>
          <p className="font-data-mono text-[11px] text-on-surface-variant">Snap with camera or upload from gallery</p>
        </div>
      )}

      {/* Analyzing */}
      {phase === 'analyzing' && (
        <div className="z-20 flex flex-col items-center pb-[36%] gap-md px-margin-mobile text-center">
          <div className="w-24 h-24 border-2 border-lime/30 rounded-full flex items-center justify-center relative">
            <div className="absolute inset-0 border-t-2 border-lime rounded-full animate-spin" />
            <Icon name="travel_explore" size={36} className="text-lime" />
          </div>
          <span className="font-label-caps text-label-caps text-lime uppercase tracking-widest">Analyzing…</span>
          <p className="font-body-md text-[13px] text-on-surface-variant max-w-[240px]">
            Identifying each item and looking up nutrition data on the web. This can take up to a minute — accuracy over speed.
          </p>
        </div>
      )}

      {/* Result / Edit bottom sheet */}
      {(phase === 'result' || phase === 'edit') && det && (
        <div className="w-full bg-[#26262A] rounded-t-[24px] shadow-[0px_8px_24px_rgba(0,0,0,0.5)] z-20 flex flex-col pt-sm pb-xl px-margin-mobile animate-fade-in" style={{ backdropFilter: 'blur(10px)' }}>
          <div className="w-12 h-1.5 bg-outline-variant rounded-full mx-auto mb-md" />

          {error && <p className="font-data-mono text-data-mono text-error mb-md text-center">{error}</p>}

          {phase === 'result' ? (
            <div className="flex flex-col gap-lg">
              <div className="flex flex-col gap-xs">
                <div className="flex justify-between items-start">
                  <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{det.emoji} {det.name}</h2>
                  <div className={`flex items-center gap-1 ${confidenceHigh ? 'text-secondary' : 'text-tertiary'}`}>
                    <Icon name={confidenceHigh ? 'verified' : 'help'} size={16} />
                    <span className="font-label-caps text-label-caps uppercase">{Math.round(det.confidence * 100)}% {confidenceHigh ? 'confident' : 'review'}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-data-mono text-[11px] text-on-surface-variant uppercase">
                    Source: {det.source === 'gemini' ? 'Gemini vision' : det.source === 'openai' ? 'OpenAI vision' : det.source === 'claude' ? 'Claude vision' : 'rough offline estimate'}
                  </span>
                  {det.note && <span className="font-data-mono text-[11px] text-tertiary">{det.note}</span>}
                </div>
                <div className="flex items-baseline gap-2 mt-sm">
                  <span className="font-display-hero text-display-hero text-primary">{Math.round(det.kcal * servings)}</span>
                  <span className="font-metric-md text-metric-md text-on-surface-variant">kcal</span>
                </div>
              </div>

              {/* Web-grounded breakdown */}
              {det.items && det.items.length > 0 && (
                <div className="bg-surface rounded-xl border border-outline-variant p-sm">
                  <span className="font-label-caps text-label-caps uppercase text-on-surface-variant">Breakdown</span>
                  <div className="mt-sm space-y-1">
                    {det.items.map((it, i) => (
                      <div key={i} className="flex justify-between font-data-mono text-[12px]">
                        <span className="text-on-surface truncate pr-2">{it.name}{it.grams ? ` · ${it.grams}g` : ''}</span>
                        <span className="text-on-surface-variant shrink-0">{Math.round(it.kcal * servings)} kcal</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {det.assumptions && (
                <p className="font-body-md text-[12px] text-on-surface-variant -mt-sm flex gap-1.5">
                  <Icon name="info" size={14} className="text-tertiary shrink-0 mt-0.5" />
                  {det.assumptions}
                </p>
              )}

              <div className="grid grid-cols-3 gap-sm">
                <MacroChip label="Protein" v={Math.round(det.protein * servings)} color="text-tertiary" bar="bg-tertiary" />
                <MacroChip label="Carbs" v={Math.round(det.carbs * servings)} color="text-secondary" bar="bg-secondary" />
                <MacroChip label="Fat" v={Math.round(det.fat * servings)} color="text-error" bar="bg-error" />
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between bg-surface p-sm rounded-xl border border-outline-variant">
                <span className="font-metric-md text-metric-md text-on-surface ml-sm">Quantity</span>
                <div className="flex items-center gap-md">
                  <button onClick={() => setServings((s) => Math.max(0.5, Math.round((s - 0.5) * 10) / 10))} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-variant text-on-surface hover:bg-outline-variant transition">
                    <Icon name="remove" />
                  </button>
                  <div className="flex flex-col items-center w-16">
                    <span className="font-metric-md text-metric-md text-on-surface">{servings.toFixed(1)}</span>
                    <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Serving</span>
                  </div>
                  <button onClick={() => setServings((s) => Math.round((s + 0.5) * 10) / 10)} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-variant text-on-surface hover:bg-outline-variant transition">
                    <Icon name="add" />
                  </button>
                </div>
              </div>

              <div className="flex gap-md mt-sm">
                <button onClick={() => setPhase('edit')} className="flex-1 py-4 rounded-xl border border-outline-variant bg-transparent text-on-surface font-metric-md text-metric-md hover:bg-surface-variant transition active:scale-95 flex justify-center items-center gap-2">
                  <Icon name="edit" /> Edit
                </button>
                <button onClick={confirm} className="flex-[2] py-4 rounded-xl bg-lime text-on-lime font-metric-md text-metric-md hover:opacity-90 transition active:scale-95 shadow-[0_0_18px_rgba(201,242,78,0.35)] flex justify-center items-center gap-2">
                  Confirm <Icon name="check" />
                </button>
              </div>
            </div>
          ) : (
            <EditForm det={det} onChange={setDet} onDone={() => setPhase('result')} />
          )}
        </div>
      )}
    </div>
  )
}

function MacroChip({ label, v, color, bar }: { label: string; v: number; color: string; bar: string }) {
  return (
    <div className="flex flex-col items-center justify-center bg-surface p-sm rounded-lg border border-outline-variant">
      <span className={`font-label-caps text-label-caps uppercase mb-1 ${color}`}>{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="font-data-mono text-data-mono text-on-surface">{v}</span>
        <span className="font-label-caps text-label-caps text-on-surface-variant">g</span>
      </div>
      <div className="w-full h-1 bg-surface-variant mt-2 rounded-full overflow-hidden">
        <div className={`h-full ${bar}`} style={{ width: `${Math.min(100, v)}%` }} />
      </div>
    </div>
  )
}

function EditForm({ det, onChange, onDone }: { det: Detection; onChange: (d: Detection) => void; onDone: () => void }) {
  const cls = 'w-full bg-surface border border-outline-variant rounded-lg px-md py-2 text-on-surface font-data-mono focus:border-primary focus:outline-none'
  const num = (k: 'kcal' | 'protein' | 'carbs' | 'fat') => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...det, [k]: +e.target.value })
  return (
    <div className="flex flex-col gap-md">
      <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Edit meal</h2>
      <label className="flex flex-col gap-1">
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Name</span>
        <input className={cls} value={det.name} onChange={(e) => onChange({ ...det, name: e.target.value, confidence: 1 })} />
      </label>
      <div className="grid grid-cols-2 gap-md">
        <NumField label="Calories" value={det.kcal} onChange={num('kcal')} cls={cls} />
        <NumField label="Protein g" value={det.protein} onChange={num('protein')} cls={cls} />
        <NumField label="Carbs g" value={det.carbs} onChange={num('carbs')} cls={cls} />
        <NumField label="Fat g" value={det.fat} onChange={num('fat')} cls={cls} />
      </div>
      <button onClick={onDone} className="py-3 rounded-full bg-primary text-on-primary font-metric-md text-metric-md mt-sm">Done</button>
    </div>
  )
}

function NumField({ label, value, onChange, cls }: { label: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; cls: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">{label}</span>
      <input type="number" className={cls} value={value} onChange={onChange} />
    </label>
  )
}

function fileToCompressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const maxSide = 1280
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not prepare image'))
          return
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.86))
      }
      img.onerror = () => reject(new Error('Could not read image'))
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
