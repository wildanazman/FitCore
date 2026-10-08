import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { hasExcludedIngredients } from '../../shared/foodSuitability.js'
import { Icon } from '../components/Icon'
import { LogDatePicker } from '../components/LogDatePicker'
import { detectFood, foodAIUsage, recordFoodAIUsage, slotForNow, type Detection, type DetectionItem } from '../lib/foodAI'
import { GeminiModelPicker } from '../components/GeminiModelPicker'
import { geminiModelOrDefault } from '../../shared/geminiModels.js'
import { lookupFood, sourceLabel } from '../lib/foodLookup'
import { isLogDate, timestampOnDate, todayISO, uid } from '../lib/date'
import type { FoodEntry, MealSlot } from '../types'
import './camera.css'
import './capture-studio.css'
import { CorrectMealComponent } from '../components/CorrectMealComponent'

type Phase = 'capture' | 'analyzing' | 'result' | 'edit'

function componentTotals(det: Detection): Detection {
  if(!det.items?.length || !det.items.every(item=>[item.protein,item.carbs,item.fat].every(n=>typeof n==='number'&&Number.isFinite(n))))return det
  const sum=(key:'kcal'|'protein'|'carbs'|'fat')=>det.items!.reduce((total,item)=>total+(item[key]??0),0)
  return {...det,kcal:sum('kcal'),protein:sum('protein'),carbs:sum('carbs'),fat:sum('fat')}
}

export function Camera() {
  const { profile, addFood, updateProfile } = useApp()
  const nav = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedDate = searchParams.get('date') ?? ''
  const logDate = isLogDate(requestedDate) ? requestedDate : todayISO()
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
  const [mealSlot, setMealSlot] = useState<MealSlot>(slotForNow())
  const [correcting,setCorrecting]=useState<number|null>(null)
  const [facing,setFacing]=useState<'environment'|'user'>('environment')
  const [orientation,setOrientation]=useState<'portrait'|'landscape'>('portrait')
  const [captureMode,setCaptureMode]=useState<'meal'|'drink'>('meal')

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
          video: { facingMode: { ideal: facing }, aspectRatio: { ideal: orientation === 'portrait' ? 3/4 : 4/3 }, width: { ideal: 1280 }, height: { ideal: 1920 } },
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
  }, [phase, photo, cameraRequested, facing, orientation])

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraReady(false)
  }

  async function analyzePhoto(dataUrl: string) {
    setDet(null)
    setCorrecting(null)
    setPhoto(dataUrl)
    setPhase('analyzing')
    setError(null)
    stopCamera()
    try {
      const result = await detectFood(dataUrl, geminiModelOrDefault(profile.geminiModel))
      recordFoodAIUsage(result.source)
      setDet(componentTotals(result))
      setServings(1)
      setPhase('result')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Detection failed. Try another model or search the food list.')
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
    if (hasExcludedIngredients(det.name)) { setError('This food is excluded by FitCore’s halal-only food policy.'); return }
    const entry: FoodEntry = {
      id: uid(),
      name: det.name,
      emoji: '',
      date: logDate,
      loggedAt: timestampOnDate(logDate),
      slot: mealSlot,
      kcal: det.kcal,
      protein: det.protein,
      carbs: det.carbs,
      fat: det.fat,
      servings,
      confidence: det.confidence,
      photo: photo ?? undefined,
      components: det.items,
    }
    addFood(entry)
    nav(`/food?date=${logDate}`)
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
  const breakdownItems: DetectionItem[] = det?.items?.length ? det.items : det ? [{ name: det.name, kcal: det.kcal }] : []
  function changeComponent(index: number, factor: number) {
    if (!det?.items || !det.items.every(item => [item.protein,item.carbs,item.fat].every(value => typeof value === 'number' && Number.isFinite(value)))) return
    const items=det.items.map((item,i)=>i!==index?item:{...item,portion:undefined,grams:item.grams?item.grams*factor:undefined,kcal:item.kcal*factor,protein:item.protein!*factor,carbs:item.carbs!*factor,fat:item.fat!*factor})
    setDet(componentTotals({...det,items}))
  }
  function replaceComponent(index:number,item:DetectionItem) {
    if(!det)return
    const items=det.items?.length?det.items:[{name:det.name,kcal:det.kcal,protein:det.protein,carbs:det.carbs,fat:det.fat}]
    if(!items.every(part=>[part.protein,part.carbs,part.fat].every(value=>typeof value==='number'&&Number.isFinite(value)))){setError('This result has no per-food macros. Retry analysis first, or edit the whole meal estimate.');return}
    const next=items.map((part,i)=>i===index?item:part)
    setDet(componentTotals({...det,items:next,name:items.length===1?item.name:det.name,note:'Food corrected using a serving reference. Check the portion; reference values are not a measurement of your photo.'}))
    setCorrecting(null)
  }

  return (
    <div className={`app-shell camera-shell camera-${phase} camera-frame-${orientation} flex flex-col items-center justify-end relative overflow-hidden`}>
      {/* Background */}
      <div className="camera-backdrop absolute inset-0" />

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
          <div className="capture-studio">
            <h1>Scan your meal</h1>
            <div className="capture-modes" role="group" aria-label="Capture framing guide">{(['meal','drink'] as const).map(mode=><button type="button" key={mode} aria-pressed={captureMode===mode} onClick={()=>setCaptureMode(mode)}><Icon name={mode==='meal'?'restaurant':'local_cafe'} size={19}/>{mode==='meal'?'Meal':'Drink'}</button>)}</div>
            <div className={`capture-preview ${cameraReady?'is-live':''}`}>
              <video ref={videoRef} playsInline muted autoPlay className={cameraReady?'opacity-100':'opacity-0'}/>
              {!cameraReady&&<button type="button" className="capture-preview-start" onClick={()=>setCameraRequested(true)} disabled={cameraRequested&&!cameraError}><Icon name={cameraRequested&&!cameraError?'progress_activity':'photo_camera'} className={cameraRequested&&!cameraError?'animate-spin':''} size={34}/><strong>{cameraRequested&&!cameraError?'Opening camera…':'Bring your food into focus.'}</strong><span>Tap to open your camera</span></button>}
              <span className="capture-frame-corner corner-tl"/><span className="capture-frame-corner corner-tr"/><span className="capture-frame-corner corner-bl"/><span className="capture-frame-corner corner-br"/>
              <button type="button" className="capture-rotate" onClick={()=>setOrientation(value=>value==='portrait'?'landscape':'portrait')} aria-label={orientation==='portrait'?'Switch to landscape frame':'Switch to portrait frame'}><Icon name="screen_rotation" size={20}/>{orientation==='portrait'?'3:4':'4:3'}</button>
            </div>
            <p className="capture-guide" aria-live="polite">{cameraError??(captureMode==='meal'?'Whole plate in frame. A little daylight helps.':'Include the full cup and its size or label.')}</p>
            <div className="capture-controls"><button type="button" onClick={()=>galleryRef.current?.click()} aria-label="Upload from gallery"><Icon name="photo_library" size={25}/><span>Gallery</span></button><button type="button" className="capture-shutter" onClick={cameraReady?captureLivePhoto:()=>setCameraRequested(true)} aria-label={cameraReady?'Take photo':'Open camera'} disabled={cameraRequested&&!cameraReady&&!cameraError}><span><Icon name="photo_camera" size={30}/></span></button><button type="button" onClick={()=>setFacing(value=>value==='environment'?'user':'environment')} aria-label={facing==='environment'?'Switch to front camera':'Switch to back camera'}><Icon name="flip_camera_ios" size={25}/><span>{facing==='environment'?'Back':'Front'}</span></button></div>
            <p className="capture-shutter-label">{cameraReady?'Tap to capture & review':'Open camera, or pick a saved photo'}</p>
            <details className="capture-options"><summary>Analysis options <Icon name="expand_more" size={18}/></summary><GeminiModelPicker id="camera-gemini-model" value={profile.geminiModel} onChange={geminiModel => updateProfile({ geminiModel })}/><p>Google Search can have separate charges. Nothing is logged until you confirm.</p></details>
          </div>
        </>
      )}

      {/* Analyzing */}
      {phase === 'analyzing' && (
        <section className="camera-analysis" aria-live="polite" aria-busy="true">
          {photo&&<img src={photo} alt="Meal photo being analysed"/>}
          <h1>A closer look at your plate.</h1>
          <p>Estimating the foods, portions and nutrition in your photo. You'll review the result before anything is saved.</p>
          <div className="camera-analysis-status"><Icon name="progress_activity" className="animate-spin" size={20}/><span>Analysis in progress</span></div>
          <small>A photo is an estimate—not a measurement. Sauces, oil and portion sizes may need correction.</small>
        </section>
      )}

      {/* Result / edit screen */}
      {(phase === 'result' || phase === 'edit') && det && (
        <div className="camera-result-screen">
          <div className="camera-result-scroll">
            <header className="camera-result-header"><button type="button" onClick={() => phase === 'edit' ? setPhase('result') : nav(`/food?date=${logDate}`)} aria-label={phase === 'edit' ? 'Back to result' : 'Close result'}><Icon name="arrow_back" size={22} /></button><span>{phase === 'edit' ? 'EDIT ESTIMATE' : 'REVIEW YOUR MEAL'}</span><button type="button" onClick={retryCapture} aria-label="Take another photo"><Icon name="refresh" size={22} /></button></header>
            <LogDatePicker date={logDate} onChange={(date) => setSearchParams({ date }, { replace: true })} />
            {phase === 'result' ? <>
              <div className="camera-result-hero"><div className="camera-result-photo">{photo && <img src={photo} alt="Meal being reviewed" />}</div><div className="camera-result-intro"><h1>{det.name}</h1><div className="camera-result-energy"><strong>{Math.round(det.kcal * servings).toLocaleString()}</strong><span>kcal estimated</span></div><p><Icon name={confidenceHigh ? 'verified' : 'info'} size={17} /> {confidenceHigh ? 'High confidence' : 'Review portion and ingredients'} · {Math.round(det.confidence * 100)}%</p></div></div>
              {error && <p className="camera-result-alert">{error}</p>}
              <div className="camera-result-macros"><MacroChip label="Protein" v={Math.round(det.protein * servings)} /><MacroChip label="Carbs" v={Math.round(det.carbs * servings)} /><MacroChip label="Fat" v={Math.round(det.fat * servings)} /></div>
              <section className="camera-result-section"><h2>Log this meal</h2><p>Choose where it belongs and check the portion.</p><div className="camera-result-slots" role="group" aria-label="Meal type">{(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((slot) => <button key={slot} type="button" aria-pressed={mealSlot === slot} onClick={() => setMealSlot(slot)}>{slot}</button>)}</div><div className="camera-result-quantity"><span>Servings</span><div><button type="button" aria-label="Decrease servings" disabled={servings <= 0.5} onClick={() => setServings((s) => Math.max(0.5, Math.round((s - 0.5) * 10) / 10))}><Icon name="remove" size={20} /></button><strong>{servings.toFixed(1)}</strong><button type="button" aria-label="Increase servings" onClick={() => setServings((s) => Math.round((s + 0.5) * 10) / 10)}><Icon name="add" size={20} /></button></div></div></section>
              {breakdownItems.length > 0 && <section className="camera-result-section"><h2>Inside your plate.</h2><p>{det.items?.length ? 'Estimated calories for each food. Available nutrients are shown below.' : 'Only a whole-meal estimate was returned. Retry analysis for a component breakdown.'}</p><div className="camera-components">{breakdownItems.map((item,index)=><article key={index}><header><div><h3>{item.name}</h3><p>{item.portion ? `${item.portion} · ` : ''}{item.grams ? `${Math.round(item.grams*servings)} g estimated` : 'Portion not measured'}</p></div><strong>{Math.round(item.kcal*servings)}<small>kcal</small></strong></header><ComponentNutrients item={item} servings={servings}/>{det.items?.every(part=>[part.protein,part.carbs,part.fat].every(value=>typeof value==='number'&&Number.isFinite(value)))&&<div className="camera-component-adjust"><span>Adjust this portion</span><button type="button" aria-label={`Reduce ${item.name} portion by 25 percent`} onClick={()=>changeComponent(index,.75)}>−25%</button><button type="button" aria-label={`Increase ${item.name} portion by 25 percent`} onClick={()=>changeComponent(index,1.25)}>+25%</button></div>}</article>)}</div></section>}
              <section className="camera-result-section camera-food-corrections"><h2>Not the right food?</h2><p>Replace a component with a local or online serving reference.</p>{correcting===null?<div>{breakdownItems.map((item,index)=><button type="button" key={index} onClick={()=>setCorrecting(index)}><span>{item.name}</span><span>Change<Icon name="edit" size={17}/></span></button>)}</div>:<CorrectMealComponent key={correcting} name={breakdownItems[correcting]?.name??det.name} onApply={item=>replaceComponent(correcting,item)} onCancel={()=>setCorrecting(null)}/>}</section>
              {(det.assumptions || det.note) && <details className="camera-result-details"><summary>About this estimate <Icon name="expand_more" size={20} /></summary><div>{det.assumptions && <p>{det.assumptions}</p>}{det.note && <p>{det.note}</p>}</div></details>}
              <details className="camera-result-details"><summary>Analysis details <Icon name="expand_more" size={20} /></summary><div><p>Model used: {det.model ?? 'Not reported'}</p><p>Selected model: {det.requestedModel ?? 'Not reported'}</p><p>Result source: {detectionSourceLabel(det.source)}</p>{det.usage && <p>Tokens: {det.usage.inputTokens.toLocaleString()} input · {det.usage.outputTokens.toLocaleString()} output · {det.usage.thinkingTokens.toLocaleString()} thinking. Counts are for the successful response, not earlier retries or search charges.</p>}<p>{detectionUsageLabel(det.source, foodAIUsage(det.source))}</p><GeminiModelPicker id="result-gemini-model" value={profile.geminiModel} onChange={geminiModel => updateProfile({ geminiModel })}/><button type="button" onClick={retryAnalysis}>Retry with selected model</button></div></details>
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
            <button onClick={() => nav(`/food?date=${logDate}`)} className="flex-1 py-3 rounded-xl border border-lime text-lime font-metric-md text-metric-md">Search food list</button>
          </div>
        </div>
      )}
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


function detectionUsageLabel(source: Detection['source'], usedThisMonth: number) {
  switch (source) {
    case 'local':
      return 'Usage: Unlimited · offline local reference'
    case 'gemini':
      return `Gemini · ${usedThisMonth} successful scan(s) today · billing and remaining quota are in Google AI Studio`
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

function ComponentNutrients({ item, servings }: { item: { protein?: number; carbs?: number; fat?: number }; servings: number }) {
  const keys = (['protein', 'carbs', 'fat'] as const).filter(key => typeof item[key] === 'number' && Number.isFinite(item[key]))
  if (!keys.length) return null
  return <dl>{keys.map(key => <div key={key}><dt>{key}</dt><dd>{Math.round(item[key]! * servings)} g</dd></div>)}</dl>
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
  const num = (k: 'kcal' | 'protein' | 'carbs' | 'fat') => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...det, [k]: Math.max(0,+e.target.value || 0), items: undefined })

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
        <input className={cls} value={det.name} onChange={(e) => onChange({ ...det, name: e.target.value })} />
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
