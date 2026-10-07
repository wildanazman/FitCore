import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { showUpStreak, STREAK_MILESTONES } from '../lib/streak'
import { Icon } from '../components/Icon'
import { TopBar } from '../components/TopBar'
import '../components/show-up-trail.css'

export function Achievements() {
  const { state } = useApp()
  const streak = showUpStreak(state)
  const nav = useNavigate()
  const latest = streak.earned[streak.earned.length - 1]
  const next = STREAK_MILESTONES.find(item => item.days > streak.best) ?? streak.next
  const remaining = Math.max(0, next.days - streak.current)
  return <div className="home-page achievements-page">
    <TopBar inset />
    <header className="achievements-heading"><h1>Your achievements.</h1><p>Every day you show up deserves a little recognition.</p></header>
    <button type="button" className="achievements-back" onClick={() => nav('/')}><Icon name="arrow_back" size={20} />Back to today</button>
    <section className={`achievement-feature ${latest ? 'is-earned' : ''}`} aria-labelledby="achievement-feature-title"><div className="achievement-feature-badge"><Icon name={latest ? 'workspace_premium' : 'bolt'} size={36} /><strong>{latest?.days ?? 3}</strong><span>DAY STREAK</span></div><div><h2 id="achievement-feature-title">{latest ? 'Look what you’ve built.' : 'Your first win starts here.'}</h2><p>{latest ? `${latest.name}. You earned this by showing up, one day at a time.` : 'Three check-in days unlock your first badge. One meal, movement or weigh-in is enough each day.'}</p><button type="button" onClick={() => nav('/')}><span>{streak.todayDone ? 'Today is in the books' : 'Make today count'}</span><Icon name={streak.todayDone ? 'check' : 'arrow_forward'} size={20} /></button></div></section>
    <div className="show-up-records"><span><strong>{streak.best}</strong> day personal best</span><span><strong>{streak.total}</strong> days checked in</span></div>
    <section className="achievement-next" aria-labelledby="achievement-next-title"><div><h2 id="achievement-next-title">Next up: {next.days} days.</h2><span>{remaining} check-in{remaining === 1 ? '' : 's'} to go</span></div><p>{next.name}. {streak.current ? 'Keep your rhythm going.' : 'Your next chapter can start today.'}</p><progress value={Math.min(streak.current, next.days)} max={next.days} aria-label={`Current streak toward ${next.days}-day milestone`} /><small>{streak.current} of {next.days} days in your current streak</small></section>
    <h2 className="achievements-title">Your badge collection<span>{streak.earned.length} / {STREAK_MILESTONES.length} earned</span></h2>
    <ol className="achievement-collection">{STREAK_MILESTONES.map(item => { const earned = streak.best >= item.days; return <li key={item.days} className={earned ? 'is-earned' : ''}><div className="achievement-collect-badge"><Icon name={earned ? 'workspace_premium' : 'flag'} size={24} /><strong>{item.days}</strong><span>days</span></div><h3>{item.name}</h3><span className="achievement-collect-status"><Icon name={earned ? 'verified' : 'lock'} size={15} />{earned ? 'Earned. Yours to keep showing up for.' : `${item.days - streak.current} check-ins to unlock`}</span></li> })}</ol>
    <section className="achievements-rules"><h2>Your rhythm, your rules.</h2><p className="show-up-rescue"><Icon name="shield" size={20} /><span><strong>{streak.rescueAvailable ? 'Weekly rescue ready' : 'Weekly rescue used'}</strong>Log the day after a single missed day to bridge the gap. One rescue per Monday–Sunday week, based on the missed date. Two missed days start a new streak. Rescues preserve the chain but don’t add check-in days.</span></p><p className="show-up-rules">A saved meal, completed activity or weigh-in counts once per date. Planned workouts and new onboarding baselines don’t count. Past-date logs count on their actual dates. Editing or removing logs recalculates your streak and earned achievements.</p><button type="button" className="achievements-back" onClick={() => nav('/')}>Make your next check-in<Icon name="arrow_forward" size={19} /></button></section>
  </div>
}
