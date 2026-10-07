export interface ChatFoodEstimate {
  name: string; kcal: number; protein: number; carbs: number; fat: number
  caloriesCalculated: boolean; warning: string | null
}
export const CHAT_FOOD_LIMITS = { kcal: 5000, protein: 300, carbs: 700, fat: 300 }
type Field = keyof typeof CHAT_FOOD_LIMITS
const aliases: Record<Field, string> = {
  kcal: 'calories?|kalori|kcal', protein: 'protein|protin',
  carbs: 'carbohydrates?|carbs?|karbohidrat|karbo', fat: 'fats?|lemak',
}
const amount = '(-?\\d[\\d,]*(?:\\.\\d+)?)(?:\\s*(?:-|–|—|to|hingga)\\s*(-?\\d[\\d,]*(?:\\.\\d+)?))?'
const total = /\b(?:grand total|meal total|total|jumlah(?:\s+keseluruhan)?|keseluruhan)\b/i
function numeric(value: unknown, warnings: Set<string>): number {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return NaN
  const match = value.trim().match(new RegExp('^(?:~|≈|about|around|approximately|anggaran|lebih kurang)?\\s*' + amount + '\\s*(?:g|grams?|kcal|calories?)?$', 'i'))
  if (!match) return NaN
  const lo = Number(match[1].replace(/,/g, '')), hi = match[2] ? Number(match[2].replace(/,/g, '')) : lo
  if (lo < 0 || hi < lo) throw new Error('Negative or reversed nutrition values found. Check the pasted answer.')
  if (match[2]) warnings.add('Ranges use their midpoint. Actual portions and preparation can differ.')
  return (lo + hi) / 2
}
function fromJson(raw: string): Record<string, unknown> | null {
  const text = raw.match(/~~~(?:json)?\s*([\s\S]*?)~~~/i)?.[1] ?? raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)
  try {
    const parsed: unknown = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const obj = parsed as Record<string, unknown>
    const selected = obj.total && typeof obj.total === 'object' ? obj.total : obj
    return Object.fromEntries(Object.entries(selected).map(([k, v]) => [k.toLowerCase().replace(/_g$/, ''), v]))
  } catch { return null }
}
function fromTable(raw: string): Record<string, unknown> | null {
  const rows = raw.split('\n').filter(l => l.includes('|')).map(l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()))
  const index = rows.findIndex(r => r.some(c => /protein|protin/i.test(c)) && r.some(c => /calorie|kalori|kcal/i.test(c)))
  if (index < 0) return null
  const header = rows[index]
  const data = rows.slice(index + 1).filter(r => !r.every(c => /^[:\s-]*$/.test(c)) && r.length === header.length)
  const selected = data.find(r => r.some(c => total.test(c))) ?? (data.length === 1 ? data[0] : undefined)
  if (!selected) throw new Error('Several foods but no meal total in this table. Paste one food or ask for a total row.')
  const out: Record<string, unknown> = {}
  header.forEach((cell, i) => {
    const key = (Object.keys(aliases) as Field[]).find(k => new RegExp('\\b(?:' + aliases[k] + ')\\b', 'i').test(cell))
    if (key) out[key] = selected[i]
    else if (!total.test(selected[i])) out.name = selected[i]
  })
  return out
}
function fromProse(raw: string, warnings: Set<string>): Record<string, unknown> {
  const cleaned = raw.replace(/[*_~]/g, '')
  const lines = cleaned.split('\n')
  const totalLine = lines.findIndex(l => total.test(l) && /\d|:/.test(l))
  let text = cleaned
  if (totalLine >= 0) {
    const tail = lines.slice(totalLine).join('\n')
    if (Object.values(aliases).every(a => new RegExp('\\b(?:' + a + ')\\b', 'i').test(tail))) text = tail
  }
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(aliases) as Field[]) {
    const label = '\\b(?:' + (key === 'kcal' ? 'calories?|kalori|kcal(?=\\s*[:=])' : aliases[key]) + ')\\b'
    const unit = key === 'kcal' ? '(?:kcal|calories?|kalori)' : '(?:g|grams?|gram)'
    const beforePattern = label + '\\s*(?:\\(g\\)|\\(kcal\\))?\\s*(?::|=|\\||is|adalah|sebanyak|sekitar|approximately|about|around|anggaran|lebih kurang|≈|–)*\\s*' + amount + '(?:\\s*' + unit + ')?(?![\\d.%])' + (key === 'kcal' ? '' : '(?!\\s*(?:kcal|kJ)\\b)')
    const before = new RegExp(beforePattern.replace(/\\s/g, '[ \\t]'), 'gi')
    const after = new RegExp(amount + '\\s*' + unit + '\\s*(?:of\\s+)?' + label, 'gi')
    const found = [...text.matchAll(before), ...text.matchAll(after)].map(m => ({ start: m.index!, end: m.index! + m[0].length, value: numeric(m[2] ? m[1] + '-' + m[2] : m[1], warnings) }))
    if (key === 'kcal') for (const m of text.matchAll(new RegExp(amount + '\\s*kcal\\b', 'gi'))) {
      const start = m.index!, end = start + m[0].length
      if (!found.some(f => start < f.end && end > f.start)) found.push({ start, end, value: numeric(m[2] ? m[1] + '-' + m[2] : m[1], warnings) })
    }
    const unique = found.filter((f, i) => !found.slice(0, i).some(p => f.start < p.end && f.end > p.start))
    if (unique.length > 1) throw new Error('Several ' + key + ' values found. Paste the meal-total section only, or one food at a time.')
    if (unique.length) out[key] = unique[0].value
  }
  const named = cleaned.match(/(?:^|\n)\s*(?:name|meal|food|makanan|hidangan|nama)\s*:\s*([^\n]+)/i)?.[1]
  const first = lines.find(l => l.trim() && !total.test(l))?.trim().replace(/^#+\s*/, '') ?? ''
  out.name = named ?? (first.length <= 90 && !/\d\s*(?:g|kcal)\b|protein|kalori|calories/i.test(first) ? first : '')
  return out
}
/** Missing grams stay blank. This reads explicit values, not nutrition from a food name. */
export function parseChatFoodEstimate(raw: string): ChatFoodEstimate {
  if (raw.trim().length < 5 || raw.length > 12000) throw new Error('Paste a food estimate, up to 12,000 characters.')
  const warnings = new Set<string>()
  const source = fromJson(raw) ?? fromTable(raw.replace(/[*_]/g, '')) ?? fromProse(raw, warnings)
  const values = {
    kcal: numeric(source.kcal ?? source.calories ?? source.calorie ?? source.kalori, warnings),
    protein: numeric(source.protein ?? source.protin, warnings),
    carbs: numeric(source.carbs ?? source.carbohydrates ?? source.karbohidrat ?? source.karbo, warnings),
    fat: numeric(source.fat ?? source.fats ?? source.lemak, warnings),
  }
  if (Object.values(values).every(v => !Number.isFinite(v))) throw new Error('No explicit nutrition numbers found. Paste the calories and macro part, not just the food description.')
  for (const key of Object.keys(values) as Field[]) if (Number.isFinite(values[key]) && (values[key] < 0 || values[key] > CHAT_FOOD_LIMITS[key] || (key === 'kcal' && values[key] === 0))) throw new Error(key + ' is outside the supported meal range. Check the answer or split a large meal.')
  const complete = [values.protein, values.carbs, values.fat].every(Number.isFinite)
  const calculated = values.protein * 4 + values.carbs * 4 + values.fat * 9
  const caloriesCalculated = !Number.isFinite(values.kcal) && complete
  if (caloriesCalculated) values.kcal = calculated
  if (values.kcal > CHAT_FOOD_LIMITS.kcal) throw new Error('Calculated calories exceed the supported meal range.')
  const missing = (Object.keys(values) as Field[]).filter(k => !Number.isFinite(values[k]))
  if (missing.length) warnings.add('Missing ' + missing.join(', ') + '. Fill these fields before saving; no values were invented.')
  if (!caloriesCalculated && complete && Math.abs(values.kcal - calculated) > Math.max(100, values.kcal * .25)) warnings.add('The macros imply ' + Math.round(calculated) + ' kcal, different from the stated calories. Review before saving.')
  if (/per\s*100\s*g|\/\s*100\s*g|setiap\s*100\s*g/i.test(raw)) warnings.add('Per 100 g mentioned. Values are not scaled: adjust them to your eaten portion before saving.')
  const nameValue = source.name ?? source.meal ?? source.food ?? source.makanan
  return {
    name: typeof nameValue === 'string' ? nameValue.trim().slice(0, 90) : '',
    ...Object.fromEntries(Object.entries(values).map(([k, v]) => [k, k === 'kcal' ? Math.round(v) : Math.round(v * 10) / 10])) as typeof values,
    caloriesCalculated, warning: [...warnings].join(' ') || null,
  }
}
export const CHAT_FOOD_PROMPT = 'Estimate my meal from my description or photo, including sauces and oil. Give the food name and ONE whole-meal total: calories (kcal), protein (g), carbs (g), fat (g). Plain English or Bahasa Melayu, bullets or a table are fine; JSON is optional. Explain the assumed portion and uncertainty. My meal: '
