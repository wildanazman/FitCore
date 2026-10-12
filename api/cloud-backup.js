import { accountIdentity, sessionCommand } from '../server/account-session.js'
import { cloudConfig, cloudOwner, cloudRequest, validateCloudBackup } from '../server/cloud-backup.js'

function send(res,status,data) {
  res.statusCode=status;res.setHeader('content-type','application/json');res.setHeader('cache-control','no-store');res.setHeader('x-content-type-options','nosniff');res.end(JSON.stringify(data))
}
export default async function handler(req,res) {
  if (!['GET','PUT'].includes(req.method)) {res.setHeader('allow','GET, PUT');return send(res,405,{error:'Method not allowed.'})}
  const allowed = new Set(['https://fit-core-five.vercel.app','http://localhost:5182','http://127.0.0.1:5182','http://localhost:5180','http://127.0.0.1:5180'])
  if (req.headers?.['sec-fetch-site']==='cross-site' || (req.headers?.origin && !allowed.has(req.headers.origin))) return send(res,403,{error:'Open cloud backup from FitCore.'})
  try {
    const user=await accountIdentity(req)
    const owner=cloudOwner(user) // Never accept owner/account IDs from request bodies.
    if (!cloudConfig()) return send(res,503,{error:'Cloud backup is not connected yet. File export still works.'})
    if (req.method==='GET') {
      const download=new URL(req.url,'https://fitcore.invalid').searchParams.get('download')==='1'
      const rows=await cloudRequest(`fitcore_cloud_backups?owner_id=eq.${encodeURIComponent(owner)}&select=${download?'payload,':''}version,updated_at,bytes&limit=1`)
      return send(res,200,{backup:rows[0]??null})
    }
    if (!req.headers?.['content-type']?.startsWith('application/json')) return send(res,415,{error:'Use a JSON backup.'})
    const value=validateCloudBackup(req.body)
    const rateKey=`fitcore:cloud-upload:${owner}:${new Date().toISOString().slice(0,10)}`
    const count=Number(await sessionCommand(['INCR',rateKey]))
    if (count===1) await sessionCommand(['EXPIRE',rateKey,'172800'])
    if (!Number.isFinite(count) || count>20) return send(res,429,{error:'20 cloud uploads per day. Your local logs still work; try again tomorrow.'})
    const result=await cloudRequest('rpc/fitcore_save_backup',{method:'POST',body:{p_owner:owner,p_payload:value.backup,p_expected:value.expectedVersion,p_bytes:value.bytes}})
    return send(res,200,{backup:result[0]})
  } catch (error) { return send(res,error.status??503,{error:error.status ? error.message : 'Cloud backup is temporarily unavailable. Your local data has not changed.'}) }
}
