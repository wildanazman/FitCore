import type { SessionType } from '../types'

export type ActivityCategory = 'home' | 'gym' | 'run' | 'cardio' | 'sport' | 'mobility'
export type HomeEquipment = 'none' | 'mat' | 'dumbbell' | 'mat+dumbbell'

export interface ActivityDef {
  id: string
  label: string
  category: ActivityCategory
  type: SessionType
  met: number
  icon: string
  equipment?: HomeEquipment
  detail?: string
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
  { id: 'strength_general', label: 'Gym strength session', category: 'gym', type: 'strength', met: 3.5, icon: 'fitness_center' },
  { id: 'dumbbell_row', label: 'Dumbbell workout', category: 'gym', type: 'strength', met: 3.5, icon: 'fitness_center' },
  { id: 'bench_press', label: 'Bench press session', category: 'gym', type: 'strength', met: 3.5, icon: 'fitness_center' },
  { id: 'squat', label: 'Squat session', category: 'gym', type: 'strength', met: 5, icon: 'fitness_center' },
  { id: 'deadlift', label: 'Deadlift session', category: 'gym', type: 'strength', met: 5, icon: 'fitness_center' },
  { id: 'gym_vigorous', label: 'Heavy lifting', category: 'gym', type: 'strength', met: 6, icon: 'fitness_center' },
  { id: 'elliptical', label: 'Elliptical', category: 'gym', type: 'sport', met: 5, icon: 'exercise' },
  { id: 'stair_machine', label: 'Stair machine', category: 'gym', type: 'sport', met: 9, icon: 'stairs' },
  { id: 'home_general', label: 'Home workout', category: 'home', type: 'strength', met: 3.8, icon: 'exercise', equipment: 'none', detail: 'A mixed session in your own space' },
  { id: 'bodyweight', label: 'Bodyweight circuit', category: 'home', type: 'strength', met: 6, icon: 'exercise', equipment: 'none', detail: 'Squats · push-ups · lunges' },
  { id: 'home_pushups', label: 'Push-up circuit', category: 'home', type: 'strength', met: 3, icon: 'exercise', equipment: 'none', detail: 'Upper-body bodyweight work' },
  { id: 'home_squats', label: 'Squats & lunges', category: 'home', type: 'strength', met: 3, icon: 'exercise', equipment: 'none', detail: 'Lower-body bodyweight work' },
  { id: 'home_hiit', label: 'HIIT / calisthenics', category: 'home', type: 'sport', met: 8, icon: 'exercise', equipment: 'none', detail: 'Vigorous intervals with rest' },
  { id: 'home_pilates', label: 'Mat Pilates', category: 'home', type: 'strength', met: 3, icon: 'self_improvement', equipment: 'mat', detail: 'Controlled core and mobility work' },
  { id: 'home_core', label: 'Core on mat', category: 'home', type: 'strength', met: 3, icon: 'self_improvement', equipment: 'mat', detail: 'Plank · dead bug · bird-dog' },
  { id: 'home_glute', label: 'Glutes on mat', category: 'home', type: 'strength', met: 3, icon: 'exercise', equipment: 'mat', detail: 'Glute bridge · side-lying raises' },
  { id: 'home_dumbbell_full', label: 'Dumbbell full body', category: 'home', type: 'strength', met: 5, icon: 'fitness_center', equipment: 'dumbbell', detail: 'Squat · row · press · hinge' },
  { id: 'home_goblet_squat', label: 'Goblet squats', category: 'home', type: 'strength', met: 5, icon: 'fitness_center', equipment: 'dumbbell', detail: 'Dumbbell lower-body session' },
  { id: 'home_dumbbell_row', label: 'Dumbbell rows', category: 'home', type: 'strength', met: 3.5, icon: 'fitness_center', equipment: 'dumbbell', detail: 'Back and arm session' },
  { id: 'home_dumbbell_press', label: 'Shoulder press', category: 'home', type: 'strength', met: 3.5, icon: 'fitness_center', equipment: 'dumbbell', detail: 'Standing dumbbell press' },
  { id: 'home_dumbbell_rdl', label: 'Romanian deadlifts', category: 'home', type: 'strength', met: 5, icon: 'fitness_center', equipment: 'dumbbell', detail: 'Dumbbell hip-hinge session' },
  { id: 'home_floor_press', label: 'Dumbbell floor press', category: 'home', type: 'strength', met: 3.5, icon: 'fitness_center', equipment: 'mat+dumbbell', detail: 'Chest press on your mat' },
  { id: 'home_mat_dumbbell', label: 'Mat + dumbbell circuit', category: 'home', type: 'strength', met: 5, icon: 'fitness_center', equipment: 'mat+dumbbell', detail: 'Goblet squat · row · floor press · core' },
  { id: 'badminton', label: 'Badminton', category: 'sport', type: 'sport', met: 7, icon: 'sports_tennis' },
  { id: 'pickleball', label: 'Pickleball', category: 'sport', type: 'sport', met: 5.5, icon: 'sports_tennis' },
  { id: 'football', label: 'Football', category: 'sport', type: 'sport', met: 8, icon: 'sports_soccer' },
  { id: 'basketball', label: 'Basketball', category: 'sport', type: 'sport', met: 8, icon: 'sports_basketball' },
  { id: 'yoga', label: 'Yoga', category: 'mobility', type: 'strength', met: 3, icon: 'self_improvement' },
  { id: 'stretching', label: 'Stretching', category: 'mobility', type: 'strength', met: 2.3, icon: 'accessibility_new' },
]

export const ACTIVITY_CATEGORIES: { id: ActivityCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'home', label: 'Home workout' },
  { id: 'gym', label: 'Gym' },
  { id: 'run', label: 'Run' },
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
