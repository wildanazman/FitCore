import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { THEMES, useTheme } from '../store/ThemeContext'
import { downloadBackup, parseBackup } from '../lib/backup'
import type { Backup } from '../lib/backup'
import { Icon } from './Icon'

export function BackupTransfer({ importOnly = false }: { importOnly?: boolean }) {
  const { state, restore } = useApp()
  const { theme, setTheme } = useTheme()
  const navigate=useNavigate()
  const fileRef=useRef<HTMLInputElement>(null)
  const [pending,setPending]=useState<Backup|null>(null)
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  async function choose(file?:File) {
    setPending(null);setError('');setMessage('')
    if(!file)return
    if(file.size>20*1024*1024){setError('Backup is too large. Maximum file size is 20 MB.');return}
    setBusy(true)
    try {setPending(parseBackup(await file.text()))}catch(err){setError(err instanceof Error?err.message:'Cannot read this backup. Your data has not changed.')}finally{setBusy(false);if(fileRef.current)fileRef.current.value=''}
  }
  function confirm() {
    if(!pending)return
    try {restore(pending.state);setTheme(THEMES.find(t=>t.id===pending.theme)?.id??'classic');setPending(null);setMessage('Backup restored. Your logs and plans are ready.');if(importOnly)navigate('/',{replace:true})}catch(err){setError(err instanceof Error?err.message:'Restore failed. Your data has not changed.')}
  }
  return <div className="settings-backup">
    {!importOnly&&<button type="button" className="settings-export" onClick={()=>{downloadBackup(state,theme);setMessage('Backup download requested. Keep the file somewhere private.');setError('')}}><Icon name="download" size={22}/><span><strong>Back up everything</strong><small>Profile, meals, workouts, weight, photos, plans & theme.</small></span><Icon name="arrow_forward" size={20}/></button>}
    <button type="button" className="settings-export" disabled={busy} onClick={()=>fileRef.current?.click()}><Icon name="upload" size={22}/><span><strong>{busy?'Reading backup…':'Restore a backup'}</strong><small>Choose your FitCore .json file from another phone.</small></span><Icon name="arrow_forward" size={20}/></button>
    <input ref={fileRef} type="file" accept=".json,application/json" className="sr-only" tabIndex={-1} onChange={e=>void choose(e.target.files?.[0])} aria-label="Choose FitCore backup"/>
    {pending&&<div className="settings-import-preview"><h3>Ready to restore?</h3><p><strong>{pending.state.profile.name||'Your profile'}</strong> · {pending.state.foods.length} meals · {pending.state.weights.length} weigh-ins · {pending.state.sessions.length} activities · {pending.state.photos.length} photos · {pending.state.dietTasks.length} plan items</p><p>This replaces the profile and logs on this device. Export a backup of your current data first. API keys are not transferred.</p><div className="settings-confirm-actions"><button type="button" onClick={()=>{setPending(null);setError('')}}>Cancel</button><button type="button" className="settings-restore-confirm" onClick={confirm}>Replace & restore</button></div></div>}
    {message&&<p className="settings-transfer-message" role="status">{message}</p>}{error&&<p className="settings-transfer-error" role="alert">{error}</p>}
    <p className="settings-help">Backup files contain personal health data and photos. Keep them private. API keys are excluded. Nothing is uploaded.</p>
  </div>
}
