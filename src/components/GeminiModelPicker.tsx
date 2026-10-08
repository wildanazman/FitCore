import { GEMINI_MODELS, geminiModelOrDefault, type GeminiModel } from '../../shared/geminiModels.js'

export function GeminiModelPicker({ value, onChange, id }: { value: unknown; onChange: (model: GeminiModel) => void; id: string }) {
  const selected = geminiModelOrDefault(value)
  return <div className="settings-field">
    <label htmlFor={id}>Gemini model</label>
    <select id={id} value={selected} onChange={event => onChange(geminiModelOrDefault(event.target.value))} aria-describedby={`${id}-help`}>
      {GEMINI_MODELS.map(model => <option key={model.id} value={model.id}>{model.label}</option>)}
    </select>
    <p id={`${id}-help`} className="settings-help">{GEMINI_MODELS.find(model => model.id === selected)?.detail}. Applies to your next photo scan. Same server API key; model availability and charges depend on your Google project.</p>
  </div>
}
