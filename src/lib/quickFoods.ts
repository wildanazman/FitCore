// One-tap foods surfaced on the Food screen, tuned to the active diet mode.

import type { DietMode } from '../types'

export interface QuickFood {
  name: string
  emoji: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

const EGG_STAPLES: QuickFood[] = [
  { name: 'Boiled Egg', emoji: '🥚', kcal: 78, protein: 6, carbs: 1, fat: 5 },
  { name: 'Scrambled Eggs (2)', emoji: '🍳', kcal: 180, protein: 12, carbs: 2, fat: 13 },
  { name: 'Omelette (3 egg)', emoji: '🍳', kcal: 260, protein: 18, carbs: 2, fat: 20 },
]

const KETO_STAPLES: QuickFood[] = [
  { name: 'Avocado (half)', emoji: '🥑', kcal: 160, protein: 2, carbs: 3, fat: 15 },
  { name: 'Cheddar (30g)', emoji: '🧀', kcal: 120, protein: 7, carbs: 1, fat: 10 },
  { name: 'Bacon (2 strips)', emoji: '🥓', kcal: 90, protein: 6, carbs: 0, fat: 7 },
  { name: 'Boiled Egg', emoji: '🥚', kcal: 78, protein: 6, carbs: 1, fat: 5 },
]

const LEAN_STAPLES: QuickFood[] = [
  { name: 'Chicken Breast (150g)', emoji: '🍗', kcal: 248, protein: 46, carbs: 0, fat: 5 },
  { name: 'Protein Shake', emoji: '🥤', kcal: 180, protein: 30, carbs: 8, fat: 3 },
  { name: 'Greek Yogurt', emoji: '🫐', kcal: 150, protein: 15, carbs: 12, fat: 4 },
]

export const QUICK_FOODS: Record<DietMode, QuickFood[]> = {
  standard: LEAN_STAPLES,
  omad: LEAN_STAPLES,
  '16:8': LEAN_STAPLES,
  keto: KETO_STAPLES,
  egg: EGG_STAPLES,
}
