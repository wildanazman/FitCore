// Shared allowlist: never accept arbitrary model IDs from a browser request.
export const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', detail: 'Current default · keep your existing setup' },
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', detail: 'Newer Flash · try on the same meal photo' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite', detail: 'Lower-cost option · compare before relying on it' },
]
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'
export function isGeminiModel(value) { return GEMINI_MODELS.some(model => model.id === value) }
export function geminiModelOrDefault(value) { return isGeminiModel(value) ? value : DEFAULT_GEMINI_MODEL }
