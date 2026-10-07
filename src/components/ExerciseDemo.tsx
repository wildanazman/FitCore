import { useRef, useState } from 'react'
import { EXERCISE_DEMOS } from '../lib/exerciseDemos'
import { EXERCISE_VIDEOS } from '../lib/exerciseVideos'
import { Icon } from './Icon'

function PhotoDemo({ exerciseId }: { exerciseId: string }) {
  const demo = EXERCISE_DEMOS[exerciseId]
  const [position, setPosition] = useState(0)
  const [aspectRatio, setAspectRatio] = useState(4 / 3)
  const [failed, setFailed] = useState(false)
  if (!demo) return null
  if (failed) return <p className="home-form-note" role="status">The photos couldn’t load. You can still read the movement steps below.</p>
  return <>
    <div className="exercise-demo-images" style={{ aspectRatio }}>
      {demo.images.map((url, index) => <img key={url} src={url} alt={`${demo.name}: position ${index + 1}`} className={position === index ? 'is-visible' : ''} referrerPolicy="no-referrer" onLoad={event => { const image = event.currentTarget; if (image.naturalHeight) setAspectRatio(previous => Math.min(previous, image.naturalWidth / image.naturalHeight)) }} onError={() => setFailed(true)} />)}
    </div>
    <div className="exercise-demo-controls" role="group" aria-label="Choose a movement position">
      {demo.images.map((_, index) => <button type="button" key={index} aria-pressed={position === index} onClick={() => setPosition(index)}>Position {index + 1}</button>)}
    </div>
    <p className="exercise-demo-source">Two still positions, not a full-motion video. Photos: <a href={demo.sourceUrl} target="_blank" rel="noopener noreferrer">Free Exercise DB</a> · <a href="https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md" target="_blank" rel="noopener noreferrer">Public domain / Unlicense</a>. Stop if a movement hurts.</p>
  </>
}

export function ExerciseDemo({ exerciseId }: { exerciseId: string }) {
  const steps = EXERCISE_DEMOS[exerciseId]
  const demo = EXERCISE_VIDEOS[exerciseId]
  const video = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [slow, setSlow] = useState(false)
  const [aspectRatio, setAspectRatio] = useState(4 / 3)
  async function togglePlayback() {
    const player = video.current
    if (!player) return
    if (!player.paused) { player.pause(); return }
    setLoading(true)
    try { await player.play() } catch { setFailed(true) } finally { setLoading(false) }
  }
  if (!demo && !steps) return <p className="home-form-note">A matching full-motion demo isn’t available yet. You can still log this exercise.</p>
  return <section className="exercise-demo" aria-label={`How to do ${demo?.name ?? steps?.name}`}>
    <div className="exercise-demo-heading"><h3>How to do it</h3><span>{demo ? 'Full-motion demo' : 'Two-position photo guide'}</span></div>
    {demo ? <>
      {failed ? <p className="home-form-note" role="status">The video couldn’t play. <a href={demo.gif} target="_blank" rel="noopener noreferrer">Open the GIF instead</a>{steps ? ' or read the steps below.' : '.'}</p> : <>
        <div className="exercise-demo-images" style={{ aspectRatio }} aria-busy={loading}>
          <video ref={video} src={demo.video} poster={demo.poster} muted loop playsInline preload="metadata" aria-label={`${demo.name} demonstration`} onLoadedMetadata={event => { const player = event.currentTarget; if (player.videoHeight) setAspectRatio(player.videoWidth / player.videoHeight) }} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => { setFailed(true); setPlaying(false); setLoading(false) }} />
        </div>
        <div className="exercise-demo-controls">
          <button type="button" aria-pressed={playing} disabled={loading} onClick={togglePlayback}><Icon name={playing ? 'pause' : 'play_arrow'} size={19} />{loading ? 'Loading demo…' : playing ? 'Pause demo' : 'Play demo'}</button>
          <button type="button" aria-pressed={slow} onClick={() => { const next = !slow; setSlow(next); if (video.current) video.current.playbackRate = next ? 0.5 : 1 }}>{slow ? '0.5× speed' : 'Slow motion'}</button>
          <a href={demo.gif} download={`${exerciseId}.gif`}>Download GIF</a>
        </div>
      </>}
      <p className="exercise-demo-source"><a href={demo.sourceUrl} target="_blank" rel="noopener noreferrer">{demo.author}</a> · <a href={demo.licenseUrl} target="_blank" rel="noopener noreferrer">{demo.licenseUrl.includes('/by-sa/') ? 'CC BY-SA 4.0' : 'CC BY 3.0'}</a>. Resized, muted and converted to MP4 / GIF. Stop if a movement hurts.</p>
    </> : <PhotoDemo key={exerciseId} exerciseId={exerciseId} />}
    {steps && <details><summary>Read the movement steps</summary><ol>{steps.instructions.map((step, index) => <li key={index}>{step}</li>)}</ol><p className="exercise-demo-source">Steps: <a href={steps.sourceUrl} target="_blank" rel="noopener noreferrer">Free Exercise DB</a> · <a href="https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md" target="_blank" rel="noopener noreferrer">Public domain / Unlicense</a>.</p></details>}
  </section>
}
