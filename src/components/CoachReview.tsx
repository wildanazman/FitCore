import type { PlanSession, UserProfile } from '../types'
import { liftNextStep, strengthWeek } from '../lib/strengthInsights'
import { coachDay, COACH_DAYS } from '../lib/strengthCoach'
import { shortDate } from '../lib/date'
import { Icon } from './Icon'

export function CoachWeek({profile,date,sessions,onChoose,onEdit}:{profile:UserProfile;date:string;sessions:PlanSession[];onChoose:(day:string)=>void;onEdit:()=>void}) {
  const week=strengthWeek(profile,date,sessions)
  return <section className="coach-review" aria-label="Weekly training review"><header><h3>Your week, mapped out.</h3><p>{week.completed} / {week.planned} strength sessions completed. Rest days are part of your plan.</p></header>
    <ol className="coach-week-lineup">{week.days.map((day,i)=>{const plan=day.plan;const done=plan&&!plan.rest&&(plan.quickComplete||plan.exercises.every(e=>e.logged));return <li key={day.date}><div><span>{COACH_DAYS[i]}</span><small>{shortDate(day.date)}</small></div><button type="button" onClick={()=>onChoose(day.date)}><strong>{plan?.title??'No routine yet'}</strong><span>{plan?.quickComplete?'Completion checked · no set details':plan?.rest?plan.cardio?`${plan.cardio.minutes} min treadmill`:'No strength session':`${plan?.exercises.length??0} exercises · ${plan?.estimatedMinutes??0} min estimated`}</span></button><span className="coach-week-state">{done?<Icon name="check_circle" size={22}/>:plan?.rest?'Rest':'Planned'}</span></li>})}</ol>
    <h4>Muscle coverage</h4><p>Planned sets versus your saved sets this week. An exercise can involve more than one group; these are not equivalent direct hypertrophy sets.</p>
    <div className="coach-coverage">{week.coverage.map(row=><div key={row.group}><strong>{row.group}</strong><span>{row.days} planned day{row.days!==1?'s':''}</span><span><b>{row.logged}</b> logged / {row.planned} planned sets</span></div>)}</div>
    {week.coverage.some(r=>['chest','back','legs'].includes(r.group)&&r.days<2)&&<div className="coach-coverage-note"><Icon name="info" size={20}/><div><strong>Want to spread your muscle work?</strong><p>Your chosen split gives some major groups fewer than two exposures. Full body / upper-lower can spread the work without adding gym days.</p><button type="button" onClick={onEdit}>Review my split<Icon name="arrow_forward" size={18}/></button></div></div>}
  </section>
}

export function CoachProgress({profile,date,sessions}:{profile:UserProfile;date:string;sessions:PlanSession[]}) {
  const plan=coachDay(profile,date,sessions)
  const exercises=plan?.exercises.length?plan.exercises:strengthWeek(profile,date,sessions).days.flatMap(d=>d.plan?.exercises??[])
  const unique=exercises.filter((e,i)=>exercises.findIndex(x=>x.item.id===e.item.id)===i)
  return <section className="coach-review" aria-label="Progression guidance"><header><h3>Your next step, not a guess.</h3><p>Advice uses completed logs before {shortDate(date)}. We never increase kg just because another week passed.</p></header>
    <ol className="coach-progress-list">{unique.map(e=>{const next=liftNextStep(e.item.id,date,sessions,e.sets,profile.strengthCoach!.focus,profile.strengthFeedback);const last=next.history[0];return <li key={e.item.id}><h4>{e.item.label}</h4>{last?<p className="coach-observed">Last log · {shortDate(last.date)} · {last.strengthLog!.sets.map(s=>last.strengthLog!.mode==='hold'?`${s.holdSeconds??0}s`:`${s.reps} × ${s.weightKg} kg`).join(' / ')}{last.strengthLog!.implementCount===2?' · kg per implement':''}</p>:<p className="coach-observed">No earlier completed log for this exercise.</p>}<strong>{next.title}</strong><p>{next.detail}</p></li>})}</ol>
    <details className="coach-method"><summary>The rules behind these suggestions</summary><ul><li>Progress within the rep range first; keep technique controlled.</li><li>A possible load increase requires two separate logged dates at the same load/count, with every prescribed set exceeding the upper range.</li><li>Logs don’t measure technique, pain or reps in reserve. The suggestion is conditional, not a command.</li><li>Missing sessions or soreness are not reasons to double the next workout.</li></ul><a href="https://pubmed.ncbi.nlm.nih.gov/19204579/" target="_blank" rel="noreferrer">ACSM progression guidance</a></details>
  </section>
}
