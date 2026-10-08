import assert from 'node:assert/strict'
import handler, { rankGoogle, rankOSM, matchesAreas } from '../api/nearby-restaurants.js'
const center = { latitude: 2.9264, longitude: 101.6964 }
const place = (id, name = `Restaurant ${id}`) => ({ id, displayName: {text:name}, location:center, businessStatus:'OPERATIONAL', types:['restaurant'], primaryType:'restaurant', formattedAddress:'Putrajaya, Malaysia', rating:4.5, userRatingCount:100 })
assert.equal(rankGoogle([place('bad','Uptown Sports'), {...place('retail'), primaryType:'sporting_goods_store'}, {...place('closed'),businessStatus:'CLOSED_PERMANENTLY'},place('good')],center,5).length,1)
assert.equal(rankOSM([{type:'node',id:1,lat:center.latitude,lon:center.longitude,tags:{name:'Uptown Sports',amenity:'restaurant'}}],center,5).length,0)
assert.equal(matchesAreas({address:'Kajang, Selangor'},['Putrajaya']),false)
assert.equal(matchesAreas({address:'Bandar Baru Bangi, Selangor'},['Bangi','Kajang']),true)
process.env.GOOGLE_PLACES_API_KEY = 'test-only-not-a-key'
let calls = 0
const originalFetch = globalThis.fetch
globalThis.fetch = async (url, options) => {
  assert.ok(url.endsWith(':searchText'))
  const body = JSON.parse(options.body)
  assert.equal(body.strictTypeFiltering,true)
  assert.equal(body.pageSize,20)
  if (calls) assert.equal(body.pageToken,`page${calls}`)
  const offset = calls++ * 20
  return {ok:true,json:async()=>({places:Array.from({length:20},(_,i)=>place(String(offset+i))), ...(calls < 3 ? {nextPageToken:`page${calls}`} : {})})}
}
let result
await handler({method:'POST',body:{...center,radiusKm:5}}, {setHeader(){},end(body){result=JSON.parse(body)},statusCode:0})
globalThis.fetch = originalFetch
assert.equal(calls,3)
assert.equal(result.places.length,50)
assert.equal(new Set(result.places.map(p=>p.id)).size,50)
console.log('Passed: non-food filtering, selected-area matching, pagination and 50 unique results. No paid API calls made.')
