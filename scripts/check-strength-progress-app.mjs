import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
const scratch = await mkdtemp(join(tmpdir(), 'fitcore-progress-check-'))
try {
  const output = join(scratch, 'progress.mjs')
  await build({ stdin: { contents: "export * from './src/lib/strengthProgress';", resolveDir: process.cwd() }, outfile: output, bundle: true, platform: 'node', format: 'esm' })
  const { strengthProgress } = await import(pathToFileURL(output).href)
  const base = { age: 40, sex: 'male', machine: 1001, studyProtocol: true, historyCount: 3, firstDate: '2026-09-01', observations: [
    { date: '2026-09-01', loadKg: 80, durationSeconds: 110 },
    { date: '2026-09-08', loadKg: 80, durationSeconds: 115 },
    { date: '2026-09-15', loadKg: 82.5, durationSeconds: 120 },
  ] }
  const untouched = JSON.stringify(base), result = strengthProgress(base)
  assert.ok(Number.isFinite(result.changePercent)); assert.equal(result.typicalError, 1.7245885909062013)
  assert.equal(JSON.stringify(base), untouched)
  assert.deepEqual(Object.keys(result).sort(), ['changePercent', 'typicalError'])
  const model = JSON.parse(await readFile('data/coach-research/models/strength-progress-ridge.json', 'utf8'))
  const trend = 100 * (82.5 / 80 - 1)
  const raw = [40, 0, Math.log(82.5), 120, 115, 0, 0, 7, trend, 0, trend / 2, Math.log(4), Math.log(15), 1, 0, 0, 120, 0, 0]
  const reference = raw.reduce((sum, value, i) => sum + ((value - model.mean[i]) / model.scale[i]) * model.coefficients[i], model.intercept)
  assert.ok(Math.abs(result.changePercent - reference) < 1e-10)
  for (const machine of [1001, 3001, 5001]) assert.ok('changePercent' in strengthProgress({ ...base, machine }))
  for (const invalid of [{ studyProtocol: false }, { age: 17 }, { age: NaN }, { machine: 999 }, { historyCount: 2 }, { firstDate: '2026-09-02' }, { firstDate: 'invalid' }, { observations: [] },
    { observations: base.observations.map((r, i) => i === 2 ? { ...r, date: '2099-01-01' } : r) },
    { observations: base.observations.map((r, i) => i === 2 ? { ...r, date: '2026-09-08' } : r) },
    { observations: base.observations.map((r, i) => i === 2 ? { ...r, durationSeconds: NaN } : r) },
    { observations: base.observations.map((r, i) => i === 2 ? { ...r, loadKg: 201 } : r) },
    { machine: 3001, observations: base.observations.map(r => ({ ...r, loadKg: 116 })) },
  ]) assert.ok('error' in strengthProgress({ ...base, ...invalid }))
  console.log('PASS: exact trained-weight inference, machine/protocol/age/load/date/duration/history guards, no mutations or kg prescription')
} finally { await rm(scratch, { recursive: true, force: true }) }
