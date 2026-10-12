import { build } from 'esbuild'
import { mkdtemp, rm, readFile, access, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
const temp=await mkdtemp(join(tmpdir(),'fitcore-media-check-'))
try{
  const output=join(temp,'media.mjs')
  await build({stdin:{contents:"export * from './src/lib/activities';export * from './src/lib/exerciseVideos';export * from './src/lib/exerciseDemos';",resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',outfile:output})
  const {ACTIVITIES,EXERCISE_VIDEOS,EXERCISE_DEMOS,exerciseDemoId}=await import(pathToFileURL(output).href)
  const generic=new Set(['home_general','home_pushups','home_squats','home_hiit','home_pilates','home_core','home_glute','home_dumbbell_full','home_goblet_squat','home_dumbbell_row','home_mat_dumbbell','gym_vigorous'])
  const exercises=ACTIVITIES.filter(e=>(e.id.startsWith('home_')||e.id.startsWith('gym_'))&&!generic.has(e.id))
  const missing=[];let video=0,photos=0
  for(const item of exercises){
    const key=exerciseDemoId(item),demo=EXERCISE_VIDEOS[key]
    if(demo){video++;assert.ok(demo.sourceUrl&&demo.author&&demo.licenseUrl);await access(`public${demo.video}`);await access(`public${demo.poster}`)}
    else{const stills=Boolean(EXERCISE_DEMOS[key]);if(stills)photos++;missing.push({id:item.id,name:item.label,stillPhotos:stills})}
  }
  const attributions=[...JSON.parse(await readFile('public/exercise-demos/imported-attribution.json','utf8')),...JSON.parse(await readFile('public/exercise-demos/ymove-attribution.json','utf8'))]
  for(const item of attributions){const path=`public/exercise-demos/${item.exerciseId}.mp4`;const hash=createHash('sha256').update(await readFile(path)).digest('hex');assert.equal(hash,item.mp4Sha256)}
  const report={scope:'Named home/gym exercises, excluding mixed workout/circuit entries',total:exercises.length,withMovingDemo:video,withPhotosOnly:photos,missingMovingDemo:missing.length,missing}
  if(process.argv.includes('--write'))await writeFile('docs/exercise-video-coverage.json',JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify({total:report.total,withMovingDemo:video,withPhotosOnly:photos,missingMovingDemo:missing.length,attributionHashesVerified:attributions.length}))
}finally{await rm(temp,{recursive:true,force:true})}
