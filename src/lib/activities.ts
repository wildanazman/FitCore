import type { SessionType } from '../types'

export type ActivityCategory = 'home' | 'gym' | 'run' | 'cardio' | 'sport' | 'mobility'
export type EquipmentId = 'mat' | 'dumbbell' | 'bench' | 'kettlebell'
export type MuscleGroup = 'chest' | 'back' | 'legs' | 'glutes' | 'shoulders' | 'arms' | 'abs' | 'full-body'
export const HOME_EQUIPMENT: { id: EquipmentId; label: string }[] = [
  { id: 'mat', label: 'Mat' }, { id: 'dumbbell', label: 'Dumbbells' },
  { id: 'bench', label: 'Bench' }, { id: 'kettlebell', label: 'Kettlebell' },
]
export const MUSCLE_GROUPS: { id: MuscleGroup; label: string }[] = [
  { id: 'chest', label: 'Chest' }, { id: 'back', label: 'Back' }, { id: 'legs', label: 'Legs' },
  { id: 'glutes', label: 'Glutes' }, { id: 'shoulders', label: 'Shoulders' },
  { id: 'arms', label: 'Arms' }, { id: 'abs', label: 'Abs' }, { id: 'full-body', label: 'Full body' },
]

export interface ActivityDef {
  id: string
  label: string
  category: ActivityCategory
  type: SessionType
  met: number
  icon: string
  requires?: EquipmentId[]
  muscles?: MuscleGroup[]
  detail?: string
}

const BASE_ACTIVITIES: ActivityDef[] = [
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
  { id: 'home_general', label: 'Home workout', category: 'home', type: 'strength', met: 3.8, icon: 'exercise', requires: [], detail: 'A mixed session in your own space' },
  { id: 'bodyweight', label: 'Bodyweight circuit', category: 'home', type: 'strength', met: 6, icon: 'exercise', requires: [], detail: 'Squats · push-ups · lunges' },
  { id: 'home_pushups', label: 'Push-up circuit', category: 'home', type: 'strength', met: 3, icon: 'exercise', requires: [], detail: 'Upper-body bodyweight work' },
  { id: 'home_squats', label: 'Squats & lunges', category: 'home', type: 'strength', met: 3, icon: 'exercise', requires: [], detail: 'Lower-body bodyweight work' },
  { id: 'home_hiit', label: 'HIIT / calisthenics', category: 'home', type: 'sport', met: 8, icon: 'exercise', requires: [], detail: 'Vigorous intervals with rest' },
  { id: 'home_pilates', label: 'Mat Pilates', category: 'home', type: 'strength', met: 3, icon: 'self_improvement', requires: ['mat'], detail: 'Controlled core and mobility work' },
  { id: 'home_core', label: 'Core on mat', category: 'home', type: 'strength', met: 3, icon: 'self_improvement', requires: ['mat'], detail: 'Plank · dead bug · bird-dog' },
  { id: 'home_glute', label: 'Glutes on mat', category: 'home', type: 'strength', met: 3, icon: 'exercise', requires: ['mat'], detail: 'Glute bridge · side-lying raises' },
  { id: 'home_dumbbell_full', label: 'Dumbbell full body', category: 'home', type: 'strength', met: 5, icon: 'fitness_center', requires: ['dumbbell'], detail: 'Squat · row · press · hinge' },
  { id: 'home_goblet_squat', label: 'Goblet squats', category: 'home', type: 'strength', met: 5, icon: 'fitness_center', requires: ['dumbbell'], detail: 'Dumbbell lower-body session' },
  { id: 'home_dumbbell_row', label: 'Dumbbell rows', category: 'home', type: 'strength', met: 3.5, icon: 'fitness_center', requires: ['dumbbell'], detail: 'Back and arm session' },
  { id: 'home_dumbbell_press', label: 'Shoulder press', category: 'home', type: 'strength', met: 3.5, icon: 'fitness_center', requires: ['dumbbell'], detail: 'Standing dumbbell press' },
  { id: 'home_dumbbell_rdl', label: 'Romanian deadlifts', category: 'home', type: 'strength', met: 5, icon: 'fitness_center', requires: ['dumbbell'], detail: 'Dumbbell hip-hinge session' },
  { id: 'home_floor_press', label: 'Dumbbell floor press', category: 'home', type: 'strength', met: 3.5, icon: 'fitness_center', requires: ['mat', 'dumbbell'], detail: 'Chest press on your mat' },
  { id: 'home_mat_dumbbell', label: 'Mat + dumbbell circuit', category: 'home', type: 'strength', met: 5, icon: 'fitness_center', requires: ['mat', 'dumbbell'], detail: 'Goblet squat · row · floor press · core' },
  { id: 'badminton', label: 'Badminton', category: 'sport', type: 'sport', met: 7, icon: 'sports_tennis' },
  { id: 'pickleball', label: 'Pickleball', category: 'sport', type: 'sport', met: 5.5, icon: 'sports_tennis' },
  { id: 'football', label: 'Football', category: 'sport', type: 'sport', met: 8, icon: 'sports_soccer' },
  { id: 'basketball', label: 'Basketball', category: 'sport', type: 'sport', met: 8, icon: 'sports_basketball' },
  { id: 'yoga', label: 'Yoga', category: 'mobility', type: 'strength', met: 3, icon: 'self_improvement' },
  { id: 'stretching', label: 'Stretching', category: 'mobility', type: 'strength', met: 2.3, icon: 'accessibility_new' },
]

// Strength calories use a session-level estimate, not a precise burn per rep.
function homeExercise(id: string, label: string, muscles: MuscleGroup[], requires: EquipmentId[], detail: string): ActivityDef {
  return { id: `home_${id}`, label, category: 'home', type: 'strength', met: 3.5, icon: requires.length ? 'fitness_center' : 'exercise', muscles, requires, detail }
}

const HOME_EXERCISES: ActivityDef[] = [
  homeExercise('pushup', 'Push-up', ['chest', 'arms'], [], 'Bodyweight horizontal press'),
  homeExercise('kneeling_pushup', 'Kneeling push-up', ['chest', 'arms'], ['mat'], 'Knee-supported horizontal press'),
  homeExercise('bench_pushup', 'Incline push-up on bench', ['chest', 'arms'], ['bench'], 'Hands on a stable bench'),
  homeExercise('decline_pushup', 'Decline push-up', ['chest', 'shoulders'], ['bench'], 'Feet on a stable bench'),
  homeExercise('db_bench_press', 'Dumbbell bench press', ['chest', 'arms'], ['dumbbell', 'bench'], 'Flat-bench chest press'),
  homeExercise('db_bench_fly', 'Dumbbell chest fly', ['chest'], ['dumbbell', 'bench'], 'Flat-bench fly with controlled range'),
  homeExercise('db_squeeze_press', 'Dumbbell squeeze press', ['chest', 'arms'], ['dumbbell', 'mat'], 'Floor press with dumbbells together'),
  homeExercise('kb_floor_press', 'Kettlebell floor press', ['chest', 'arms'], ['kettlebell', 'mat'], 'Single-arm press on the floor'),
  homeExercise('db_bent_row', 'Dumbbell bent-over row', ['back', 'arms'], ['dumbbell'], 'Standing hip-hinge row'),
  homeExercise('bench_row', 'Bench-supported dumbbell row', ['back', 'arms'], ['dumbbell', 'bench'], 'Single-arm row with bench support'),
  homeExercise('db_pullover', 'Dumbbell pullover', ['back', 'chest'], ['dumbbell', 'bench'], 'Bench-supported overhead arc'),
  homeExercise('db_reverse_fly', 'Dumbbell reverse fly', ['back', 'shoulders'], ['dumbbell'], 'Bent-over rear-delt fly'),
  homeExercise('kb_row', 'Kettlebell row', ['back', 'arms'], ['kettlebell'], 'Single-arm hip-hinge row'),
  homeExercise('superman', 'Superman', ['back', 'glutes'], ['mat'], 'Prone back-extension movement'),
  homeExercise('bird_dog', 'Bird-dog', ['back', 'abs'], ['mat'], 'Opposite arm and leg extension'),
  homeExercise('bodyweight_squat', 'Bodyweight squat', ['legs', 'glutes'], [], 'Controlled squat without weights'),
  homeExercise('reverse_lunge', 'Reverse lunge', ['legs', 'glutes'], [], 'Alternating backward step'),
  homeExercise('split_squat', 'Split squat', ['legs', 'glutes'], [], 'Stationary staggered-stance squat'),
  homeExercise('wall_sit', 'Wall sit', ['legs'], [], 'Isometric hold against a wall'),
  homeExercise('calf_raise', 'Standing calf raise', ['legs'], [], 'Bodyweight heel raise'),
  homeExercise('db_lunge', 'Dumbbell reverse lunge', ['legs', 'glutes'], ['dumbbell'], 'Weighted backward lunge'),
  homeExercise('db_split_squat', 'Dumbbell split squat', ['legs', 'glutes'], ['dumbbell'], 'Weighted stationary split squat'),
  homeExercise('bulgarian_squat', 'Bulgarian split squat', ['legs', 'glutes'], ['bench'], 'Rear foot elevated on a stable bench'),
  homeExercise('db_bulgarian', 'Dumbbell Bulgarian split squat', ['legs', 'glutes'], ['dumbbell', 'bench'], 'Weighted rear-foot-elevated split squat'),
  homeExercise('kb_goblet', 'Kettlebell goblet squat', ['legs', 'glutes'], ['kettlebell'], 'Squat holding a kettlebell at your chest'),
  homeExercise('kb_deadlift', 'Kettlebell deadlift', ['legs', 'glutes', 'back'], ['kettlebell'], 'Hip hinge lifting from the floor'),
  homeExercise('kb_rdl', 'Kettlebell Romanian deadlift', ['legs', 'glutes'], ['kettlebell'], 'Controlled hip hinge'),
  homeExercise('glute_bridge', 'Glute bridge', ['glutes', 'legs'], ['mat'], 'Floor-based hip extension'),
  homeExercise('single_bridge', 'Single-leg glute bridge', ['glutes'], ['mat'], 'One-leg floor-based hip extension'),
  homeExercise('db_bridge', 'Dumbbell glute bridge', ['glutes'], ['mat', 'dumbbell'], 'Weighted floor-based hip extension'),
  homeExercise('hip_thrust', 'Dumbbell hip thrust', ['glutes', 'legs'], ['dumbbell', 'bench'], 'Upper back supported on a stable bench'),
  homeExercise('clamshell', 'Side-lying clamshell', ['glutes'], ['mat'], 'Side-lying hip rotation'),
  homeExercise('pike_pushup', 'Pike push-up', ['shoulders', 'arms'], [], 'Bodyweight overhead-press pattern'),
  homeExercise('db_lateral_raise', 'Dumbbell lateral raise', ['shoulders'], ['dumbbell'], 'Controlled side raise'),
  homeExercise('db_front_raise', 'Dumbbell front raise', ['shoulders'], ['dumbbell'], 'Controlled forward raise'),
  homeExercise('db_arnold_press', 'Dumbbell Arnold press', ['shoulders', 'arms'], ['dumbbell'], 'Rotating overhead press'),
  homeExercise('kb_shoulder_press', 'Kettlebell shoulder press', ['shoulders', 'arms'], ['kettlebell'], 'Single-arm overhead press'),
  homeExercise('db_curl', 'Dumbbell biceps curl', ['arms'], ['dumbbell'], 'Standing elbow flexion'),
  homeExercise('db_hammer_curl', 'Dumbbell hammer curl', ['arms'], ['dumbbell'], 'Neutral-grip curl'),
  homeExercise('db_concentration', 'Dumbbell concentration curl', ['arms'], ['dumbbell', 'bench'], 'Seated single-arm curl'),
  homeExercise('db_triceps', 'Dumbbell overhead triceps extension', ['arms'], ['dumbbell'], 'Controlled overhead elbow extension'),
  homeExercise('db_kickback', 'Dumbbell triceps kickback', ['arms'], ['dumbbell'], 'Hip-hinge elbow extension'),
  homeExercise('kb_curl', 'Kettlebell biceps curl', ['arms'], ['kettlebell'], 'Two-handed curl'),
  homeExercise('plank', 'Forearm plank', ['abs'], ['mat'], 'Static core hold'),
  homeExercise('side_plank', 'Side plank', ['abs'], ['mat'], 'Lateral core hold'),
  homeExercise('dead_bug', 'Dead bug', ['abs'], ['mat'], 'Supine opposite arm and leg extension'),
  homeExercise('bicycle_crunch', 'Bicycle crunch', ['abs'], ['mat'], 'Alternating cross-body crunch'),
  homeExercise('reverse_crunch', 'Reverse crunch', ['abs'], ['mat'], 'Controlled pelvic curl'),
  homeExercise('heel_touch', 'Heel touches', ['abs'], ['mat'], 'Alternating side crunch'),
  homeExercise('db_russian_twist', 'Dumbbell Russian twist', ['abs'], ['dumbbell', 'mat'], 'Seated weighted rotation'),
  homeExercise('kb_suitcase', 'Kettlebell suitcase carry', ['abs', 'full-body'], ['kettlebell'], 'Single-sided carry'),
  homeExercise('db_farmer', 'Dumbbell farmer carry', ['abs', 'full-body'], ['dumbbell'], 'Two-sided loaded carry'),
  homeExercise('db_thruster', 'Dumbbell thruster', ['full-body', 'legs', 'shoulders'], ['dumbbell'], 'Squat into overhead press'),
  homeExercise('kb_swing', 'Kettlebell swing', ['full-body', 'glutes', 'legs'], ['kettlebell'], 'Hip-driven swing; technique matters'),
  homeExercise('kb_halo', 'Kettlebell halo', ['shoulders', 'abs'], ['kettlebell'], 'Controlled circle around the head'),
]

const BASE_MUSCLES: Record<string, MuscleGroup[]> = {
  home_general: ['full-body'], bodyweight: ['full-body'], home_pushups: ['chest', 'arms'],
  home_squats: ['legs', 'glutes'], home_hiit: ['full-body'], home_pilates: ['abs'],
  home_core: ['abs'], home_glute: ['glutes'], home_dumbbell_full: ['full-body'],
  home_goblet_squat: ['legs', 'glutes'], home_dumbbell_row: ['back', 'arms'],
  home_dumbbell_press: ['shoulders', 'arms'], home_dumbbell_rdl: ['legs', 'glutes'],
  home_floor_press: ['chest', 'arms'], home_mat_dumbbell: ['full-body'],
}
export const ACTIVITIES: ActivityDef[] = [...BASE_ACTIVITIES.map(item => ({ ...item, muscles: BASE_MUSCLES[item.id] })), ...HOME_EXERCISES]

export function requiredEquipment(item: ActivityDef): EquipmentId[] {
  return item.requires ?? []
}
export function canUseEquipment(item: ActivityDef, owned: EquipmentId[]): boolean {
  return requiredEquipment(item).every(id => owned.includes(id))
}
export function equipmentLabel(item: ActivityDef): string {
  const required = requiredEquipment(item)
  return required.length ? required.map(id => HOME_EQUIPMENT.find(gear => gear.id === id)!.label).join(' + ') : 'Bodyweight · no equipment'
}

export function activityTracking(item: ActivityDef): 'reps' | 'hold' | 'time' {
  if (['home_plank', 'home_side_plank', 'home_wall_sit'].includes(item.id)) return 'hold'
  if (item.type !== 'strength' || item.category === 'mobility' || ['strength_general', 'dumbbell_row', 'gym_vigorous', 'home_general', 'bodyweight', 'home_pushups', 'home_squats', 'home_pilates', 'home_core', 'home_glute', 'home_dumbbell_full', 'home_mat_dumbbell', 'home_kb_suitcase', 'home_db_farmer'].includes(item.id)) return 'time'
  return 'reps'
}

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
