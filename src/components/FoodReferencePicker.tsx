import { useEffect,useRef,useState } from 'react'
import { RESTAURANT_BRANDS,type RestaurantBrand,type RestaurantFood } from '../lib/restaurantFoods'
import { offlineReferences,onlineReference,referenceWarning,type FoodReference } from '../lib/foodReferences'
import { searchFoodReferences } from '../lib/foodLookup'
import { Icon } from './Icon'
import './food-reference-picker.css'

export function FoodReferencePicker({initialQuery='',onPick,onManual}:{initialQuery?:string;onPick:(item:FoodReference)=>void;onManual?:(name:string)=>void}) {
  const [query,setQuery]=useState(initialQuery.slice(0,120))
  const [kind,setKind]=useState<'all'|'meal'|'drink'>('all')
  const [brand,setBrand]=useState<RestaurantBrand|null>(null)
  const [searchBank,setSearchBank]=useState<((q:string)=>RestaurantFood[])|null>(null)
  const [remote,setRemote]=useState<FoodReference[]>([])
  const [busy,setBusy]=useState(false),[error,setError]=useState('')
  const [shown,setShown]=useState(20)
  const controller=useRef<AbortController|null>(null)
  useEffect(()=>{let active=true;void import('../lib/kkmFoods').then(module=>{if(active)setSearchBank(()=>module.searchKKMFoods)});return()=>{active=false;controller.current?.abort()}},[])
  const local=offlineReferences(query,brand,searchBank&&!brand?searchBank(query):[])
  const filter=(items:FoodReference[])=>items.filter(item=>kind==='all'||item.kind===kind)
  const offline=filter(local),online=filter(remote)
  function changeQuery(value:string){controller.current?.abort();setBusy(false);setQuery(value);setRemote([]);setError('');setShown(20)}
  async function searchOnline(){controller.current?.abort();const request=new AbortController();controller.current=request;setBusy(true);setError('');setRemote([]);try{const result=await searchFoodReferences(query,request.signal);if(!request.signal.aborted)setRemote(result.map(onlineReference))}catch(err){if(!request.signal.aborted)setError(err instanceof Error?err.message:'Search failed. Your meal is unchanged.')}finally{if(!request.signal.aborted)setBusy(false)}}
  function rows(items:FoodReference[]){return items.slice(0,shown).map(item=><article className="food-reference-row" key={item.id}><button type="button" onClick={()=>onPick(item)}><span className="food-reference-identity">{item.imageUrl&&<img src={item.imageUrl} alt={`${item.name} product reference`} loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.hidden=true}}/>}<span><strong>{item.name}</strong><small>{item.serving}</small><small>{item.protein==null||item.carbs==null||item.fat==null?'Calories-only reference':`${item.protein} g protein · ${item.carbs} g carbs · ${item.fat} g fat`}</small></span></span><span className="food-reference-energy">{item.kcal===null?'Unknown kcal':`${Math.round(item.kcal)} kcal`}<Icon name="chevron_right" size={18}/></span></button>{referenceWarning(item)&&<p className="food-reference-warning">{referenceWarning(item)}</p>}<details><summary>{item.sourceLabel} · source & notes</summary>{item.note&&<p>{item.note}</p>}{item.sourceUrl&&<a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">View original reference<Icon name="open_in_new" size={16}/></a>}</details></article>)}
  return <div className="food-reference-picker">
    <form onSubmit={e=>{e.preventDefault();void searchOnline()}}><label><Icon name="search" size={20}/><input autoFocus aria-label="Search meals, drinks or barcode" placeholder="Meal, drink, restaurant or barcode" value={query} maxLength={120} onChange={e=>changeQuery(e.target.value)}/></label><button type="submit" disabled={busy||query.trim().length<3}>{busy?'Searching…':'Search online'}</button></form>
    <div className="food-reference-tabs" role="group" aria-label="Food or drink">{([{id:'all',label:'All'},{id:'meal',label:'Food'},{id:'drink',label:'Drinks'}] as const).map(tab=><button key={tab.id} type="button" aria-pressed={kind===tab.id} onClick={()=>{setKind(tab.id);setShown(20)}}>{tab.label}</button>)}</div>
    <details className="food-reference-browse"><summary>Browse restaurant menus</summary><div className="food-reference-tabs"><button type="button" aria-pressed={!brand} onClick={()=>{setBrand(null);setShown(20)}}>All references</button>{RESTAURANT_BRANDS.map(name=><button key={name} type="button" aria-pressed={brand===name} onClick={()=>{setBrand(name);setShown(20)}}>{name}</button>)}</div></details>
    <div className="food-reference-results">
      {!query.trim()&&!brand&&<p className="food-reference-empty">Start with a food name. Choose the correct preparation and portion—not just a similar name.</p>}
      {offline.length>0&&<section><h3>Saved references <span>{offline.length}</span></h3>{rows(offline)}</section>}
      {query.trim()&&offline.length===0&&<p className="food-reference-empty">No saved {kind==='drink'?'drink':kind==='meal'?'food':'food or drink'} matches. Try another name, change the filter or search online.</p>}
      {busy&&<p role="status" className="food-reference-empty">Finding nutrition references. Nothing has changed in your meal.</p>}
      {online.length>0&&<section><h3>Online references <span>{online.length}</span></h3>{rows(online)}</section>}
      {error&&<p role="alert" className="food-reference-error">{error}</p>}
      {Math.max(offline.length,online.length)>shown&&<button className="food-reference-more" type="button" onClick={()=>setShown(n=>n+20)}>Show more matches</button>}
      {onManual&&<button className="food-reference-more" type="button" onClick={()=>onManual(query)}>Can't find it? Enter manually</button>}
    </div>
    <p className="food-reference-footnote">References and product photos aren’t a measurement of your plate. Online search may use AI; check the source and serving.</p>
  </div>
}
