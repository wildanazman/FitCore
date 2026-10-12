import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

const manifest = JSON.parse(await readFile('data/coach-research/manifest.json','utf8'))
assert.equal(manifest.sources.length,3)
for(const source of manifest.sources){
  const bytes = await readFile(`data/coach-research/${source.id}.json`)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256)
  const value = JSON.parse(bytes)
  const rows = Array.isArray(value) ? value : Object.values(value).find(Array.isArray)
  assert.equal(rows.length,source.records)
  assert.equal(new Set(rows.map(row=>row.id)).size,rows.length)
  assert.ok(rows.every(row=>typeof row.name==='string' && row.name.trim()))
  assert.equal(source.activatedInApp,false)
  assert.equal(source.participantOutcomeLabels,false)
  assert.ok((await readFile(`data/coach-research/${source.id}.license.txt`,'utf8')).length>100)
  console.log(`${source.id}: ${rows.length} records, IDs and checksum verified; research only`)
}
