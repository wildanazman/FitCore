export interface ChatFoodEstimate {
  name: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  caloriesCalculated: boolean
  warning: string | null
}

const LIMITS = { kcal: 5000, protein: 300, carbs: 700, fat: 300 }

function numeric(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const cleaned = value.trim().replace(/,/g, '')
  if (!/^\d+(?:\.\d+)?(?:\s*(?:g|grams?|kcal|calories?))?$/i.test(cleaned)) return null
  const number = Number.parseFloat(cleaned)
  return Number.isFinite(number) ? number : null
}

function fromJson(raw: string): Record<string, unknown> | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  const text = fenced ?? raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)
  if (!text.trim().startsWith('{')) return null
  try {
    const value: unknown = JSON.parse(text)
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
  } catch { return null }
}

function fromLabels(raw: string): Record<string, unknown> | null {
  const result: Record<string, unknown> = {}
  const fields: Array<[string, RegExp]> = [
    ['kcal', /^(?:total\s+)?(?:calories|calorie|kcal)\s*[:\-–]\s*([\d,.]+)\s*(?:kcal|calories)?$/i],
    ['protein', /^(?:total\s+)?protein\s*[:\-–]\s*([\d,.]+)\s*(?:g|grams?)?$/i],
    ['carbs', /^(?:total\s+)?(?:carbs|carbohydrates)\s*[:\-–]\s*([\d,.]+)\s*(?:g|grams?)?$/i],
    ['fat', /^(?:total\s+)?(?:fat|fats)\s*[:\-–]\s*([\d,.]+)\s*(?:g|grams?)?$/i],
    ['name', /^(?:meal|food|name)\s*[:\-–]\s*(.+)$/i],
  ]
  for (const line of raw.split(/\r?\n/)) {
    const clean = line.trim().replace(/^[-*•]\s*/, '').replace(/^\*\*(.*?)\*\*/, '$1')
    for (const [field, pattern] of fields) {
      const match = clean.match(pattern)
      if (!match) continue
      if (result[field] !== undefined) throw new Error(`Multiple ${field} values found. Ask ChatGPT for one total for the whole meal.`)
      result[field] = match[1]
      break
    }
  }
  return Object.keys(result).length ? result : null
}

/** Parse only explicit meal totals. Never infer missing macro grams from calories. */
export function parseChatFoodEstimate(raw: string): ChatFoodEstimate {
  if (raw.trim().length < 12 || raw.length > 12000) throw new Error('Paste one ChatGPT response with a meal total and macro values.')
  const source = fromJson(raw) ?? fromLabels(raw)
  if (!source) throw new Error('Could not find nutrition numbers. Ask ChatGPT for JSON or labelled total values.')
  const lower = Object.fromEntries(Object.entries(source).map(([key, value]) => [key.toLowerCase(), value]))
  const protein = numeric(lower.protein ?? lower.protein_g)
  const carbs = numeric(lower.carbs ?? lower.carbohydrates ?? lower.carbs_g)
  const fat = numeric(lower.fat ?? lower.fats ?? lower.fat_g)
  const statedKcal = numeric(lower.kcal ?? lower.calories ?? lower.calorie)
  if (protein === null || carbs === null || fat === null) throw new Error('Protein, carbs and fat are required. FitCore will not invent missing macro values.')
  if (protein < 0 || protein > LIMITS.protein || carbs < 0 || carbs > LIMITS.carbs || fat < 0 || fat > LIMITS.fat) throw new Error('One or more macro values are outside a plausible meal range. Check the response.')
  const calculated = Math.round(protein * 4 + carbs * 4 + fat * 9)
  const kcal = Math.round(statedKcal ?? calculated)
  if (kcal <= 0 || kcal > LIMITS.kcal) throw new Error('Calories are missing or outside a plausible meal range. Check the response.')
  const mismatch = statedKcal !== null && Math.abs(kcal - calculated) > Math.max(100, kcal * 0.25)
  const nameValue = lower.name ?? lower.meal ?? lower.food
  const name = typeof nameValue === 'string' ? nameValue.trim().slice(0, 90) : ''
  return {
    name,
    kcal,
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    caloriesCalculated: statedKcal === null,
    warning: mismatch ? `ChatGPT's calories (${kcal}) differ from the macro-based check (${calculated} kcal). Review the numbers before saving.` : null,
  }
}

export const CHAT_FOOD_PROMPT = `Estimate the nutrition for my meal. I will describe it or attach a photo below. Include the whole portion shown, including sauces and cooking oil where visible. If a portion or ingredient is uncertain, say so. Return ONE total for the whole meal as JSON only, with numeric fields: {"name":"meal name","kcal":0,"protein":0,"carbs":0,"fat":0}. Units are kcal and grams. Do not invent certainty. My meal: `
