import type { SessionType } from '../types'

export type ActivityCategory = 'run' | 'strength' | 'cardio' | 'sport' | 'mobility'

export interface ActivityDef {
  id: string
  label: string
  category: ActivityCategory
  type: SessionType
  met: number
  icon: string
}

export const ACTIVITIES: ActivityDef[] = [
  { id: 'easy_run', label: 'Easy run', category: 'run', type: 'run', met: 8.3, icon: 'directions_run' },
  { id: 'tempo_run', label: 'Tempo run', category: 'run', type: 'run', met: 10.5, icon: 'speed' },
  { id: 'interval_run', label: 'Intervals', category: 'run', type: 'run', met: 12.3, icon: 'bolt' },
  { id: 'walk_brisk', label: 'Brisk walk', category: 'cardio', type: 'sport', met: 4.3, icon: 'directions_walk' },
  { id: 'cycling_easy', label: 'Cycling easy', category: 'cardio', type: 'sport', met: 6.8, icon: 'directions_bike' },
  { id: 'cycling_hard', label: 'Cycling hard', category: 'cardio', type: 'sport', met: 10, icon: 'directions_bike' },
  { id: 'rowing_machine', label: 'Rowing machine', category: 'cardio', type: 'sport', met: 7, icon: 'rowing' },
  { id: 'jump_rope', label: 'Jump rope', category: 'cardio', type: 'sport', met: 12.3, icon: 'timer' },
  { id: 'strength_general', label: 'Strength training', category: 'strength', type: 'strength', met: 5, icon: 'fitness_center' },
  { id: 'dumbbell_row', label: 'Dumbbell row', category: 'strength', type: 'strength', met: 5, icon: 'fitness_center' },
  { id: 'bench_press', label: 'Bench press', category: 'strength', type: 'strength', met: 5, icon: 'fitness_center' },
  { id: 'squat', label: 'Squat', category: 'strength', type: 'strength', met: 5.5, icon: 'fitness_center' },
  { id: 'deadlift', label: 'Deadlift', category: 'strength', type: 'strength', met: 6, icon: 'fitness_center' },
  { id: 'bodyweight', label: 'Bodyweight circuit', category: 'strength', type: 'strength', met: 8, icon: 'exercise' },
  { id: 'badminton', label: 'Badminton', category: 'sport', type: 'sport', met: 7, icon: 'sports_tennis' },
  { id: 'pickleball', label: 'Pickleball', category: 'sport', type: 'sport', met: 5.5, icon: 'sports_tennis' },
  { id: 'football', label: 'Football', category: 'sport', type: 'sport', met: 8, icon: 'sports_soccer' },
  { id: 'basketball', label: 'Basketball', category: 'sport', type: 'sport', met: 8, icon: 'sports_basketball' },
  { id: 'yoga', label: 'Yoga', category: 'mobility', type: 'strength', met: 3, icon: 'self_improvement' },
  { id: 'stretching', label: 'Stretching', category: 'mobility', type: 'strength', met: 2.3, icon: 'accessibility_new' },
]

export const ACTIVITY_CATEGORIES: { id: ActivityCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'run', label: 'Run' },
  { id: 'strength', label: 'Lift' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'sport', label: 'Sport' },
  { id: 'mobility', label: 'Mobility' },
]

export function activityById(id: string): ActivityDef {
  return ACTIVITIES.find((a) => a.id === id) ?? ACTIVITIES[0]
}

export function metForRun(distanceKm: number, minutes: number, fallbackMet: number): number {
  if (distanceKm <= 0 || minutes <= 0) return fallbackMet
  const kmh = distanceKm / (minutes / 60)
  if (kmh < 6.5) return 6
  if (kmh < 8) return 8.3
  if (kmh < 9.7) return 9.8
  if (kmh < 11.3) return 11
  if (kmh < 12.9) return 11.8
  if (kmh < 14.5) return 12.8
  return 14.5
}

export function caloriesFromMet(weightKg: number, met: number, minutes: number): number {
  return Math.round((met * 3.5 * weightKg * minutes) / 200)
}
