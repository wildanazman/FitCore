// Import public research data only. Never reads app/user logs or executes upstream code.
import { mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

const destination = resolve('data/coach-research')
const sources = [
  { id: 'free-exercise-db', owner: 'yuhonas/free-exercise-db', revision: 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5', file: 'dist/exercises.json', licenseFile: 'LICENSE.md', license: 'Unlicense', role: 'Exercise metadata and publisher difficulty labels; not individualized plan/outcome labels.' },
  { id: 'muscle-volume-catalog', owner: 'smyrdev/exercises-dataset', revision: 'caa12623b8b469aaa9d85a0601442a4622c71103', file: 'data/exercises.json', licenseFile: 'LICENSE', license: 'MIT', role: 'Movement/muscle metadata; muscle-volume weights are publisher-authored heuristics, not participant measurements.' },
  { id: 'open-wod-db', owner: 'WodWiz/open-wod-db', revision: '1a2e4ab31d1af85321637d3c09a36efaf5265a6d', file: 'data/index.json', licenseFile: 'LICENSE-DATA', license: 'CC-BY-4.0', role: 'CrossFit benchmark prescriptions; reference only, not personalized beginner programmes or measured outcomes.' },
]

async function download(url, limit = 20_000_000) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`${response.status} while fetching ${url}`)
  const reader = response.body.getReader()
  const chunks = []; let size = 0
  while (true) {
    const { done, value } = await reader.read(); if (done) break
    size += value.length
    if (size > limit) { await reader.cancel(); throw new Error('Dataset exceeded the download size limit') }
    chunks.push(Buffer.from(value))
  }
  return Buffer.concat(chunks)
}
function inspect(value) {
  if (!Array.isArray(value) && (!value || typeof value !== 'object')) throw new Error('Unexpected dataset format')
  const rows = Array.isArray(value) ? value : Object.values(value).find(Array.isArray)
  if (!rows || rows.length === 0 || rows.length > 10000 || rows.some(r => !r || typeof r !== 'object' || Array.isArray(r))) throw new Error('Expected a bounded non-empty record collection')
  return { count: rows.length, fields: [...new Set(rows.flatMap(row => Object.keys(row)))].sort(), sample: rows.slice(0,2) }
}
await mkdir(destination, { recursive: true })
const manifest = []
for (const source of sources) {
  const base = `https://raw.githubusercontent.com/${source.owner}/${source.revision}`
  const [bytes, licenseBytes] = await Promise.all([download(`${base}/${source.file}`), download(`${base}/${source.licenseFile}`,100000)])
  const licenseText = licenseBytes.toString('utf8')
  const signature = source.license === 'MIT' ? 'MIT License' : source.license === 'Unlicense' ? 'public domain' : 'Creative Commons'
  if (!licenseText.includes(signature)) throw new Error(`License check failed for ${source.id}`)
  const details = inspect(JSON.parse(bytes.toString('utf8')))
  await writeFile(resolve(destination, `${source.id}.json`), bytes)
  await writeFile(resolve(destination, `${source.id}.license.txt`), licenseBytes)
  const entry = { ...source, sourceUrl: `https://github.com/${source.owner}`, dataUrl: `${base}/${source.file}`, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), records: details.count, fields: details.fields, importedAt: new Date().toISOString(), activatedInApp: false, participantOutcomeLabels: false }
  manifest.push(entry)
  console.log(JSON.stringify({id:source.id,records:entry.records,bytes:entry.bytes,fields:entry.fields},null,2))
}
await writeFile(resolve(destination,'manifest.json'), JSON.stringify({ purpose:'Offline research; not a trained or clinically validated planning model',sources:manifest },null,2)+'\n')
