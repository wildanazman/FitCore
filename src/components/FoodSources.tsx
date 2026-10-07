import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { apiUrl } from '../lib/apiBase'
import type { LocalFood } from '../lib/localFoods'
import { hasExcludedIngredients } from '../../shared/foodSuitability.js'
import './food-sources.css'

type Mode = 'products' | 'barcode' | 'ingredients' | 'recipes'
type DatabaseFood = { id:string; name:string; kcal:number; protein:number; carbs:number; fat:number; unit:string; basis:string; source:string; sourceUrl:string; ingredients:string; allergens:string; labelServing:string; note:string }
type Recipe = { id:string; name:string; ingredients:{name:string;amount:string}[];instructions:string;source:string;sourceUrl:string;note:string }
export function FoodSources({ onPick, onLocalSearch }: { onPick:(food:LocalFood)=>void; onLocalSearch:(query:string)=>void }) {
  const [mode,setMode]=useState<Mode>('products'),[query,setQuery]=useState(''),[foods,setFoods]=useState<DatabaseFood[]>([]),[recipes,setRecipes]=useState<Recipe[]>([])
  const [chosen,setChosen]=useState<DatabaseFood|null>(null),[amount,setAmount]=useState('100'),[checked,setChecked]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[info,setInfo]=useState('')
  const controller=useRef<AbortController|null>(null), reviewRef=useRef<HTMLHeadingElement>(null)
  useEffect(()=>()=>controller.current?.abort(),[])
  useEffect(()=>{if(chosen)reviewRef.current?.focus()},[chosen])
  const grams=Number(amount),valid=chosen&&Number.isFinite(grams)&&grams>0&&grams<=2000&&checked
  const totals=chosen?{kcal:Math.round(chosen.kcal*grams/100),protein:Math.round(chosen.protein*grams/100*10)/10,carbs:Math.round(chosen.carbs*grams/100*10)/10,fat:Math.round(chosen.fat*grams/100*10)/10}:null
  function change(next:Mode) { controller.current?.abort();setBusy(false);setMode(next);setQuery('');setChosen(null);setFoods([]);setRecipes([]);setError('');setInfo('');setChecked(false) }
  async function search() {
    if(busy)return
    setError('');setInfo('');setChosen(null);setFoods([]);setRecipes([]);setBusy(true)
    const c=new AbortController();controller.current=c;const timer=window.setTimeout(()=>c.abort(),15000)
    try {
      const res=await fetch(apiUrl('/api/food-catalog'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,query:query.trim()}),signal:c.signal})
      const data=await res.json().catch(()=>null)
      if(!res.ok)throw new Error(data?.error||'Database search is unavailable. Try local search instead.')
      if(!Array.isArray(data.items))throw new Error('Unexpected database response.')
      if(c.signal.aborted)return
      if(mode==='recipes')setRecipes(data.items);else setFoods(data.items)
      setInfo(`${data.license}. ${data.notice||''} ${data.omitted?`${data.omitted} result(s) excluded for incomplete nutrition or ingredient suitability.`:''} ${!data.items.length?'No usable matches. Try another term or use local search.':''}`)
    }catch(e){if(controller.current===c&&!c.signal.aborted)setError(e instanceof Error?e.message:'Database search failed.');else if(controller.current===c)setError('Search timed out. Please retry.')}
    finally{window.clearTimeout(timer);if(controller.current===c)setBusy(false)}
  }
  function log() {
    if(!valid||!chosen||!totals||hasExcludedIngredients(chosen.name))return
    onPick({name:`${chosen.name} (${grams} ${chosen.unit})`,emoji:'',category:'Basics',serving:`${grams} ${chosen.unit}`, ...totals,nutritionSource:chosen.source,nutritionSourceUrl:chosen.sourceUrl})
  }
  return <div className="food-sources">
    <div className="food-source-tabs" role="group" aria-label="Food database">{([['products','Packaged'],['barcode','Barcode'],['ingredients','Ingredients'],['recipes','Recipes']] as [Mode,string][]).map(([value,label])=><button type="button" key={value} disabled={busy} aria-pressed={mode===value} onClick={()=>change(value)}>{label}</button>)}</div>
    <p>{mode==='products'?'Find packaged foods in Open Food Facts.':mode==='barcode'?'Type the barcode printed on your packet.':mode==='ingredients'?'USDA nutrition references. Match the preparation, then choose your amount.':'Recipe inspiration from TheMealDB. Nutrition is not supplied.'}</p>
    <form onSubmit={e=>{e.preventDefault();void search()}}><label htmlFor="food-database-query">{mode==='barcode'?'Product barcode':'Food or ingredient name'}</label><div className="food-source-query"><input id="food-database-query" inputMode={mode==='barcode'?'numeric':'text'} maxLength={120} value={query} disabled={busy} placeholder={mode==='barcode'?'8–14 digits':'Try yogurt, oats or chicken'} onChange={e=>{setQuery(e.target.value);setChosen(null);setFoods([]);setRecipes([]);setInfo('');setError('')}}/><button type="submit" disabled={busy||query.trim().length<(mode==='barcode'?8:2)}>{busy?'Searching…':'Search'}</button></div></form>
    <p className="food-source-note">Search runs only when you tap Search. Obvious pork/alcohol ingredients are excluded. Other foods are not halal-certified here—check their label and source.</p>
    <div role="status" aria-live="polite">{error&&<p className="food-source-error">{error}</p>}{info&&<p className="food-source-note">{info}</p>}</div>
    {chosen&&totals?<section className="food-source-review"><h3 tabIndex={-1} ref={reviewRef}>{chosen.name}</h3><a href={chosen.sourceUrl} target="_blank" rel="noopener noreferrer">{chosen.source}<Icon name="open_in_new" size={16}/></a><p>{chosen.basis} reference · {chosen.labelServing?`Label serving: ${chosen.labelServing}`:'No serving size supplied'}</p><label>Amount ({chosen.unit})<input type="number" min="0.1" max="2000" step="any" value={amount} onChange={e=>{setAmount(e.target.value);setChecked(false)}}/></label>{Number.isFinite(grams)&&grams>0&&grams<=2000&&<div className="food-source-totals"><strong>{totals.kcal} kcal</strong><span>{totals.protein} g protein</span><span>{totals.carbs} g carbs</span><span>{totals.fat} g fat</span></div>}<p>{chosen.note}</p>{chosen.ingredients&&<details><summary>Ingredients from source</summary><p>{chosen.ingredients}</p></details>}<p>Allergens: {chosen.allergens||'not supplied; check the packet. This does not mean allergen-free.'}</p><label className="food-source-confirm"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/>I checked the portion, label and halal suitability.</label><button className="food-source-save" disabled={!valid} onClick={log}>Log chosen portion<Icon name="check" size={18}/></button><button className="food-source-back" onClick={()=>setChosen(null)}>Choose a different result</button></section>:<ul className="food-source-results">{foods.map(food=><li key={food.id}><button onClick={()=>{setChosen(food);setAmount('100');setChecked(false)}}><strong>{food.name}</strong><span>{food.kcal} kcal · {food.protein} g protein</span><small>{food.basis} · {food.source}</small></button></li>)}</ul>}
    {recipes.map(recipe=><details className="food-source-recipe" key={recipe.id}><summary>{recipe.name}</summary><p>{recipe.note}</p><ul>{recipe.ingredients.map((i,index)=><li key={index}>{i.amount} {i.name}</li>)}</ul><p className="food-source-instructions">{recipe.instructions}</p><a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">TheMealDB recipe<Icon name="open_in_new" size={16}/></a><button onClick={()=>onLocalSearch(recipe.name)}>Find nutrition separately<Icon name="search" size={17}/></button></details>)}
    <button className="food-source-back" onClick={()=>onLocalSearch(query)}>Back to local Malaysian search</button>
  </div>
}
