export type GeminiModel = 'gemini-2.5-flash' | 'gemini-3.8-flash' | 'gemini-3.5-flash-lite'
export const GEMINI_MODELS: { id: GeminiModel; label: string; detail: string }[]
export const DEFAULT_GEMINI_MODEL: GeminiModel
export function isGeminiModel(value: unknown): value is GeminiModel
export function geminiModelOrDefault(value: unknown): GeminiModel
