import type { AppState } from '../types'
import { DEFAULT_PROFILE, STATE_VERSION } from './storage'
import { geminiModelOrDefault } from '../../shared/geminiModels.js'

export interface Backup { format: 'fitcore-backup'; version: 1; exportedAt: string; state: AppState; theme: string }
export function makeBackup(state: AppState, theme: string): Backup {
  return { format: 'fitcore-backup', version: 1, exportedAt: new Date().toISOString(), theme, state: { ...state, profile: { ...state.profile, anthropicApiKey: '' } } }
}
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value) }
function assert(condition: unknown): asserts condition { if (!condition) throw new Error('This file is not a valid FitCore backup. Your current data has not changed.') }
function safeTree(value: unknown, depth = 0): void {
  assert(depth < 30)
  if (typeof value === 'number') assert(Number.isFinite(value))
  if (Array.isArray(value)) { assert(value.length <= 100000); value.forEach(item => safeTree(item, depth + 1)) }
  else if (record(value)) for (const [key, item] of Object.entries(value)) { assert(!['__proto__', 'prototype', 'constructor'].includes(key)); safeTree(item, depth + 1) }
}
export function parseBackup(raw: string): Backup {
  assert(raw.length <= 20 * 1024 * 1024)
  let data: unknown
  try { data = JSON.parse(raw) } catch { throw new Error('Cannot read this file. Choose the .json backup exported by FitCore, not a CSV.') }
  safeTree(data)
  assert(record(data) && data.format === 'fitcore-backup' && data.version === 1 && record(data.state))
  const state = data.state
  assert(state.v === STATE_VERSION && record(state.profile))
  const p = state.profile
  for (const [key, defaultValue] of Object.entries(DEFAULT_PROFILE)) {
    const value = p[key]
    if (key === 'geminiModel' && value === undefined) continue // Older backups predate model selection.
    if (Array.isArray(defaultValue)) assert(Array.isArray(value))
    else if (record(defaultValue)) { assert(record(value)); for (const [sub, v] of Object.entries(defaultValue)) assert(typeof value[sub] === typeof v) }
    else if (defaultValue !== null) assert(typeof value === typeof defaultValue)
  }
  assert(p.onboarded === true && ['male','female'].includes(String(p.sex)) && ['lose','gain','maintain'].includes(String(p.goal)))
  assert(['metric','imperial'].includes(String(p.units)) && ['sedentary','light','moderate','high','athlete'].includes(String(p.activity)))
  assert(['standard','keto','egg','16:8','omad'].includes(String(p.dietMode)))
  assert(Number(p.age) >= 13 && Number(p.age) <= 120 && Number(p.heightCm) >= 60 && Number(p.heightCm) <= 260 && Number(p.startWeightKg) > 0)
  assert(Array.isArray(p.sports) && p.sports.every(v => typeof v === 'string'))
  assert(Array.isArray(p.runPreferredDays) && p.runPreferredDays.every(v => Number.isInteger(v) && Number(v) >= 0 && Number(v) <= 6))
  assert(['steady','faster'].includes(String(p.weightLossPace)) && ['5k','10k','half-marathon','marathon'].includes(String(p.raceType)))
  for(const key of ['runBenchmarkPaceSec','runWeeklyKm','runRecentDaysPerWeek'])if(p[key]!==undefined)assert(typeof p[key]==='number')
  if(p.runBaseOnly!==undefined)assert(typeof p.runBaseOnly==='boolean')
  if(p.runExperience!==undefined)assert(['new','returning','regular'].includes(String(p.runExperience)))
  const required: Record<string, Record<string, string>> = {
    foods: { name:'string', emoji:'string', loggedAt:'string', slot:'string', kcal:'number', protein:'number', carbs:'number', fat:'number', servings:'number', confidence:'number' },
    weights: { weightKg:'number' }, photos:{ dataUrl:'string' },
    sessions:{ type:'string', title:'string', detail:'string', durationMin:'number', kcal:'number', completed:'boolean', plan:'string', icon:'string' },
    dietTasks:{ title:'string', completed:'boolean' },
  }
  for (const [key, fields] of Object.entries(required)) {
    const entries=state[key]; assert(Array.isArray(entries))
    const ids=new Set<string>()
    for(const entry of entries) {
      assert(record(entry) && typeof entry.id==='string' && !ids.has(entry.id) && typeof entry.date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.date))
      ids.add(entry.id)
      for(const [field,type] of Object.entries(fields))assert(typeof entry[field]===type)
      if(key==='photos')assert(typeof entry.dataUrl==='string' && /^data:image\/(jpeg|png|webp);base64,/.test(entry.dataUrl))
      if(key==='weights')assert(Number(entry.weightKg)>0)
      if(key==='foods')assert(['breakfast','lunch','dinner','snack'].includes(String(entry.slot)))
      if(entry.components!==undefined)assert(Array.isArray(entry.components)&&entry.components.every(item=>record(item)&&typeof item.name==='string'&&typeof item.kcal==='number'&&['protein','carbs','fat','grams'].every(k=>item[k]===undefined||typeof item[k]==='number')))
      for(const field of ['photo','nutritionSource','nutritionSourceUrl','foodEntryId','completedAt','source'])if(entry[field]!==undefined)assert(typeof entry[field]==='string')
      if(key==='sessions') {
        assert(['run','strength','sport','rest'].includes(String(entry.type)) && ['running','strength','sport','manual'].includes(String(entry.plan)))
        if(entry.runBrief!==undefined)assert(record(entry.runBrief) && typeof entry.runBrief.pace==='string' && typeof entry.runBrief.note==='string' && Array.isArray(entry.runBrief.steps) && entry.runBrief.steps.every(s=>record(s)&&typeof s.label==='string'&&typeof s.value==='string'))
        if(entry.strengthLog!==undefined)assert(record(entry.strengthLog) && Array.isArray(entry.strengthLog.sets) && entry.strengthLog.sets.every(s=>record(s)&&typeof s.reps==='number'&&typeof s.weightKg==='number'))
        if(entry.runLog!==undefined)assert(record(entry.runLog)&&typeof entry.runLog.kind==='string'&&record(entry.runLog.settings)&&Object.values(entry.runLog.settings).every(v=>typeof v==='string'||typeof v==='number'))
      }
      if(entry.meal!==undefined)assert(record(entry.meal) && ['kcal','protein','carbs','fat','servings'].every(k=>typeof (entry.meal as Record<string,unknown>)[k]==='number') && ['slot','time','serving'].every(k=>typeof (entry.meal as Record<string,unknown>)[k]==='string'))
    }
  }
  for(const key of ['targetWeightKg','runGoalTimeMin','calorieTargetOverride'])assert(p[key]===null||typeof p[key]==='number')
  for(const key of ['raceDate','planStartDate'])assert(p[key]===null||typeof p[key]==='string')
  for(const key of ['runCheckpoints','runWeekFeedback','homeEquipment'])if(p[key]!==undefined)assert(Array.isArray(p[key]))
  if(Array.isArray(p.runCheckpoints))assert(p.runCheckpoints.every(v=>record(v)&&typeof v.fromWeek==='number'&&typeof v.distanceKm==='number'&&typeof v.paceSec==='number'))
  if(Array.isArray(p.runWeekFeedback))assert(p.runWeekFeedback.every(v=>record(v)&&typeof v.week==='number'&&['comfortable','hard','missed'].includes(String(v.response))))
  if(Array.isArray(p.homeEquipment))assert(p.homeEquipment.every(v=>['mat','dumbbell','bench','kettlebell'].includes(String(v))))
  if(state.streakMilestonesSeen!==undefined)assert(Array.isArray(state.streakMilestonesSeen)&&state.streakMilestonesSeen.every(v=>typeof v==='number'))
  return { format:'fitcore-backup', version:1, exportedAt:typeof data.exportedAt==='string'?data.exportedAt:'', theme:typeof data.theme==='string'?data.theme:'classic', state: { ...(state as unknown as AppState), profile: { ...(p as unknown as AppState['profile']), anthropicApiKey:'', geminiModel:geminiModelOrDefault(p.geminiModel) } } }
}
export function downloadBackup(state: AppState, theme: string) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(makeBackup(state,theme),null,2)],{type:'application/json'}))
  const link=document.createElement('a'); link.href=url; link.download=`fitcore-backup-${new Date().toISOString().slice(0,10)}.json`; link.click()
  window.setTimeout(()=>URL.revokeObjectURL(url),1000)
}
