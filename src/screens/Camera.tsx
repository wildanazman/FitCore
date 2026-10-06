import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { Icon } from '../components/Icon'
import { detectFood, foodAIUsage, recordFoodAIUsage, slotForNow, type Detection, type FoodAIProvider } from '../lib/foodAI'
import { lookupFood, sourceLabel } from '../lib/foodLookup'
import { todayISO, uid } from '../lib/date'
import type { FoodEntry, MealSlot } from '../types'
import './camera.css'

type Phase = 'capture' | 'analyzing' | 'result' | 'edit'

export function Camera() {
  const { profile, addFood } = useApp()
  const nav = useNavigate()
  const galleryRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [phase, setPhase] = useState<Phase>('capture')
  const [photo, setPhoto] = useState<string | null>(null)
  const [det, setDet] = useState<Detection | null>(null)
  const [servings, setServings] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraRequested, setCameraRequested] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [provider, setProvider] = useState<FoodAIProvider>('auto')
  const [mealSlot, setMealSlot] = useState<MealSlot>(slotForNow())

  useEffect(() => {
    if (phase !== 'capture' || photo || !cameraRequested) {
      stopCamera()
      return
    }

    let cancelled = false
    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Live camera is not available on this browser. Add a photo instead.')
        return
      }
      setCameraError(null)
      setCameraReady(false)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1920 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
        }
        setCameraReady(true)
      } catch {
        setCameraError('Camera permission blocked or unavailable. Add a photo from gallery.')
      }
    }

    startCamera()
    return () => {
      cancelled = true
      stopCamera()
    }
  }, [phase, photo, cameraRequested])

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraReady(false)
  }

  async function analyzePhoto(dataUrl: string) {
    setPhoto(dataUrl)
    setPhase('analyzing')
    setError(null)
    stopCamera()
    try {
      const result = await detectFood(dataUrl, profile.anthropicApiKey, provider)
      recordFoodAIUsage(result.source)
      setDet({ ...result, requestedProvider: provider })
      setServings(1)
      setPhase('result')
    } catch {
      setError('Detection failed. Try again or log manually.')
      setPhase('result')
    }
  }

  function retryCapture() {
    setPhoto(null)
    setDet(null)
    setError(null)
    setCameraRequested(false)
    setCameraError(null)
    setPhase('capture')
  }

  async function retryAnalysis() {
    if (!photo || phase === 'analyzing') return
    await analyzePhoto(photo)
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await fileToCompressedDataUrl(file)
    e.target.value = ''
    await analyzePhoto(dataUrl)
  }

  async function captureLivePhoto() {
    const video = videoRef.current
    if (!video || video.readyState < 2) {
      setCameraError('Camera is still warming up. Try again in a second.')
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setCameraError('Could not capture this frame. Add a photo instead.')
      return
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    await analyzePhoto(canvas.toDataURL('image/jpeg', 0.86))
  }

  function confirm() {
    if (!det) return
    const entry: FoodEntry = {
      id: uid(),
      name: det.name,
      emoji: '',
      date: todayISO(),
      loggedAt: new Date().toISOString(),
      slot: mealSlot,
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

  async function updateDetectionFromName(name: string) {
    const result = await lookupFood(name)
    setDet((current) => ({
      ...(current ?? det ?? {
        name: result.name,
        emoji: '',
        kcal: result.kcal,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        confidence: result.confidence,
      }),
      name: result.name,
      emoji: '',
      kcal: result.kcal,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat,
      confidence: result.confidence,
      source: result.source,
      items: [{ name: `${result.name} · ${result.serving}`, kcal: result.kcal }],
      assumptions: result.note,
      note: `Updated from ${sourceLabel(result.source)} (${result.serving}).`,
    }))
    setServings(1)
  }

  const confidenceHigh = (det?.confidence ?? 0) >= 0.85
  const breakdownItems = det?.items?.length ? det.items : det ? [{ name: det.name, kcal: det.kcal }] : []

  return (
    <div className={`app-shell camera-shell camera-${phase} flex flex-col items-center justify-end relative overflow-hidden`}>
      {/* Background */}
      {photo && phase === 'analyzing' ? (
        <div className="absolute inset-0 bg-cover bg-center blur-sm" style={{ backgroundImage: `url(${photo})` }}>
          <div className="absolute inset-0 bg-background/60" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-[#101b2d]" />
      )}

      {/* Top actions */}
      {(phase === 'capture' || phase === 'analyzing') && <div className="absolute top-0 left-0 w-full p-margin-mobile flex justify-between items-center z-30 pt-lg">
        <button onClick={() => nav('/food')} className="w-12 h-12 flex items-center justify-center rounded-full bg-surface/50 backdrop-blur-md border border-outline-variant text-on-surface" aria-label="Close food capture">
          <Icon name="close" />
        </button>
        {photo && phase !== 'analyzing' && (
          <button onClick={retryCapture} className="w-12 h-12 flex items-center justify-center rounded-full bg-surface/50 backdrop-blur-md border border-outline-variant text-on-surface" aria-label="Retry scan">
            <Icon name="refresh" />
          </button>
        )}
      </div>}

      {/* No capture attribute: opens the photo library / file picker instead of the camera */}
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {/* Capture phase */}
      {phase === 'capture' && (
        <>
          <video
            ref={videoRef}
            className={`absolute inset-0 h-full w-full object-contain bg-black transition-opacity duration-300 ${cameraReady ? 'opacity-100' : 'opacity-0'}`}
            playsInline
            muted
            autoPlay
          />
          <div className="absolute inset-0 z-10 bg-gradient-to-b from-black/55 via-transparent to-black/80" />
          {!cameraReady && (
            <div className="camera-idle-visual">
              <div className="camera-idle-icon">
                {cameraRequested && !cameraError && <div className="absolute inset-0 border-t-2 border-lime rounded-full animate-spin" />}
                <Icon name={cameraError ? 'no_photography' : 'photo_camera'} size={34} className="text-lime" />
              </div>
              {(cameraError || cameraRequested) && <p>{cameraError ?? 'Opening live camera...'}</p>}
            </div>
          )}
          <div className="camera-capture-controls z-20 flex w-full flex-col items-center text-center px-margin-mobile pb-xl gap-lg">
            <div className="camera-status" aria-live="polite">
              <span className="font-label-caps text-label-caps uppercase tracking-widest text-lime">
                {cameraReady ? 'Live camera is ready' : 'Camera opens only when you tap'}
              </span>
            </div>
            <div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">Capture your meal.</h1>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
                Point at your food, snap, or add a photo from gallery.
              </p>
            </div>
            <details className="w-full max-w-sm text-left rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-on-surface-variant">
              <summary className="cursor-pointer font-data-mono text-[11px]">Analysis options</summary>
              <div className="pt-3"><ProviderPicker value={provider} onChange={setProvider} /><p className="mt-2 text-[11px] leading-snug">For offline logging, search the on-device food list from Food. A photo still needs an online vision service.</p></div>
            </details>
            <div className="flex items-center gap-lg">
              <button
                onClick={() => galleryRef.current?.click()}
                className="w-14 h-14 rounded-full bg-ink-card border border-white/15 text-on-surface flex items-center justify-center active:scale-95 transition"
                aria-label="Upload from gallery"
              >
                <Icon name="photo_library" size={24} />
              </button>
              <button
                onClick={cameraReady ? captureLivePhoto : () => setCameraRequested(true)}
                className="w-20 h-20 rounded-full bg-lime text-on-lime flex items-center justify-center shadow-[0_0_24px_rgba(201,242,78,0.45)] active:scale-95 transition disabled:opacity-60"
                aria-label="Take photo"
                disabled={cameraRequested && !cameraReady && !cameraError}
              >
                <Icon name="photo_camera" fill size={36} />
              </button>
              <div className="w-14 h-14" aria-hidden="true" />
            </div>
            <p className="font-data-mono text-[11px] text-on-surface-variant">{cameraReady ? 'Tap to take photo' : 'Tap camera to enable it, or choose a saved photo'}</p>
          </div>
        </>
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

      {/* Result / edit screen */}
      {(phase === 'result' || phase === 'edit') && det && (
        <div className="camera-result-screen">
          <div className="camera-result-scroll">
            <header className="camera-result-header"><button type="button" onClick={() => phase === 'edit' ? setPhase('result') : nav('/food')} aria-label={phase === 'edit' ? 'Back to result' : 'Close result'}><Icon name="arrow_back" size={22} /></button><span>{phase === 'edit' ? 'EDIT ESTIMATE' : 'REVIEW YOUR MEAL'}</span><button type="button" onClick={retryCapture} aria-label="Take another photo"><Icon name="refresh" size={22} /></button></header>
            {phase === 'result' ? <>
              <div className="camera-result-hero"><div className="camera-result-photo">{photo && <img src={photo} alt="Meal being reviewed" />}</div><div className="camera-result-intro"><h1>{det.name}</h1><div className="camera-result-energy"><strong>{Math.round(det.kcal * servings).toLocaleString()}</strong><span>kcal estimated</span></div><p><Icon name={confidenceHigh ? 'verified' : 'info'} size={17} /> {confidenceHigh ? 'High confidence' : 'Review portion and ingredients'} · {Math.round(det.confidence * 100)}%</p></div></div>
              {error && <p className="camera-result-alert">{error}</p>}
              <div className="camera-result-macros"><MacroChip label="Protein" v={Math.round(det.protein * servings)} /><MacroChip label="Carbs" v={Math.round(det.carbs * servings)} /><MacroChip label="Fat" v={Math.round(det.fat * servings)} /></div>
              <section className="camera-result-section"><h2>Log this meal</h2><p>Choose where it belongs and check the portion.</p><div className="camera-result-slots" role="group" aria-label="Meal type">{(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((slot) => <button key={slot} type="button" aria-pressed={mealSlot === slot} onClick={() => setMealSlot(slot)}>{slot}</button>)}</div><div className="camera-result-quantity"><span>Servings</span><div><button type="button" aria-label="Decrease servings" disabled={servings <= 0.5} onClick={() => setServings((s) => Math.max(0.5, Math.round((s - 0.5) * 10) / 10))}><Icon name="remove" size={20} /></button><strong>{servings.toFixed(1)}</strong><button type="button" aria-label="Increase servings" onClick={() => setServings((s) => Math.round((s + 0.5) * 10) / 10)}><Icon name="add" size={20} /></button></div></div></section>
              {breakdownItems.length > 0 && <section className="camera-result-section"><h2>What we found</h2><div className="camera-result-breakdown">{breakdownItems.map((item, index) => <div key={index}><span>{item.name}{item.grams ? <small>{item.grams} g estimated</small> : null}</span><strong>{Math.round(item.kcal * servings)} <small>kcal</small></strong></div>)}</div></section>}
              {(det.assumptions || det.note) && <details className="camera-result-details"><summary>About this estimate <Icon name="expand_more" size={20} /></summary><div>{det.assumptions && <p>{det.assumptions}</p>}{det.note && <p>{det.note}</p>}</div></details>}
              <details className="camera-result-details"><summary>Analysis details <Icon name="expand_more" size={20} /></summary><div><p>Requested mode: {foodProviderLabel(det.requestedProvider ?? provider)}</p><p>Result source: {detectionSourceLabel(det.source)}</p><p>{detectionUsageLabel(det.source, foodAIUsage(det.source))}</p><button type="button" onClick={retryAnalysis}>Retry analysis with this photo</button></div></details>
            </> : <div className="camera-result-edit"><EditForm det={det} onChange={setDet} onLookup={updateDetectionFromName} onDone={() => setPhase('result')} /></div>}
          </div>
          {phase === 'result' && <div className="camera-result-actions"><button type="button" onClick={() => setPhase('edit')}><Icon name="edit" size={20} /> Edit</button><button type="button" onClick={confirm}>Save meal <Icon name="check" size={20} /></button></div>}
        </div>
      )}

      {phase === 'result' && error && !det && (
        <div className="w-full bg-ink-card rounded-t-[24px] shadow-[0px_8px_24px_rgba(0,0,0,0.5)] z-20 flex flex-col gap-md pt-lg pb-xl px-margin-mobile">
          <div className="w-12 h-1.5 bg-outline-variant rounded-full mx-auto mb-sm" />
          <div className="flex items-start gap-sm">
            <Icon name="error" size={22} className="text-error shrink-0" />
            <div>
              <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">AI unavailable</h2>
              <p className="font-body-md text-[13px] text-on-surface-variant mt-xs">No reliable calorie result was returned, so this photo was not guessed or saved. You can search the local food list instead.</p>
              <p className="font-data-mono text-[11px] text-error mt-sm break-words">{error}</p>
            </div>
          </div>
          <div className="flex gap-md mt-sm">
            <button onClick={retryAnalysis} className="flex-1 py-3 rounded-xl border border-outline-variant text-on-surface font-metric-md text-metric-md">Retry same photo</button>
            <button onClick={() => nav('/food')} className="flex-1 py-3 rounded-xl border border-lime text-lime font-metric-md text-metric-md">Search food list</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ProviderPicker({ value, onChange }: { value: FoodAIProvider; onChange: (value: FoodAIProvider) => void }) {
  const options: Array<{ value: FoodAIProvider; label: string; detail: string }> = [
    { value: 'auto', label: 'Auto', detail: 'Best available' },
    { value: 'gemini', label: 'Gemini', detail: 'Vision + web' },
    { value: 'anthropic', label: 'Anthropic', detail: 'Claude vision' },
  ]

  return (
    <div className="w-full max-w-sm text-left">
      <div className="flex items-center justify-between mb-2">
        <span className="font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant">Analysis engine</span>
        <span className="font-data-mono text-[10px] text-lime">{options.find((option) => option.value === value)?.detail}</span>
      </div>
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/15 bg-black/35 p-1 backdrop-blur-md">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-lg px-1 py-2 text-center transition ${value === option.value ? 'bg-lime text-on-lime' : 'text-on-surface-variant hover:bg-white/10'}`}
          >
            <span className="block font-metric-md text-[11px]">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function detectionSourceLabel(source: Detection['source']) {
  switch (source) {
    case 'gemini':
      return 'Gemini vision'
    case 'openai':
      return 'OpenAI vision'
    case 'claude':
      return 'Claude vision'
    case 'openfoodfacts':
      return 'Open Food Facts'
    case 'usda':
      return 'USDA FoodData Central'
    case 'local':
    default:
      return 'rough offline estimate'
  }
}

function foodProviderLabel(provider: FoodAIProvider) {
  switch (provider) {
    case 'auto':
      return 'Auto'
    case 'gemini':
      return 'Gemini'
    case 'anthropic':
      return 'Anthropic'
  }
}

function detectionUsageLabel(source: Detection['source'], usedThisMonth: number) {
  switch (source) {
    case 'local':
      return 'Usage: Unlimited · offline local reference'
    case 'gemini':
      return `Free tier: Gemini · ${usedThisMonth} request(s) today · Google Search has a shared daily limit; exact remaining is in AI Studio`
    case 'claude':
      return `Anthropic · ${usedThisMonth} request(s) today · free access is trial credit, not unlimited`
    case 'openfoodfacts':
      return `Free database: Open Food Facts · ${usedThisMonth} lookup(s) today`
    case 'usda':
      return `Free database: USDA FoodData Central · ${usedThisMonth} lookup(s) today`
    default:
      return `Usage: Provider API · ${usedThisMonth} request(s) today · remaining depends on provider quota`
  }
}

function MacroChip({ label, v }: { label: string; v: number }) {
  return (
    <div className="camera-result-macro"><span>{label}</span><strong>{v}<small>g</small></strong></div>
  )
}

function EditForm({
  det,
  onChange,
  onLookup,
  onDone,
}: {
  det: Detection
  onChange: (d: Detection) => void
  onLookup: (name: string) => Promise<void>
  onDone: () => void
}) {
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [lookupMessage, setLookupMessage] = useState<string | null>(null)
  const cls = 'w-full bg-surface border border-outline-variant rounded-lg px-md py-2 text-on-surface font-data-mono focus:border-primary focus:outline-none'
  const num = (k: 'kcal' | 'protein' | 'carbs' | 'fat') => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...det, [k]: +e.target.value })

  async function updateFromOnline() {
    const name = det.name.trim()
    if (!name || lookupState === 'loading') return
    setLookupState('loading')
    setLookupMessage(null)
    try {
      await onLookup(name)
      setLookupState('idle')
      setLookupMessage('Calories updated from online data.')
    } catch (err) {
      setLookupState('error')
      setLookupMessage(err instanceof Error ? err.message : 'Online lookup failed')
    }
  }

  return (
    <div className="flex flex-col gap-md">
      <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Edit meal</h2>
      <label className="flex flex-col gap-1">
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Name</span>
        <input className={cls} value={det.name} onChange={(e) => onChange({ ...det, name: e.target.value, confidence: 1 })} />
      </label>
      <button
        onClick={updateFromOnline}
        disabled={lookupState === 'loading' || !det.name.trim()}
        className="py-3 rounded-xl bg-lime text-on-lime font-metric-md text-metric-md hover:opacity-90 transition active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {lookupState === 'loading' ? (
          <>
            <Icon name="progress_activity" size={18} className="animate-spin" /> Updating...
          </>
        ) : (
          <>
            Update calories online <Icon name="travel_explore" size={18} />
          </>
        )}
      </button>
      {lookupMessage && (
        <p className={`font-data-mono text-[11px] ${lookupState === 'error' ? 'text-error' : 'text-lime'}`}>
          {lookupMessage}
        </p>
      )}
      <div className="grid grid-cols-2 gap-md">
        <NumField label="Calories" value={det.kcal} onChange={num('kcal')} cls={cls} />
        <NumField label="Protein g" value={det.protein} onChange={num('protein')} cls={cls} />
        <NumField label="Carbs g" value={det.carbs} onChange={num('carbs')} cls={cls} />
        <NumField label="Fat g" value={det.fat} onChange={num('fat')} cls={cls} />
      </div>
      <button onClick={onDone} className="py-3 rounded-xl bg-lime text-on-lime font-metric-md text-metric-md mt-sm">Review meal <Icon name="arrow_forward" size={18} /></button>
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
