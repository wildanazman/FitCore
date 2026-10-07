import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const url = js => `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;
// Suggestions use only curated references, not the imported search catalogue.
const localSource = readFileSync(new URL('../src/lib/localFoods.ts', import.meta.url), 'utf8').replace("import { MYFCD_FOODS } from './myfcdFoods'", 'const MYFCD_FOODS: LocalFood[] = []').replace("'../../shared/foodSuitability.js'", JSON.stringify(new URL('../shared/foodSuitability.js', import.meta.url).href));
const localUrl = url(compile(localSource));
const ideaSource = readFileSync(new URL('../src/lib/proteinIdeas.ts', import.meta.url), 'utf8').replace("'./localFoods'", JSON.stringify(localUrl));
const { proteinIdeas } = await import(url(compile(ideaSource)));
for (const gap of [0, -10, NaN, Infinity]) assert.equal(proteinIdeas(gap).items.length, 0);
for (const dairy of [true, false]) {
  for (let gap = 1; gap <= 500; gap += 0.5) {
    const plan = proteinIdeas(gap, dairy);
    assert.ok(plan.protein >= gap, `${gap}g gap not covered`);
    assert.ok(plan.kcal > 0);
    assert.ok(plan.items.every(item => item.protein > 0 && Number.isFinite(item.kcal)));
    assert.equal(plan.kcal, Math.round(plan.items.reduce((sum, item) => sum + item.kcal, 0)));
    if (!dairy) assert.ok(!plan.items.some(item => item.name.includes('Yogurt')));
  }
}
assert.equal(proteinIdeas(5).protein, 6);
assert.equal(proteinIdeas(12).protein, 12);
assert.equal(proteinIdeas(139).protein, 139.3);
assert.equal(proteinIdeas(139).kcal, 955);
console.log('PASS: zero/invalid/met gaps; 1–500g gaps with and without dairy covered; portion totals; 139g example = 139.3g protein / 955kcal.');
