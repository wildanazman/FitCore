import type { UserProfile } from '../types'
import { ACTIVITIES, activityTracking, canUseEquipment } from './activities'

/** Date-scoped preferences; the recurring routine and saved kit remain unchanged. */
export function coachProfileForDate(profile: UserProfile, date: string): UserProfile {
  const settings=profile.strengthDaySettings?.[date]
  if(!settings||!profile.strengthCoach)return profile
  return {...profile,homeEquipment:settings.equipment??profile.homeEquipment,
    strengthCoach:{...profile.strengthCoach,gym:settings.venue?settings.venue==='gym':profile.strengthCoach.gym}}
}

// Explicit movement families: a shared muscle label alone is not a safe substitution rule.
const families = [
  ['gym_chest_press','gym_db_bench','bench_press','home_db_bench_press','home_floor_press','home_kb_floor_press','home_db_squeeze_press','home_pushup','home_kneeling_pushup','home_bench_pushup'],
  ['gym_incline_press','gym_incline_barbell','home_decline_pushup'],
  ['gym_seated_row','gym_barbell_row','gym_db_row','home_bench_row','home_db_bent_row','home_kb_row'],
  ['gym_lat_pulldown','gym_pullup'],
  ['gym_shoulder_press','gym_barbell_overhead','home_dumbbell_press','home_db_arnold_press','home_kb_shoulder_press','home_pike_pushup'],
  ['gym_leg_press','gym_hack_squat','gym_smith_squat','squat','gym_front_squat','home_bodyweight_squat','home_kb_goblet','home_goblet_squat'],
  ['gym_bulgarian','home_db_split_squat','home_split_squat','home_db_bulgarian','home_bulgarian_squat','home_db_lunge','home_reverse_lunge','gym_barbell_lunge'],
  ['gym_rdl','home_db_rdl','home_dumbbell_rdl','home_kb_rdl','home_bodyweight_hinge'],
  ['deadlift','gym_sumo_deadlift','gym_trap_deadlift','home_kb_deadlift'],
  ['gym_hip_thrust','home_hip_thrust','home_glute_bridge','home_db_bridge','home_single_bridge'],
  ['gym_pec_deck','gym_cable_fly','home_db_bench_fly'],
  ['gym_biceps_curl','gym_barbell_curl','gym_ez_curl','home_db_curl','home_kb_curl','gym_hammer_curl','home_db_hammer_curl'],
  ['gym_triceps_pushdown','gym_overhead_triceps','gym_ez_skullcrusher','home_db_triceps','home_db_kickback'],
  ['gym_lateral_raise','home_db_lateral_raise'],
  ['gym_rear_delt','home_db_reverse_fly'],
  ['gym_calf_raise','home_calf_raise'],
  ['gym_plank','home_plank'],
]
export function swapCandidates(id: string, profile: UserProfile, excluded: string[] = []) {
  const family = families.find(group => group.includes(id))
  const original = ACTIVITIES.find(item => item.id === id)
  if (!family || !original) return []
  return ACTIVITIES.filter(item => item.id !== id && !excluded.includes(item.id) && family.includes(item.id)
    && activityTracking(item) === activityTracking(original)
    && (profile.strengthCoach?.gym || (item.category === 'home' && canUseEquipment(item, profile.homeEquipment ?? []))))
}
