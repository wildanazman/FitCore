import { useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../store/AppContext'
import { TopBar } from '../components/TopBar'
import { Icon } from '../components/Icon'
import { Press, Reveal, listContainer, spring } from '../components/motion'
import { Rings } from '../components/Decor'
import { todayISO, uid, weekday } from '../lib/date'
import {
  formatPace,
  kcalActivity,
  planCapability,
  planMeta,
  sessionsForWeek,
  suggestPlanStart,
  HALF_MARATHON_GOALS,
  halfMarathonGoalLabel,
  halfMarathonGoalPace,
} from '../lib/plan'
import { ACTIVITIES, ACTIVITY_CATEGORIES, activityById, metForRun } from '../lib/activities'
import type { PlanSession, SessionType, UserProfile, HalfMarathonGoal, RaceType } from '../types'

type Filter = 'all' | 'running' | 'strength' | 'sport' | 'manual'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'running', label: 'Running' },
  { id: 'strength', label: 'Strength' },
  { id: 'sport', label: 'Sport' },
  { id: 'manual', label: 'Logged' },
]

const PASTELS: Record<SessionType, { bg: string; fg: string }> = {
  run: { bg: 'bg-gradient-to-br from-lilac to-lilac-deep glow-soft', fg: 'text-on-lilac' },
  strength: { bg: 'bg-gradient-to-br from-pink to-pink-deep glow-soft', fg: 'text-on-pink' },
  sport: { bg: 'bg-gradient-to-br from-lime to-lime-dim glow-soft', fg: 'text-on-lime' },
  rest: { bg: 'bg-ink-card border border-white/5', fg: 'text-on-surface' },
}

export function Train() {
  const { state, profile, weightKg, updateProfile, addSession, removeSession, toggleSession } = useApp()
  const today = todayISO()
  const [filter, setFilter] = useState<Filter>('all')
  const [showLog, setShowLog] = useState(false)
  const [showStartDialog, setShowStartDialog] = useState(false)
  const [pendingPatch, setPendingPatch] = useState<Partial<UserProfile> | null>(null)

  const meta = planMeta(profile, state.sessions, today)
  const cap = planCapability(profile)
  const week = sessionsForWeek(state.sessions, today)
  const filtered = filter === 'all' ? week : week.filter((s) => s.plan === filter)

  const planned = week.length
  const done = week.filter((s) => s.completed).length
  const compliance = planned ? Math.round((done / planned) * 100) : 0
  const volume = week.filter((s) => s.type === 'run').reduce((a, s) => a + (s.distanceKm ?? 0), 0)
  const burned = week.filter((s) => s.completed).reduce((a, s) => a + s.kcal, 0)

  const exerciseSessions = week.filter((s) => s.plan === 'running')
  const sportSessions = week.filter((s) => s.plan === 'sport')
  const strengthSessions = week.filter((s) => s.plan === 'strength')

  const handleUpdatePlan = (patch: Partial<UserProfile>) => {
    if (!profile.planStartDate) {
      setPendingPatch(patch)
      setShowStartDialog(true)
    } else {
      updateProfile(patch, true)
    }
  }

  const handleStartNow = () => {
    if (pendingPatch) {
      updateProfile({ ...pendingPatch, planStartDate: suggestPlanStart() }, true)
    }
    setShowStartDialog(false)
    setPendingPatch(null)
  }

  const handleStartLater = (date: string) => {
    if (pendingPatch) {
      updateProfile({ ...pendingPatch, planStartDate: date }, true)
    }
    setShowStartDialog(false)
    setPendingPatch(null)
  }

  return (
    <motion.div variants={listContainer} className="px-margin-mobile pt-sm space-y-lg">
      <TopBar />

      {/* Running Plan Settings + Capability */}
      <RunningPlanCard
        profile={profile}
        cap={cap}
        onUpdate={handleUpdatePlan}
        meta={meta}
      />

      {/* Starting this week dialog */}
      {showStartDialog && (
        <StartWeekDialog
          onStartNow={handleStartNow}
          onStartLater={handleStartLater}
          onCancel={() => { setShowStartDialog(false); setPendingPatch(null) }}
        />
      )}

      {/* Plan progress (only if race set) */}
      {meta ? (
        <Reveal>
          <div className="rounded-[28px] bg-gradient-to-br from-lime to-lime-dim text-on-lime p-lg relative overflow-hidden glow-lime">
            <Rings size={200} className="absolute -right-12 -top-12 text-on-lime opacity-[0.12]" />
            <div className="relative flex justify-between items-start">
              <div>
                <p className="font-label-caps text-label-caps uppercase opacity-60 tracking-widest">Plan progress</p>
                <h2 className="font-display-hero text-headline-lg mt-1">Week {meta.week} / {meta.totalWeeks}</h2>
              </div>
              <span className="bg-on-lime text-lime rounded-full px-md py-1.5 font-data-mono text-[12px]">{meta.daysLeft}d left</span>
            </div>
            <div className="relative w-full h-2.5 bg-on-lime/15 rounded-full mt-md">
              <motion.div
                className="relative h-full bg-on-lime rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(3, meta.pct)}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="absolute -right-1 -top-[3px] w-4 h-4 rounded-full bg-on-lime border-2 border-lime" />
              </motion.div>
            </div>
            <p className="relative font-body-md text-[13px] opacity-80 mt-md">{taperMessage(meta.taperIn)}</p>
          </div>
        </Reveal>
      ) : (
        <Reveal>
          <div className="rounded-[24px] bg-ink-card border border-white/5 p-md flex items-center gap-md">
            <Icon name="event" className="text-lime" />
            <p className="font-body-md text-body-md text-on-surface-variant">Set your race above to generate a 14-week plan.</p>
          </div>
        </Reveal>
      )}

      {/* Stats */}
      {meta && (
        <Reveal>
          <div className="grid grid-cols-3 gap-sm">
            <StatTile icon="task_alt" label="Compliance" value={`${compliance}%`} sub={`${done}/${planned} sessions`} tone="border border-lime/25 bg-lime/10 text-lime glow-soft" />
            <StatTile icon="conversion_path" label="Volume" value={`${volume.toFixed(0)} km`} sub="running this week" tone="border border-white/10 bg-ink-card text-on-surface glow-soft" />
            <StatTile icon="local_fire_department" label="Burned" value={`${burned}`} sub="kcal logged" tone="bg-gradient-to-br from-lime to-lime-dim text-on-lime glow-lime" />
          </div>
        </Reveal>
      )}

      {/* Filter pills + Sessions */}
      <Reveal>
        <div className="flex gap-sm overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className="relative shrink-0 px-md py-sm rounded-full">
              {filter === f.id && <motion.span layoutId="train-filter" transition={spring} className="absolute inset-0 rounded-full bg-lime" />}
              <span className={`relative z-10 font-body-md text-[13px] whitespace-nowrap ${filter === f.id ? 'text-on-lime' : 'text-on-surface-variant'}`}>{f.label}</span>
            </button>
          ))}
        </div>
      </Reveal>

      {/* Exercise section - running only */}
      <Reveal>
        <SectionHeader title="Exercise" subtitle="Running sessions & drills" icon="directions_run" />
        <div className="space-y-sm">
          {exerciseSessions.length === 0
            ? <EmptyState icon="directions_run" text="No running sessions this week." />
            : exerciseSessions.map((s, i) => (
                <SessionCard key={s.id} session={s} index={i} today={today} onToggle={() => toggleSession(s.id)} />
              ))}
        </div>
      </Reveal>

      {/* Sport section */}
      <Reveal>
        <SectionHeader title="Sport" subtitle="Badminton, pickleball & other sports" icon="sports_tennis" />
        <div className="space-y-sm">
          {sportSessions.length === 0
            ? <EmptyState icon="sports_tennis" text="No sport sessions this week." />
            : sportSessions.map((s, i) => (
                <SessionCard key={s.id} session={s} index={i} today={today} onToggle={() => toggleSession(s.id)} />
              ))}
        </div>
      </Reveal>

      {/* Strength section */}
      <Reveal>
        <SectionHeader title="Strength" subtitle="Upper & lower body work" icon="fitness_center" />
        <div className="space-y-sm">
          {strengthSessions.length === 0
            ? <EmptyState icon="fitness_center" text="No strength sessions this week." />
            : strengthSessions.map((s, i) => (
                <SessionCard key={s.id} session={s} index={i} today={today} onToggle={() => toggleSession(s.id)} />
              ))}
        </div>
      </Reveal>

      {/* Log activity */}
      <Reveal>
        <div className="rounded-[28px] bg-ink-card border border-white/5 p-md">
          <div className="flex items-center justify-between gap-md">
            <div>
              <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Log activity</h3>
              <p className="font-data-mono text-[12px] text-on-surface-variant">Choose an activity. Calories use MET values plus your weight, time and run pace.</p>
            </div>
            <button
              onClick={() => setShowLog((v) => !v)}
              aria-label={showLog ? 'Close activity form' : 'Add activity'}
              className="w-12 h-12 rounded-full bg-lime text-on-lime flex items-center justify-center shrink-0"
            >
              <Icon name={showLog ? 'close' : 'add'} />
            </button>
          </div>
          {showLog && (
            <ManualActivityForm
              weightKg={weightKg}
              onAdd={(session) => {
                addSession(session)
                setShowLog(false)
              }}
            />
          )}
        </div>
      </Reveal>
    </motion.div>
  )
}

function SectionHeader({ title, subtitle, icon }: { title: string; subtitle: string; icon: string }) {
  return (
    <div className="flex items-center gap-md pt-lg">
      <div className="w-10 h-10 rounded-full bg-ink-card border border-white/10 flex items-center justify-center">
        <Icon name={icon} className="text-lime" size={20} />
      </div>
      <div>
        <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{title}</h3>
        <p className="font-data-mono text-[11px] text-on-surface-variant">{subtitle}</p>
      </div>
    </div>
  )
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="rounded-[24px] bg-ink-card border border-white/5 p-md flex items-center gap-md">
      <Icon name={icon} className="text-on-surface-variant" />
      <p className="font-body-md text-body-md text-on-surface-variant">{text}</p>
    </div>
  )
}

function StartWeekDialog({
  onStartNow,
  onStartLater,
  onCancel,
}: {
  onStartNow: () => void
  onStartLater: (date: string) => void
  onCancel: () => void
}) {
  const [customDate, setCustomDate] = useState('')
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-margin-mobile" onClick={onCancel}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-ink-card border border-white/10 rounded-[28px] p-lg w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-lime/20 flex items-center justify-center mx-auto mb-md">
          <Icon name="calendar_month" className="text-lime" size={28} />
        </div>
        <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface text-center">Are you starting your training this week?</h3>
        <p className="font-body-md text-body-md text-on-surface-variant text-center mt-sm">Your plan timeline will be set to Week 1.</p>
        <div className="flex flex-col gap-sm mt-lg">
          <button
            onClick={onStartNow}
            className="w-full py-3 rounded-full bg-lime text-on-lime font-metric-md"
          >
            Yes, start this week
          </button>
          <button
            onClick={() => setShowPicker(true)}
            className="w-full py-3 rounded-full border border-white/10 text-on-surface font-metric-md"
          >
            Start on a different date
          </button>
          {showPicker && (
            <div className="flex items-center gap-sm mt-sm">
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="flex-1 bg-[#101112] border border-white/10 rounded-xl px-sm py-2 text-on-surface font-data-mono text-[13px] focus:border-lime focus:outline-none"
              />
              <button
                disabled={!customDate}
                onClick={() => onStartLater(customDate)}
                className="py-2 px-4 rounded-full bg-lime text-on-lime font-metric-md text-sm disabled:opacity-40"
              >
                Set
              </button>
            </div>
          )}
          <button onClick={onCancel} className="w-full py-2 text-on-surface-variant font-data-mono text-[13px]">Cancel</button>
        </div>
      </motion.div>
    </div>
  )
}

function RunningPlanCard({
  profile,
  cap,
  onUpdate,
  meta,
}: {
  profile: UserProfile
  cap: ReturnType<typeof planCapability>
  onUpdate: (patch: Partial<UserProfile>) => void
  meta: ReturnType<typeof planMeta> | null
}) {
  const [raceType, setRaceType] = useState(profile.raceType)
  const [raceDate, setRaceDate] = useState(profile.raceDate ?? '')
  const [trainingDays, setTrainingDays] = useState(profile.trainingDaysPerWeek)
  const [halfGoal, setHalfGoal] = useState(profile.halfMarathonGoal)
  const [bestKm, setBestKm] = useState(String(cap.bestKm))
  const [bestPace, setBestPace] = useState(formatPace(cap.bestPace).replace('/km', ''))
  const [editMode, setEditMode] = useState(false)

  const parsedPace = parsePace(bestPace)
  const dirty =
    raceType !== profile.raceType ||
    raceDate !== (profile.raceDate ?? '') ||
    trainingDays !== profile.trainingDaysPerWeek ||
    halfGoal !== profile.halfMarathonGoal ||
    Number(bestKm) !== cap.bestKm ||
    parsedPace !== cap.bestPace

  const handleSave = () => {
    const patch: Partial<UserProfile> = {
      raceType,
      raceDate: raceDate || null,
      trainingDaysPerWeek: trainingDays,
      halfMarathonGoal: halfGoal,
      bestRunDistanceKm: Math.max(1, Number(bestKm)),
      bestRunPaceSecPerKm: parsedPace,
    }
    onUpdate(patch)
  }

  return (
    <div className="rounded-[28px] bg-ink-card border border-white/5 overflow-hidden">
      <button
        onClick={() => setEditMode(!editMode)}
        className="w-full flex items-center justify-between p-md text-left"
      >
        <div className="flex items-center gap-md">
          <div className="w-10 h-10 rounded-full bg-lime/15 flex items-center justify-center">
            <Icon name="speed" className="text-lime" size={22} />
          </div>
          <div>
            <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Running plan</h3>
            <p className="font-data-mono text-[12px] text-on-surface-variant">
              {meta ? `${profile.trainingDaysPerWeek} days · Week ${meta.week}` : `${profile.trainingDaysPerWeek} days`}
              {profile.raceDate ? ` · ${profile.raceType === 'half-marathon' ? 'HM' : 'Full'} ${cap.raceKm} km` : ''}
              {cap.selectedGoalLabel ? ` · ${cap.selectedGoalLabel}` : ''}
            </p>
          </div>
        </div>
        <Icon name={editMode ? 'expand_less' : 'edit'} className="text-on-surface-variant" size={20} />
      </button>

      {editMode && (
        <div className="px-md pb-md space-y-md animate-fade-in border-t border-white/5 pt-md">
          {/* Race distance & date */}
          <div className="grid grid-cols-2 gap-sm">
            <Field label="Distance">
              <select
                value={raceType}
                onChange={(e) => setRaceType(e.target.value as RaceType)}
                className={fieldCls}
              >
                <option value="half-marathon">Half Marathon (21.1 km)</option>
                <option value="marathon">Full Marathon (42.2 km)</option>
              </select>
            </Field>
            <Field label="Race date">
              <input type="date" value={raceDate} onChange={(e) => setRaceDate(e.target.value)} className={fieldCls} />
            </Field>
          </div>

          {/* Training days */}
          <Field label="Training days / week">
            <div className="grid grid-cols-5 gap-1">
              {[3, 4, 5, 6, 7].map((d) => (
                <button
                  key={d}
                  onClick={() => setTrainingDays(d)}
                  className={`py-2 rounded-lg border font-metric-md text-[14px] transition ${
                    trainingDays === d ? 'bg-lime text-on-lime border-lime' : 'bg-[#101112] border-white/10 text-on-surface-variant'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </Field>

          {/* Half marathon goal */}
          {raceType === 'half-marathon' && (
            <Field label="Goal">
              <div className="grid grid-cols-2 gap-sm">
                {HALF_MARATHON_GOALS.map((goal) => {
                  const pace = halfMarathonGoalPace(goal)
                  return (
                    <button
                      key={goal}
                      onClick={() => setHalfGoal(goal)}
                      className={`p-sm rounded-xl border text-left transition ${
                        halfGoal === goal ? 'bg-lime/15 border-lime text-on-surface' : 'bg-[#101112] border-white/10 text-on-surface-variant'
                      }`}
                    >
                      <span className="block font-metric-md text-[13px]">{halfMarathonGoalLabel(goal)}</span>
                      <span className="block font-data-mono text-[11px]">{pace ? formatPace(pace) : 'Build finish confidence'}</span>
                    </button>
                  )
                })}
              </div>
            </Field>
          )}

          {/* Capability */}
          <p className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">Current capability</p>
          <div className="grid grid-cols-2 gap-sm">
            <Field label="Best run (km)">
              <input type="number" min={1} step="0.1" value={bestKm} onChange={(e) => setBestKm(e.target.value)} className={fieldCls} />
            </Field>
            <Field label="Pace (min/km)">
              <input value={bestPace} onChange={(e) => setBestPace(e.target.value)} placeholder="6:00" className={fieldCls} />
            </Field>
          </div>

          {/* Target pace preview */}
          <div className="rounded-2xl bg-[#101112] border border-lime/20 p-md">
            <div className="flex items-center justify-between">
              <span className="font-data-mono text-[12px] text-on-surface-variant">Target race pace</span>
              <span className="font-display-hero text-headline-lg-mobile text-lime">{formatPace(cap.targetPace)}</span>
            </div>
            <p className="font-data-mono text-[11px] text-on-surface-variant mt-1">
              {cap.selectedGoalLabel}{cap.selectedGoalMin ? ` (${cap.selectedGoalMin} min)` : ''} · {formatPace(cap.targetPace)} pace · est. {cap.projectedFinishMin} min finish
            </p>
          </div>

          <button
            disabled={!dirty || !Number(bestKm) || !parsedPace}
            onClick={handleSave}
            className="w-full py-3 rounded-full bg-lime text-on-lime font-metric-md disabled:opacity-40"
          >
            Update training plan
          </button>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">{label}</span>
      {children}
    </label>
  )
}

function StatTile({ icon, label, value, sub, tone }: { icon: string; label: string; value: string; sub: string; tone: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[22px] p-md ${tone}`}>
      <div className="flex items-center justify-between">
        <span className="font-label-caps text-[10px] uppercase opacity-70">{label}</span>
        <Icon name={icon} size={15} className="opacity-60" />
      </div>
      <div className="font-display-hero text-headline-lg-mobile leading-none mt-xs">{value}</div>
      <span className="font-data-mono text-[11px] opacity-70">{sub}</span>
    </div>
  )
}

function ManualActivityForm({ weightKg, onAdd }: { weightKg: number; onAdd: (session: PlanSession) => void }) {
  const [category, setCategory] = useState<ActivityCategory | 'all'>('run')
  const [activityId, setActivityId] = useState('easy_run')
  const [date, setDate] = useState(todayISO())
  const [duration, setDuration] = useState('30')
  const [distance, setDistance] = useState('3')

  const activities = ACTIVITIES.filter((a) => category === 'all' || a.category === category)
  const activity = activityById(activityId)
  const min = Math.max(1, Number(duration) || 0)
  const km = activity.type === 'run' ? Math.max(0, Number(distance) || 0) : 0
  const met = activity.type === 'run' ? metForRun(km, min, activity.met) : activity.met
  const kcal = kcalActivity(weightKg, activity.id, min, km)
  const pace = km > 0 ? `${Math.floor(min / km)}:${String(Math.round(((min / km) % 1) * 60)).padStart(2, '0')}/km` : null

  const save = () => {
    const detail = activity.type === 'run' && km > 0 ? `${km} KM - ${min} MIN - ${pace}` : `${min} MIN - ${met.toFixed(1)} MET`
    onAdd({
      id: uid(),
      date,
      type: activity.type,
      title: activity.label,
      detail,
      durationMin: min,
      distanceKm: activity.type === 'run' && km > 0 ? km : undefined,
      kcal,
      completed: true,
      plan: 'manual',
      icon: activity.icon,
      manual: true,
    })
  }

  return (
    <div className="mt-md space-y-md animate-fade-in">
      <div className="flex gap-sm overflow-x-auto no-scrollbar pb-1">
        {ACTIVITY_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setCategory(c.id)
              const first = ACTIVITIES.find((a) => c.id === 'all' || a.category === c.id)
              if (first) {
                setActivityId(first.id)
                setDistance(first.type === 'run' ? '3' : '')
              }
            }}
            className={`shrink-0 px-md py-2 rounded-full font-data-mono text-[12px] border ${
              category === c.id ? 'bg-lime text-on-lime border-lime' : 'bg-ink text-on-surface-variant border-white/10'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-sm">
        {activities.map((a) => (
          <button
            key={a.id}
            onClick={() => {
              setActivityId(a.id)
              setDistance(a.type === 'run' ? distance || '3' : '')
            }}
            className={`min-h-[74px] rounded-2xl border p-sm text-left transition ${
              activityId === a.id ? 'bg-lime text-on-lime border-lime' : 'bg-ink border-white/10 text-on-surface'
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon name={a.icon} size={18} />
              <span className="font-metric-md text-[14px] leading-tight">{a.label}</span>
            </div>
            <span className={`font-data-mono text-[11px] ${activityId === a.id ? 'opacity-70' : 'text-on-surface-variant'}`}>{a.met} MET</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-sm">
        <label className="flex flex-col gap-1">
          <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">Minutes</span>
          <input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} className={fieldCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-caps text-[10px] uppercase text-on-surface-variant">Km</span>
          <input type="number" min={0} step="0.1" disabled={activity.type !== 'run'} value={distance} onChange={(e) => setDistance(e.target.value)} className={`${fieldCls} disabled:opacity-40`} />
        </label>
      </div>
      <div className="rounded-2xl bg-[#101112] border border-lime/20 p-md">
        <div className="flex items-center justify-between">
          <span className="font-data-mono text-[12px] text-on-surface-variant">Estimated burn</span>
          <span className="font-display-hero text-headline-lg-mobile text-lime">{kcal} kcal</span>
        </div>
        <p className="font-data-mono text-[11px] text-on-surface-variant mt-1">
          {activity.label} - {met.toFixed(1)} MET{pace ? ` - ${pace}` : ''}. Estimate based on Compendium MET method.
        </p>
      </div>
      <button onClick={save} className="w-full py-3 rounded-full bg-lime text-on-lime font-metric-md">Save activity</button>
    </div>
  )
}

function SessionCard({ session: s, index, today, onToggle, onDelete }: { session: PlanSession; index: number; today: string; onToggle: () => void; onDelete?: () => void }) {
  const done = s.completed
  const pastel = PASTELS[s.type]
  const isToday = s.date === today
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, ...spring }}>
      <div className={`rounded-[24px] p-md flex items-center justify-between cursor-pointer ${done ? 'bg-ink-card border border-white/5' : `${pastel.bg} ${pastel.fg}`} ${isToday && !done ? 'ring-2 ring-lime ring-offset-2 ring-offset-ink' : ''}`}>
        <Press as="div" onClick={onToggle} className="flex items-center gap-md flex-1 min-w-0">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-secondary/20 text-secondary' : 'bg-black/10'}`}>
            <Icon name={done ? 'check' : s.icon} fill />
          </div>
          <div className="min-w-0">
            <p className={`font-metric-md text-metric-md truncate ${done ? 'text-on-surface line-through' : ''}`}>{s.title}</p>
            <p className={`font-data-mono text-[12px] ${done ? 'text-on-surface-variant' : 'opacity-70'}`}>{weekday(s.date)} - {s.detail}</p>
            <p className={`font-data-mono text-[11px] ${done ? 'text-lime' : 'opacity-80'}`}>{s.kcal} kcal burned{s.manual ? ' - logged' : ''}</p>
          </div>
        </Press>
        <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center shrink-0 ${done ? '' : 'bg-black/85 text-lime'}`}>
          {done ? <Icon name="check_circle" fill className="text-secondary" /> : s.durationMin > 0 ? (
            <>
              <span className="font-display-hero text-[15px] leading-none">{s.durationMin}</span>
              <span className="font-label-caps text-[8px] uppercase">min</span>
            </>
          ) : <Icon name="bedtime" />}
        </div>
        {onDelete && (
          <button onClick={onDelete} className="ml-sm w-10 h-10 rounded-full bg-error/10 text-error flex items-center justify-center">
            <Icon name="delete" size={18} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

function taperMessage(taperIn: number): string {
  if (taperIn <= 0 && taperIn > -21) return 'Taper underway - cut volume, hold intensity, recover hard.'
  if (taperIn <= 3 && taperIn > 0) return `Taper in ${taperIn} days. Recovery over volume now.`
  if (taperIn > 0) return `Build phase. Taper in ${taperIn} days - stack consistent weeks.`
  return 'Race done - log recovery and plan the next block.'
}

function parsePace(value: string): number {
  const clean = value.trim()
  if (!clean) return 0
  if (clean.includes(':')) {
    const [m, s = '0'] = clean.split(':')
    return Math.round((Number(m) || 0) * 60 + (Number(s) || 0))
  }
  return Math.round((Number(clean) || 0) * 60)
}

const fieldCls = 'w-full bg-[#101112] border border-white/10 rounded-xl px-sm py-2 text-on-surface font-data-mono text-[13px] focus:border-lime focus:outline-none'
