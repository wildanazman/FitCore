import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import { CHAT_FOOD_PROMPT, CHAT_FOOD_LIMITS, parseChatFoodEstimate, type ChatFoodEstimate } from '../lib/chatFoodImport'
import type { MealSlot } from '../types'
import './chat-food-import.css'
import { hasExcludedIngredients } from '../../shared/foodSuitability.js'

const EXAMPLE = 'Makanan: Nasi ayam satu pinggan\nAnggaran untuk seluruh hidangan ialah 650 kcal, protein 35g, karbohidrat 80g dan lemak 20g.'
export function ChatFoodImport({ initialSlot, onClose, onSave }: { initialSlot: MealSlot; onClose: () => void; onSave: (estimate: ChatFoodEstimate, slot: MealSlot) => void }) {
  const [response, setResponse] = useState('')
  const [estimate, setEstimate] = useState<ChatFoodEstimate | null>(null)
  const [slot, setSlot] = useState(initialSlot)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const sheet = useRef<HTMLDivElement>(null)
  const paste = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const siblings = [...document.body.children].filter(el => !el.contains(sheet.current)) as HTMLElement[]
    const states = siblings.map(el => el.inert)
    siblings.forEach(el => { el.inert = true })
    paste.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const controls = [...(sheet.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, textarea, summary') ?? [])].filter(el => el.getClientRects().length > 0)
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); siblings.forEach((el, i) => { el.inert = states[i] }); previous?.focus() }
  }, [onClose])
  function changeResponse(value: string) { setResponse(value); setEstimate(null); setError(null) }
  async function copyPrompt() {
    try { await navigator.clipboard.writeText(CHAT_FOOD_PROMPT); setCopied(true) }
    catch { setError('Select and copy the suggested prompt below; clipboard access was unavailable.') }
  }
  function extract() {
    try { setEstimate(parseChatFoodEstimate(response)); setError(null) }
    catch (err) { setEstimate(null); setError(err instanceof Error ? err.message : 'Could not read this response.') }
  }
  function updateNumber(field: 'kcal' | 'protein' | 'carbs' | 'fat', value: string) {
    setEstimate(current => current ? { ...current, [field]: value === '' ? NaN : Number(value), caloriesCalculated: field === 'kcal' ? false : current.caloriesCalculated } : current)
  }
  const valid = estimate && estimate.name.trim() && !hasExcludedIngredients(estimate.name) && (Object.keys(CHAT_FOOD_LIMITS) as Array<keyof typeof CHAT_FOOD_LIMITS>).every(key => Number.isFinite(estimate[key]) && estimate[key] >= 0 && estimate[key] <= CHAT_FOOD_LIMITS[key]) && estimate.kcal > 0
  return createPortal(<div className="chat-import-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <div ref={sheet} className="chat-import-sheet" role="dialog" aria-modal="true" aria-labelledby="chat-import-title">
      <header><div><h2 id="chat-import-title">Turn an answer into a meal.</h2><p>Paste it, check it, log it. No special format needed.</p></div><button type="button" aria-label="Close import" onClick={onClose}><Icon name="close" size={23} /></button></header>
      <div className="chat-import-scroll">
        <section><h3>Paste your food estimate</h3><p>English or BM, sentences, bullets, tables and JSON. Include one meal’s calories and macro grams.</p>
          <label htmlFor="chat-import-response">ChatGPT response</label><textarea ref={paste} id="chat-import-response" value={response} onChange={e => changeResponse(e.target.value)} placeholder={EXAMPLE} />
          <button className="chat-import-example" type="button" onClick={() => changeResponse(EXAMPLE)}>Try a sample answer</button>
          <button type="button" className="chat-import-extract" onClick={extract} disabled={!response.trim()}>Read estimate <Icon name="arrow_forward" size={18} /></button>
          {error && <p className="chat-import-error" role="alert">{error}</p>}
        </section>
        {estimate && <section className="chat-import-review" aria-live="polite"><h3>Review your meal</h3><p>Extracted locally from your answer, not verified nutrition facts. These must be totals for the portion you ate.</p>
          <label htmlFor="chat-import-name">Food name</label><input id="chat-import-name" value={estimate.name} onChange={e => setEstimate({ ...estimate, name: e.target.value })} placeholder="Name this meal" />
          <div className="chat-import-numbers">{([{ key: 'kcal', label: 'Calories · kcal' }, { key: 'protein', label: 'Protein · g' }, { key: 'carbs', label: 'Carbs · g' }, { key: 'fat', label: 'Fat · g' }] as const).map(f => <NumberField key={f.key} label={f.label} max={CHAT_FOOD_LIMITS[f.key]} value={estimate[f.key]} onChange={value => updateNumber(f.key, value)} />)}</div>
          {estimate.caloriesCalculated && <p className="chat-import-note">Initial calories were calculated from the pasted macros using 4/4/9 kcal per gram. Recheck calories if you edit macros.</p>}
          {estimate.warning && <p className="chat-import-warning" role="status">{estimate.warning}</p>}
          <div className="chat-import-slots" role="group" aria-label="Meal type">{(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(option => <button type="button" key={option} aria-pressed={slot === option} onClick={() => setSlot(option)}>{option}</button>)}</div>
          {!valid && <p className="chat-import-note">Add a food name and fill all four nutrition fields to save.</p>}
          {estimate && hasExcludedIngredients(estimate.name) && <p className="chat-import-error" role="alert">This food is excluded by FitCore’s halal-only food policy.</p>}
          <button type="button" className="chat-import-save" disabled={!valid} onClick={() => onSave(estimate, slot)}>Save to food log <Icon name="check" size={19} /></button>
        </section>}
        <details className="chat-import-help"><summary>Need an answer from ChatGPT?</summary><p>Describe your portion or attach a photo there. Nothing is sent automatically by FitCore.</p><div className="chat-import-prompt"><textarea readOnly aria-label="Suggested ChatGPT prompt" value={CHAT_FOOD_PROMPT} /><button type="button" onClick={copyPrompt}><Icon name="content_copy" size={17} />{copied ? 'Copied' : 'Copy prompt'}</button></div><a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Open ChatGPT <Icon name="arrow_outward" size={16} /></a></details>
      </div>
    </div>
  </div>, document.body)
}
function NumberField({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (value: string) => void }) {
  return <label>{label}<input type="number" min="0" max={max} step="any" inputMode="decimal" value={Number.isFinite(value) ? value : ''} placeholder="Missing" onChange={e => onChange(e.target.value)} /></label>
}
