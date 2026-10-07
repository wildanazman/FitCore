// Regression checks for the shared calorie calculator used by onboarding and Home.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/lib/nutrition.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { bmr, tdee, autoCaloriePlan } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const baseline = { sex: 'male', age: 30, heightCm: 170, activity: 'sedentary', goal: 'lose', weightLossPace: 'steady' };
assert.equal(bmr(baseline, 80), 1718);
assert.equal(bmr({ ...baseline, sex: 'female' }, 80), 1552);
assert.equal(bmr({ ...baseline, age: 40 }, 80), 1668);
assert.equal(bmr({ ...baseline, heightCm: 180 }, 80), 1780);
assert.equal(bmr(baseline, 90), 1818);
for (const [activity, factor] of Object.entries({ sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725, athlete: 1.9 })) {
  assert.equal(tdee({ ...baseline, activity }, 80), Math.round(1718 * factor));
}
for (const sex of ['male', 'female']) for (const weight of [50, 70, 100, 150]) for (const activity of ['sedentary', 'moderate', 'athlete']) {
  const p = { ...baseline, sex, activity };
  const plan = autoCaloriePlan(p, weight);
  assert.equal(plan.deficitKcal, Math.max(0, plan.maintenance - plan.target));
  assert.ok(plan.deficitKcal <= 1000);
  assert.ok(plan.target <= plan.maintenance);
  assert.ok(plan.target >= Math.min(plan.maintenance, sex === 'male' ? 1500 : 1200));
  assert.equal(autoCaloriePlan({ ...p, goal: 'maintain' }, weight).target, plan.maintenance);
  assert.equal(autoCaloriePlan({ ...p, goal: 'gain' }, weight).target, Math.round(plan.maintenance * 1.1));
  assert.equal(autoCaloriePlan({ ...p, sports: ['strength'] }, weight).target, plan.target);
}
assert.equal(autoCaloriePlan({ ...baseline, weightLossPace: 'faster' }, 60).pace, 'steady');
assert.equal(autoCaloriePlan(baseline, 45).deficitKcal, 0);
assert.ok(autoCaloriePlan({ ...baseline, weightLossPace: 'faster' }, 90).target < autoCaloriePlan(baseline, 90).target);
console.log('PASS: Mifflin-St Jeor sex/age/height/weight, five activity factors, goals, intake floors, deficit cap, underweight, faster eligibility, strength-neutral calories.');
