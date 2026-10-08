import { useEffect, useRef, useState } from 'react'
import { searchLocalFoods } from '../lib/localFoods'
import { lookupFood, sourceLabel, type LookupResult } from '../lib/foodLookup'
import type { DetectionItem } from '../lib/foodAI'
import { Icon } from './Icon'

export function CorrectMealComponent({ name, onApply, onCancel }: { name: string; onApply: (item: DetectionItem) => void; onCancel: () => void }) {
  const [query,setQuery]=useState(name)
  const [result,setResult]=useState<LookupResult|null>(null)
  const [quantity,setQuantity]=useState('1')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const controller=useRef<AbortController|null>(null)
  useEffect(()=>()=>controller.current?.abort(),[])
  const foods=searchLocalFoods(query,6)
  const multiplier=Number(quantity)
  const valid=Number.isFinite(multiplier)&&multiplier>0&&multiplier<=20
  function changeQuery(value:string){controller.current?.abort();setBusy(false);setQuery(value);setResult(null);setError('')}
  async function online(){controller.current?.abort();const request=new AbortController();controller.current=request;setBusy(true);setError('');setResult(null);try{const found=await lookupFood(query,request.signal,'online');if(!request.signal.aborted){if(![found.kcal,found.protein,found.carbs,found.fat].every(v=>Number.isFinite(v)&&v>=0))throw new Error('Incomplete nutrition result. Try another food name.');setResult(found);setQuantity('1')}}catch(err){if(!request.signal.aborted)setError(err instanceof Error?err.message:'Search failed. Try again.')}finally{if(!request.signal.aborted)setBusy(false)}}
  return <div className="camera-correction"><div className="camera-correction-heading"><h3>Find the right food.</h3><button type="button" onClick={onCancel} aria-label="Cancel food correction"><Icon name="close" size={20}/></button></div><label>Food name<input autoFocus value={query} onChange={e=>changeQuery(e.target.value)} placeholder="e.g. buttermilk chicken"/></label>
    {!result&&<><p>From the local food library</p><div className="camera-correction-results">{foods.map((food,index)=><button type="button" key={`${food.name}-${index}`} onClick={()=>{setResult({...food,source:'local',confidence:.8});setQuantity('1')}}><span><strong>{food.name}</strong><small>{food.serving}</small></span><span>{food.kcal} kcal<Icon name="chevron_right" size={18}/></span></button>)}{!foods.length&&<p>No local matches. Try online search or change the name.</p>}</div><button type="button" className="camera-correction-online" onClick={()=>void online()} disabled={busy||query.trim().length<3}><Icon name={busy?'progress_activity':'travel_explore'} size={19} className={busy?'animate-spin':''}/>{busy?'Searching nutrition…':'Search online instead'}</button><small>Online search needs an available nutrition service. Results are estimates.</small></>}
    {result&&<div className="camera-correction-preview"><h3>{result.name}</h3><p>{sourceLabel(result.source)} · {result.serving}</p><dl>{(['kcal','protein','carbs','fat'] as const).map(key=><div key={key}><dt>{key==='kcal'?'Calories':key}</dt><dd>{Math.round(result[key]*(valid?multiplier:1))}{key==='kcal'?' kcal':' g'}</dd></div>)}</dl><label>How many of this serving?<input type="number" min="0.1" max="20" step="0.1" inputMode="decimal" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label>{result.note&&<p>{result.note}</p>}<div className="camera-correction-buttons"><button type="button" onClick={()=>setResult(null)}>Choose another</button><button type="button" disabled={!valid} onClick={()=>{const grams=/^\s*(\d+(?:\.\d+)?)\s*g\s*$/i.exec(result.serving);onApply({name:result.name,portion:`${multiplier} × ${result.serving}`,grams:grams?Number(grams[1])*multiplier:undefined,kcal:result.kcal*multiplier,protein:result.protein*multiplier,carbs:result.carbs*multiplier,fat:result.fat*multiplier})}}>Use this food</button></div></div>}
    {error&&<p role="alert" className="camera-result-alert">{error}</p>}
  </div>
}
