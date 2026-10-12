import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const css=await readFile('src/store/themes.css','utf8')
const block=css.match(/:root, :root\[data-theme="classic"\] \{([\s\S]*?)\}/)[1]
const tokens=Object.fromEntries([...block.matchAll(/(--[\w-]+):([^;]+);/g)].map(m=>[m[1],m[2].trim()]))
function resolve(role){const value=tokens[role];assert.ok(value,role);return value.startsWith('var(')?resolve(value.slice(4,-1)):value}
function light(hex){const h=hex.slice(1);const full=h.length===3?h.split('').map(c=>c+c).join(''):h;return full.match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0)}
for(const [text,ground]of [['--palette-ink','--palette-bg'],['--palette-muted','--palette-surface'],['--palette-on-accent','--palette-accent'],['--palette-on-strong','--palette-strong'],['--palette-warm','--palette-warm-bg'],['--palette-on-capture','--palette-capture']]){
  const a=light(resolve(text)),b=light(resolve(ground)),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05)
  assert.ok(ratio>=4.5,`${text} on ${ground}: ${ratio}`)
}
for(const [text,ground] of [['--palette-on-gold','--palette-gold'],['--palette-gold-ink','--palette-gold-bg'],['--palette-gold-on-blue','--palette-accent']]) {
  const a=light(resolve(text)),b=light(resolve(ground))
  assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,`${text} on ${ground}`)
}
console.log('PASS Blue+ text, blue actions/capture and gold recognition contrast.')
