import type { Detection,DetectionItem } from './foodAI'
export function componentTotals(det:Detection,edited=false):Detection {
  if(!det.items?.length)return det
  const complete=det.items.every(item=>[item.protein,item.carbs,item.fat].every(value=>typeof value==='number'&&Number.isFinite(value)&&value>=0))
  const sum=(key:'kcal'|'protein'|'carbs'|'fat')=>det.items!.reduce((total,item)=>total+(item[key]??0),0)
  return {...det,kcal:sum('kcal'),...(complete?{protein:sum('protein'),carbs:sum('carbs'),fat:sum('fat'),macrosNeedReview:false}:edited?{macrosNeedReview:true}:{})}
}
export function scaleMealComponent(item:DetectionItem,factor:number):DetectionItem {
  if(!Number.isFinite(factor)||factor<=0)throw new Error('Enter a positive portion.')
  return {...item,portion:`${factor} × ${item.portion??'current portion'}`,grams:item.grams==null?undefined:item.grams*factor,kcal:item.kcal*factor,
    protein:item.protein==null?undefined:item.protein*factor,carbs:item.carbs==null?undefined:item.carbs*factor,fat:item.fat==null?undefined:item.fat*factor}
}
