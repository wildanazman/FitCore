// Development-only server adapter. Credentials never enter client bundles.
export function localFoodApis(env) {
  for (const key of ['GOOGLE_PLACES_API_KEY', 'USDA_FDC_API_KEY', 'THEMEALDB_API_KEY']) if (env[key] && !process.env[key]) process.env[key] = env[key]
  return { name: 'fitcore-local-food-apis', configureServer(server) {
    for (const name of ['food-catalog', 'nearby-restaurants']) server.middlewares.use(`/api/${name}`, async (req,res) => {
      try {
        let body=''
        for await (const chunk of req) { body+=chunk.toString();if(body.length>4096){res.statusCode=413;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'Request too large.'}));return} }
        const {default:handler}=await import(`${server.config.root}/api/${name}.js`)
        await handler(Object.assign(req,{body}),res)
      }catch{res.statusCode=500;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'Local food API failed. Please retry.'}))}
    })
  } }
}
