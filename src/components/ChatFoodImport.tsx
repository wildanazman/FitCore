import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import { CHAT_FOOD_PROMPT, parseChatFoodEstimate, type ChatFoodEstimate } from '../lib/chatFoodImport'
import type { MealSlot } from '../types'
import './chat-food-import.css'

export function ChatFoodImport({ initialSlot, onClose, onSave }: { initialSlot: MealSlot; onClose: () => void; onSave: (estimate: ChatFoodEstimate, slot: MealSlot) => void }) {
  const [response, setResponse] = useState('')
  const [estimate, setEstimate] = useState<ChatFoodEstimate | null>(null)
  const [slot, setSlot] = useState(initialSlot)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(CHAT_FOOD_PROMPT)
      setCopied(true)
    } catch { setError('Could not copy automatically. Select and copy the prompt below.') }
  }

  function extract() {
    try {
      setEstimate(parseChatFoodEstimate(response))
      setError(null)
    } catch (err) {
      setEstimate(null)
      setError(err instanceof Error ? err.message : 'Could not read this response.')
    }
  }

  function updateNumber(field: 'kcal' | 'protein' | 'carbs' | 'fat', value: string) {
    setEstimate((current) => current ? { ...current, [field]: Number(value), warning: null } : current)
  }

  const valid = estimate && estimate.name.trim() && [estimate.kcal, estimate.protein, estimate.carbs, estimate.fat].every((value) => Number.isFinite(value) && value >= 0) && estimate.kcal > 0

  return createPortal(<div className="chat-import-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className="chat-import-sheet" role="dialog" aria-modal="true" aria-labelledby="chat-import-title">
      <header><div><h2 id="chat-import-title">Import ChatGPT estimate</h2><p>Paste the answer. Review every number before logging.</p></div><button type="button" aria-label="Close import" onClick={onClose}><Icon name="close" size={23} /></button></header>
      <div className="chat-import-scroll">
        <section><h3>1. Ask ChatGPT</h3><p>Describe your food or attach its photo in ChatGPT. FitCore will not send anything automatically.</p><div className="chat-import-prompt"><textarea readOnly aria-label="Suggested ChatGPT prompt" value={CHAT_FOOD_PROMPT} /><button type="button" onClick={copyPrompt}><Icon name="content_copy" size={17} /> {copied ? 'Copied' : 'Copy prompt'}</button></div><a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Open ChatGPT <Icon name="arrow_outward" size={16} /></a></section>
        <section><h3>2. Paste its answer</h3><label htmlFor="chat-import-response">ChatGPT response</label><textarea id="chat-import-response" value={response} onChange={(event) => { setResponse(event.target.value); setEstimate(null); setError(null) }} placeholder={'Paste JSON or a response with total calories, protein, carbs and fat.'} /><button type="button" className="chat-import-extract" onClick={extract} disabled={!response.trim()}>Extract nutrition <Icon name="arrow_forward" size={18} /></button>{error && <p className="chat-import-error" role="alert">{error}</p>}</section>
        {estimate && <section className="chat-import-review"><h3>3. Check the estimate</h3><p>These values came from the pasted response. They are not verified nutrition facts.</p><label htmlFor="chat-import-name">Food name</label><input id="chat-import-name" value={estimate.name} onChange={(event) => setEstimate({ ...estimate, name: event.target.value })} placeholder="Name this meal" /><div className="chat-import-numbers"><NumberField label="Calories · kcal" value={estimate.kcal} onChange={(value) => updateNumber('kcal', value)} /><NumberField label="Protein · g" value={estimate.protein} onChange={(value) => updateNumber('protein', value)} /><NumberField label="Carbs · g" value={estimate.carbs} onChange={(value) => updateNumber('carbs', value)} /><NumberField label="Fat · g" value={estimate.fat} onChange={(value) => updateNumber('fat', value)} /></div>{estimate.caloriesCalculated && <p className="chat-import-note">Calories were calculated from the stated macros using 4/4/9 kcal per gram.</p>}{estimate.warning && <p className="chat-import-warning" role="status">{estimate.warning}</p>}<div className="chat-import-slots" role="group" aria-label="Meal type">{(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((option) => <button type="button" key={option} aria-pressed={slot === option} onClick={() => setSlot(option)}>{option}</button>)}</div><button type="button" className="chat-import-save" disabled={!valid} onClick={() => onSave(estimate, slot)}>Save to food log <Icon name="check" size={19} /></button></section>}
      </div>
    </div>
  </div>, document.body)
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: string) => void }) { return <label>{label}<input type="number" min="0" step="any" inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} /></label> }
