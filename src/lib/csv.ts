// Data export (PRD 6.3 — export all data as CSV).

import type { AppState } from '../types'

function csvRow(values: (string | number)[]): string {
  return values
    .map((v) => {
      const s = String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    })
    .join(',')
}

export function buildCSV(state: AppState): string {
  const lines: string[] = []

  lines.push('# FitCore data export')
  lines.push('')
  lines.push('## Food log')
  lines.push(csvRow(['date', 'time', 'slot', 'name', 'servings', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'confidence']))
  for (const f of state.foods) {
    lines.push(csvRow([f.date, f.loggedAt, f.slot, f.name, f.servings, f.kcal, f.protein, f.carbs, f.fat, f.confidence]))
  }

  lines.push('')
  lines.push('## Weight log')
  lines.push(csvRow(['date', 'weight_kg', 'neck_cm', 'waist_cm', 'hip_cm']))
  for (const w of state.weights) {
    lines.push(csvRow([w.date, w.weightKg, w.neckCm ?? '', w.waistCm ?? '', w.hipCm ?? '']))
  }

  lines.push('')
  lines.push('## Training sessions')
  lines.push(csvRow(['date', 'plan', 'type', 'title', 'detail', 'duration_min', 'kcal', 'completed']))
  for (const s of state.sessions) {
    lines.push(csvRow([s.date, s.plan, s.type, s.title, s.detail, s.durationMin, s.kcal, s.completed ? 'yes' : 'no']))
  }

  return lines.join('\n')
}

export function downloadCSV(state: AppState): void {
  const blob = new Blob([buildCSV(state)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fitcore-export-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
