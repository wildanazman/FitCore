import assert from 'node:assert/strict'
import { DEFAULT_PROFILE, loadState } from '../src/lib/storage'
import { assessRunning, generatePlan, parseRunTime, formatPace, planCapability } from '../src/lib/plan'
import { healthyWeightRange, projectWeight, intakeForDeadline, clinicalScenario, projectionEligible } from '../src/lib/weightJourney'
import { dayFuel, tdee } from '../src/lib/nutrition'

const p = { ...DEFAULT_PROFILE, onboarded: true, sports: ['running'] as typeof DEFAULT_PROFILE.sports, planStartDate: '2026-10-05', raceType: '5k' as const, runPlanWeeks: 8, runGoalTimeMin: 30, runBenchmarkKnown: true, bestFiveKmPaceSecPerKm: 360, bestRunDistanceKm: 5, activity: 'light' as const, startWeightKg: 90 }
assert.equal(parseRunTime('28:30'), 28.5)
assert.equal(parseRunTime('1:00:00'), 60)
assert.equal(parseRunTime('30:70'), null)
assert.equal(parseRunTime('0:00'), null)
assert.equal(formatPace(359.7), '6:00/km')
assert.equal(planCapability(p).selectedGoalPace, 360)
const ten = { ...p, raceType: '10k' as const, runGoalTimeMin: 60, runPlanWeeks: 10 }
assert.equal(planCapability(ten).selectedGoalPace, 360)
const fiveRuns = generatePlan(p, 90), tenRuns = generatePlan(ten, 90)
assert.ok(fiveRuns.some(s => s.detail.includes('5 × 2 min')))
assert.ok(tenRuns.some(s => s.detail.includes('4 × 4 min')))
assert.ok(fiveRuns.every(s => s.durationMin > 0 && s.distanceKm! > 0 && s.kcal > 0))
assert.equal(fiveRuns.find(s => s.title === 'Interval Run · 5K repeats')?.durationMin, 38)
const dated = generatePlan({ ...ten, raceDate: '2026-12-06' }, 90)
assert.equal(dated.filter(s => s.zone === 'Event').length, 1)
assert.equal(dated.find(s => s.zone === 'Event')?.date, '2026-12-06')
assert.ok(dated.every(s => s.date <= '2026-12-06'))
assert.ok(!dated.some(s => s.date === '2026-12-05'))
assert.ok(!generatePlan({ ...p, runBenchmarkKnown: false }, 90).some(s => ['Intervals', 'Tempo'].includes(s.zone!)))
assert.equal(assessRunning({ ...p, runGoalTimeMin: 15 }).difficulty, 'unrealistic')
assert.equal(planCapability({ ...p, runGoalTimeMin: 15 }).targetPace, planCapability({ ...p, runGoalTimeMin: null }).targetPace)
const sub25 = { ...p, runGoalTimeMin: 25, bestFiveKmPaceSecPerKm: 312 }
assert.ok(generatePlan(sub25, 90).some(s => s.title === 'Interval Run · 5K goal-pace repeats' && s.runBrief?.pace === '4:50–5:10/km'))
assert.ok(!generatePlan({ ...p, runGoalTimeMin: 25, bestFiveKmPaceSecPerKm: 420 }, 90).some(s => s.title.includes('goal-pace')))
assert.equal(generatePlan({ ...p, sports: [] }, 90).length, 0)
const range = healthyWeightRange(178)
assert.deepEqual(range, { min: 58.7, max: 78.8 })
const projection = projectWeight(p, 90, 1800, range.max)!
assert.ok(projection.reachedDay! > 0)
assert.ok(projection.reachedDay! > (90 - range.max) * 7700 / (tdee(p, 90) - 1800))
const required = intakeForDeadline(p, 90, range.max, 183)!
assert.ok(Math.abs(projectWeight(p, 90, required, range.max, 183)!.endKg - range.max) < .03)
assert.ok(intakeForDeadline(p, 90, range.max, 365)! > required)
assert.equal(intakeForDeadline(p, 90, range.max, NaN), null)
assert.ok(clinicalScenario(p, 90, 1000))
assert.ok(!projectionEligible({ ...p, age: 19 }, 90))
assert.equal(projectWeight({ ...p, age: 19 }, 90, 1800, range.max), null)
// Read an old profile without writing to any real browser storage.
const legacy = { ...p } as Record<string, unknown>
delete legacy.runGoalTimeMin; legacy.raceType = 'half-marathon'; legacy.halfMarathonGoal = 'sub230'
Object.assign(globalThis, { localStorage: { getItem: () => JSON.stringify({ v: 1, profile: legacy, sessions: [], weights: [], foods: [], photos: [] }) } })
assert.equal(loadState()?.profile.runGoalTimeMin, 150)
delete legacy.bestRunDistanceKm; delete legacy.bestRunPaceSecPerKm
const completed = { ...fiveRuns[0], id: 'historic', title: 'Old completed title', completed: true }
Object.assign(globalThis, { localStorage: { getItem: () => JSON.stringify({ v: 1, profile: legacy, sessions: [completed], weights: [], foods: [], photos: [] }) } })
assert.ok(loadState()?.sessions.some(s => s.id === 'historic' && s.title === 'Old completed title'))
const long = { ...tenRuns[0], date:'2026-10-05', distanceKm:15 }
assert.equal(dayFuel({ ...p, calorieTargetOverride:1800, calorieOverrideIncludesTraining:true },90,'2026-10-05',[],[long]).budget,1800)
console.log(JSON.stringify({ passed: true, fiveRuns: fiveRuns.length, tenRuns: tenRuns.length, goalKg: range.max, gapKg: 11.2, initialWeeklyKg: projection.initialWeeklyKg, illustrativeDays: projection.reachedDay, sixMonthIntake: required }))
