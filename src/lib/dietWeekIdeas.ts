import type { DietMode } from '../types'

const IDEAS: Record<DietMode, string[]> = {
  standard: [
    'Breakfast: oats, yogurt and berries',
    'Lunch: chicken, rice and vegetables',
    'Dinner: fish, potatoes and salad',
    'Breakfast: eggs, toast and fruit',
    'Lunch: tofu, rice and mixed vegetables',
    'Dinner: lean protein, grains and greens',
    'Prep two balanced meals for next week',
  ],
  '16:8': [
    'First meal: chicken, rice and vegetables',
    'First meal: eggs, toast and fruit',
    'First meal: tofu, grains and vegetables',
    'First meal: yogurt, oats and berries',
    'First meal: fish, potatoes and salad',
    'First meal: lean protein, rice and greens',
    'Plan two meals inside your eating window',
  ],
  omad: [
    'One substantial meal: chicken, rice, veg and fruit',
    'One substantial meal: fish, potatoes, greens and yogurt',
    'One substantial meal: tofu, grains, veg and nuts',
    'One substantial meal: eggs, chicken, rice and salad',
    'One substantial meal: lean meat, potatoes, veg and fruit',
    'One substantial meal: fish, rice, veg and yogurt',
    'Review calories and protein for the single meal',
  ],
  keto: [
    'Meal: eggs, avocado and spinach',
    'Meal: chicken and leafy salad with olive oil',
    'Meal: salmon and broccoli',
    'Meal: tofu, avocado and greens',
    'Meal: beef and cauliflower',
    'Meal: fish, salad and nuts',
    'Review logged net carbs against your cap',
  ],
  egg: [
    'Meal: omelette with spinach and salad',
    'Meal: eggs, chicken and vegetables',
    'Meal: eggs, fish and greens',
    'Meal: omelette with peppers and salad',
    'Meal: eggs, lean meat and vegetables',
    'Meal: eggs, fish and courgette',
    'Review variety and return to a balanced plan',
  ],
}

export function dietWeekIdeas(mode: DietMode, startHour: number): string[] {
  const ideas = IDEAS[mode]
  if (mode !== '16:8' && mode !== 'omad') return ideas
  const end = (startHour + (mode === 'omad' ? 1 : 8)) % 24
  const format = (hour: number) => `${String(hour).padStart(2, '0')}:00`
  return ideas.map((idea, index) => index === 6 ? idea : `${format(startHour)}–${format(end)} · ${idea}`)
}
