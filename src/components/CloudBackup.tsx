import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store/AppContext'
import { useAuth, googleAuthHeaders } from '../store/AuthContext'
import { useTheme, THEMES } from '../store/ThemeContext'
import { apiUrl } from '../lib/apiBase'
import { makeBackup, parseBackup, downloadBackup, type Backup } from '../lib/backup'
import { Icon } from './Icon'

interface CloudRecord { version:number; updated_at:string; bytes:number; payload?:Backup }
export function CloudBackup() {
  const { user } = useAuth()
  const { state, restore } = useApp()
  const { theme, setTheme } = useTheme()
  const [record,setRecord] = useState<CloudRecord|null>(null)
  const [loaded,setLoaded] = useState(false)
  const [busy,setBusy] = useState(false)
  const [photos,setPhotos] = useState(false)
  const [pending,setPending] = useState<{kind:'upload'|'restore'; backup:Backup; version:number}|null>(null)
  const [error,setError] = useState('')
  const [message,setMessage] = useState('')
  const identity = useRef(user?.id)
  identity.current=user?.id
  async function request(download=false, backup?:Backup, expectedVersion?:number) {
    const response = await fetch(apiUrl(`/api/cloud-backup${download?'?download=1':''}`), {
      method:backup?'PUT':'GET', credentials:'include', cache:'no-store',
      headers:{...googleAuthHeaders(),...(backup?{'content-type':'application/json'}:{})},
      body:backup?JSON.stringify({backup,expectedVersion}):undefined,
      signal:AbortSignal.timeout(15000),
    })
    const result=await response.json()
    if (!response.ok) throw new Error(result.error || 'Cloud backup is unavailable. Your local data is safe.')
    return result.backup as CloudRecord|null
  }
  async function refresh() {
    const owner=user?.id
    if (!owner) return
    setBusy(true);setError('');setPending(null)
    try {const value=await request();if(identity.current===owner){setRecord(value);setLoaded(true)}}
    catch(err){if(identity.current===owner){setError(err instanceof Error?err.message:'Cannot reach cloud backup.');setLoaded(false)}}
    finally{if(identity.current===owner)setBusy(false)}
  }
  useEffect(()=>{setRecord(null);setPending(null);setLoaded(false);setError('');setMessage('');setBusy(false);if(user)void refresh()},[user?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  function prepareUpload() {
    setError('');setMessage('')
    const backup=makeBackup(state,theme)
    if (!photos) backup.state={...backup.state,photos:[]}
    if(new Blob([JSON.stringify({backup,expectedVersion:record?.version??0})]).size>3*1024*1024){setError('Cloud limit is 3 MB. Turn photos off, or export a file instead.');return}
    try{parseBackup(JSON.stringify(backup));setPending({kind:'upload',backup,version:record?.version??0})}
    catch{setError('Your data could not be prepared for backup. Export a file and keep it safe; nothing was uploaded.')}
  }
  async function prepareRestore() {
    const owner=user?.id;setBusy(true);setError('');setMessage('')
    try{const value=await request(true);if(identity.current!==owner)return;if(!value?.payload)throw new Error('No cloud backup was found.');const backup=parseBackup(JSON.stringify(value.payload));setRecord(value);setPending({kind:'restore',backup,version:value.version})}
    catch(err){if(identity.current===owner)setError(err instanceof Error?err.message:'Cannot read cloud backup.')}
    finally{if(identity.current===owner)setBusy(false)}
  }
  async function confirm() {
    if(!pending||!user)return
    const owner=user.id;setBusy(true);setError('');setMessage('')
    try {
      if(pending.kind==='upload'){
        const value=await request(false,pending.backup,pending.version)
        if(identity.current!==owner)return
        setRecord(value);setMessage('Saved to your account. Sign in with the same Google account on your other phone to restore.')
      }else{
        // Validate again before the explicit replace action. Keep a local safety copy.
        const backup=parseBackup(JSON.stringify(pending.backup))
        downloadBackup(state,theme)
        restore(backup.state);setTheme(THEMES.find(t=>t.id===backup.theme)?.id??'classic')
        setMessage('Cloud backup restored. A download of your previous local data was requested as a safety copy.')
      }
      setPending(null)
    }catch(err){if(identity.current===owner)setError(err instanceof Error?err.message:'Could not complete backup. Your local data has not changed.')}
    finally{if(identity.current===owner)setBusy(false)}
  }
  return <section className="settings-cloud" aria-labelledby="cloud-backup-title">
    <div className="settings-section-head"><h2 id="cloud-backup-title">Take it with you.</h2><p>Cloud backup for your next phone. Your local logs stay here.</p></div>
    {!user?<p className="settings-help">Sign in with Google in All settings to access your own cloud backup.</p>:<>
      <p className="settings-help">Account: {user.email}</p>
      <p className="settings-help">{loaded ? record ? `Last saved ${new Date(record.updated_at).toLocaleString('en-MY')} · ${Math.ceil(record.bytes/1024)} KB` : 'No cloud backup yet.' : busy ? 'Checking your cloud backup…' : 'Cloud connection not ready.'}</p>
      <label className="settings-cloud-photos"><input type="checkbox" checked={photos} onChange={event=>setPhotos(event.target.checked)} disabled={busy||Boolean(pending)}/>Include progress photos (3 MB total limit)</label>
      <button type="button" className="settings-export" disabled={busy||!loaded||Boolean(pending)} onClick={prepareUpload}><Icon name="upload" size={22}/><span><strong>Upload to my account</strong><small>Meals, workouts, weight, plans, profile & theme.</small></span></button>
      <button type="button" className="settings-export" disabled={busy||!record||Boolean(pending)} onClick={()=>void prepareRestore()}><Icon name="download" size={22}/><span><strong>Restore from cloud</strong><small>Review the saved data before replacing this device.</small></span></button>
      <button type="button" className="settings-overview-back" disabled={busy} onClick={()=>void refresh()}><Icon name="refresh" size={18}/>Refresh cloud status</button>
      {pending&&<div className="settings-import-preview"><h3>{pending.kind==='upload'?'Upload this backup?':'Replace local data?'}</h3><p>{pending.backup.state.foods.length} meals · {pending.backup.state.weights.length} weigh-ins · {pending.backup.state.sessions.length} activities · {pending.backup.state.photos.length} photos</p><p>{pending.kind==='upload' ? 'This sends your personal health data to your FitCore Supabase cloud account and replaces its previous backup. API keys are excluded. Local data is unchanged.' : 'This replaces logs, plans and profile on this device, including photos. A backup-file download of current local data is requested first.'}</p><div className="settings-confirm-actions"><button type="button" disabled={busy} onClick={()=>setPending(null)}>Cancel</button><button type="button" className="settings-restore-confirm" disabled={busy} onClick={()=>void confirm()}>{busy?'Working…':pending.kind==='upload'?'Confirm upload':'Replace & restore'}</button></div></div>}
    </>}
    {error&&<p className="settings-transfer-error" role="alert">{error}</p>}{message&&<p className="settings-transfer-message" role="status">{message}</p>}
    <p className="settings-help">Manual backup, not automatic sync. Stored in FitCore’s Supabase project; project operators can access it. If photos are excluded, they are also absent when that backup is restored. Nothing uploads until you confirm.</p>
  </section>
}
