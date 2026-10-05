import { useNavigate } from 'react-router-dom'
import { DailyTimeline } from '../components/DailyTimeline'
import { Icon } from '../components/Icon'
import './activity.css'

export function Activity() {
  const nav = useNavigate()
  return <div className="activity-page"><header><div><p>YOUR MOVEMENT</p><h1>Activity</h1><span>No training plan required. Log what you actually do.</span></div></header><DailyTimeline /><button type="button" className="activity-running-link" onClick={() => nav('/running')}><span><strong>Running plan</strong><small>Optional race training and run-specific sessions</small></span><Icon name="arrow_forward" size={21} /></button></div>
}
