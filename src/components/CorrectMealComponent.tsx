import { useState } from 'react'
import { FoodReferencePicker } from './FoodReferencePicker'
import { referenceGrams,type FoodReference } from '../lib/foodReferences'
import type { DetectionItem } from '../lib/foodAI'
import { Icon } from './Icon'
import { hasExcludedIngredients } from '../../shared/foodSuitability.js'

export function CorrectMealComponent({name,onApply,onCancel}:{name:string;onApply:(item:DetectionItem)=>void;onCancel:()=>void}) {
  const [result,setResult]=useState<FoodReference|null>(null)
  const [quantity,setQuantity]=useState('1')
  const [values,setValues]=useState({kcal:'',protein:'',carbs:'',fat:''})
  function select(item:FoodReference){setResult(item);setQuantity('1');setValues({kcal:item.kcal==null?'':String(item.kcal),protein:item.protein==null?'':String(item.protein),carbs:item.carbs==null?'':String(item.carbs),fat:item.fat==null?'':String(item.fat)})}
  const multiplier=Number(quantity),grams=result?referenceGrams(result.serving):undefined
  const valid=result&&result.name.trim().length>0&&!hasExcludedIngredients(result.name)&&Number.isFinite(multiplier)&&multiplier>0&&multiplier<=50&&values.kcal!==''&&Object.values(values).every(value=>value===''||Number.isFinite(Number(value))&&Number(value)>=0)
  function apply(){if(!result||!valid)return;const nutrients=Object.fromEntries((['protein','carbs','fat'] as const).filter(key=>values[key]!=='').map(key=>[key,Number(values[key])*multiplier]));onApply({name:result.name,portion:`${multiplier} × ${result.serving}`,grams:grams?grams*multiplier:undefined,kcal:Number(values.kcal)*multiplier,...nutrients,sourceLabel:result.sourceLabel,sourceUrl:result.sourceUrl})}
  return <div className="camera-correction"><div className="camera-correction-heading"><h3>{result?'Check this component':'Find the right food or drink'}</h3><button type="button" onClick={onCancel} aria-label="Cancel food correction"><Icon name="close" size={20}/></button></div>
    {!result?<FoodReferencePicker initialQuery={name} onPick={select} onManual={name=>select({id:'manual',name:name||'My food',serving:'1 serving',kcal:null,sourceLabel:'Entered by you',kind:'meal'})}/>:<div className="camera-correction-preview"><h3>{result.name}</h3><p>{result.serving} · {result.sourceLabel}</p>
      {result.id==='manual'&&<label>Component name<input value={result.name} maxLength={120} onChange={event=>setResult({...result,name:event.target.value})}/></label>}
      <label>Servings<input type="number" min="0.1" max="50" step="0.25" inputMode="decimal" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label>
      <div className="camera-correction-buttons">{[.5,1,1.5,2,3].map(n=><button type="button" key={n} aria-pressed={multiplier===n} onClick={()=>setQuantity(String(n))}>{n}×</button>)}</div>
      {grams&&<label>Or weight in grams<input type="number" min="1" max="5000" value={Number.isFinite(multiplier)?Math.round(grams*multiplier):''} onChange={e=>setQuantity(Number(e.target.value)>0?String(Number(e.target.value)/grams):'')}/></label>}
      <p><strong>{values.kcal!==''&&Number.isFinite(multiplier)?`${Math.round(Number(values.kcal)*multiplier)} kcal for this portion`:'Enter calories to continue'}</strong></p>
      <details open={result.kcal===null}><summary>Check nutrition for one reference serving</summary>{(['kcal','protein','carbs','fat'] as const).map(key=><label key={key}>{key==='kcal'?'Calories (kcal)':`${key} (g) · optional if unknown`}<input type="number" min="0" step="any" inputMode="decimal" value={values[key]} onChange={e=>setValues({...values,[key]:e.target.value})}/></label>)}<p>Blank means unknown, not zero. Missing component macros need whole-meal review before logging.</p></details>
      {result.note&&<details><summary>Source notes</summary><p>{result.note}</p>{result.sourceUrl&&<a href={result.sourceUrl} target="_blank" rel="noopener noreferrer">View reference</a>}</details>}
      <div className="camera-correction-buttons"><button type="button" onClick={()=>setResult(null)}>Choose another</button><button type="button" disabled={!valid} onClick={apply}>Update component</button></div>
    </div>}
  </div>
}
