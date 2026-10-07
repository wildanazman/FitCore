import type { FoodEntry, UserProfile, WeightEntry } from '../types'
import { addDays, daysBetween } from './date'
import { baseCalorieTarget, bmiValue, tdee } from './nutrition'

export function weightFeedback(profile:UserProfile,weights:WeightEntry[],foods:FoodEntry[],asOf:string) {
  const ordered=[...weights].filter(w=>w.date<=asOf&&Number.isFinite(w.weightKg)&&w.weightKg>0).sort((a,b)=>b.date.localeCompare(a.date))
  const latest=ordered[0],previous=ordered.find(w=>w.date<latest?.date)
  if(!latest||!previous||profile.age<20)return null
  const days=daysBetween(previous.date,latest.date),change=latest.weightKg-previous.weightKg
  const maintenance=tdee(profile,latest.weightKg),target=baseCalorieTarget(profile,latest.weightKg)
  if(!Number.isFinite(maintenance)||!Number.isFinite(target))return null
  const inDirection=profile.goal==='lose'?change<-.05&&bmiValue(profile.heightCm,latest.weightKg)>=18.5:profile.goal==='gain'?change>.05:Math.abs(change)<.2
  const heading=inDirection ? profile.goal==='gain'?'Nice work. Moving toward your gain goal.':profile.goal==='lose'?'Nice work. Your weight is moving down.':'Holding steady.' : 'One weigh-in is not the whole story.'
  let loggedDays=0,energy=0
  // Bound long gaps and never interpret an empty day as fasting.
  if(days<=90)for(let i=0;i<days;i++) {
    const date=addDays(previous.date,i),meals=foods.filter(f=>f.date===date)
    if(!meals.length)continue
    const historicalWeight=ordered.find(w=>w.date<=date)?.weightKg??previous.weightKg
    loggedDays++;energy+=tdee(profile,historicalWeight)-meals.reduce((sum,f)=>sum+f.kcal*f.servings,0)
  }
  return {latest,previous,days,change,heading,inDirection,maintenance,target,loggedDays,energy,
    equivalentKg:Math.abs(energy)/7700,plannedBalance:maintenance-target}
}
