import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../store/AppContext'
import { TopBar } from '../components/TopBar'
import { Icon } from '../components/Icon'
import { Press, Reveal, listContainer, spring } from '../components/motion'
import { addDays, shortDate, startOfWeek, todayISO, uid, weekday } from '../lib/date'
import {
  HALF_MARATHON_GOALS,
  formatFinishTime,
  formatPace,
  halfMarathonGoalLabel,
  halfMarathonGoalPace,
  kcalActivity,
  planCapability,
  planMeta,
  sessionsForWeek,
} from '../lib/plan'
import { ACTIVITIES, ACTIVITY_CATEGORIES, activityById, metForRun, type ActivityCategory } from '../lib/activities'
import type { PlanSession, RaceType, UserProfile } from '../types'

type StartMode = 'this-week' | 'next-week' | 'custom'

const DAY_OPTIONS = [
  { id: 0, label: 'Mon' },
  { id: 1, label: 'Tue' },
  { id: 2, label: 'Wed' },
  { id: 3, label: 'Thu' },
  { id: 4, label: 'Fri' },
  { id: 5, label: 'Sat' },
  { id: 6, label: 'Sun' },
]

const DEFAULT_RUN_DAYS = [1, 3, 5]

export function Train() {
  const { state, profile, weightKg, updateProfile, addSession, removeSession, toggleSession } = useApp()
  const today = todayISO()
  const [showLog, setShowLog] = useState(false)

  const meta = planMeta(profile, state.sessions, today)
  const cap = planCapability(profile)
  const week = sessionsForWeek(state.sessions, today)
  const runningSessions = week.filter((s) => s.plan === 'running')
  const manualSessions = state.sessions
    .filter((s) => s.plan === 'manual' || s.manual)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)

  const plannedRuns = runningSessions.length
  const doneRuns = runningSessions.filter((s) => s.completed).length
  const compliance = plannedRuns ? Math.round((doneRuns / plannedRuns) * 100) : 0
  const volume = runningSessions.reduce((a, s) => a + (s.distanceKm ?? 0), 0)
  const burned = week.filter((s) => s.completed).reduce((a, s) => a + s.kcal, 0)

  return (
    <motion.div variants={listContainer} className="px-margin-mobile pt-sm space-y-lg">
      <TopBar />

      <RunningPlanCard
        profile={profile}
        onUpdate={(patch) => updateProfile(patch, true)}
      />

      <Reveal>
        <section className="rounded-2xl bg-lime text-on-lime p-md relative overflow-hidden ring-1 ring-lime/30">
          <div className="absolute right-[-40px] top-[-54px] h-36 w-36 rounded-full border border-on-lime/15" />
          <div className="relative flex items-start justify-between gap-md">
            <div>
              <p className="font-data-mono text-[12px] opacity-70">Current plan target</p>
              <h2 className="font-display-hero text-headline-lg mt-1">
                {formatFinishTime(cap.projectedFinishMin)}
              </h2>
              <p className="font-metric-md text-[15px]">{formatPace(cap.targetPace)} target pace</p>
            </div>
            <div className="rounded-xl bg-on-lime px-sm py-xs text-right text-lime">
              <p className="font-data-mono text-[12px]">Week</p>
              <p className="font-metric-md text-[18px]">{meta ? `${meta.week}/${meta.totalWeeks}` : 'Base'}</p>
            </div>
          </div>
          <p className="relative font-body-md text-[13px] opacity-80 mt-md">
            {cap.assessment.difficulty === 'unrealistic'
              ? `${cap.assessment.selectedGoalLabel} is too aggressive from current data, so the plan trains around ${formatFinishTime(cap.assessment.realisticFinishMin)} first.`
              : cap.assessment.difficulty === 'stretch'
                ? `${cap.assessment.selectedGoalLabel} is a stretch target. Keep the quality day and long run consistent.`
                : `${cap.assessment.selectedGoalLabel} matches your current training profile.`}
          </p>
        </section>
      </Reveal>

      <Reveal>
        <div className="grid grid-cols-3 gap-sm">
          <StatTile icon="task_alt" label="Run compliance" value={`${compliance}%`} sub={`${doneRuns}/${plannedRuns} runs`} />
          <StatTile icon="conversion_path" label="Run volume" value={`${volume.toFixed(0)} km`} sub="this week" />
          <StatTile icon="local_fire_department" label="Burned" value={`${burned}`} sub="kcal logged" strong />
        </div>
      </Reveal>

      <Reveal>
        <SectionHeader title="Running Plan" subtitle="Only run-specific sessions and drills" icon="directions_run" />
        <div className="space-y-sm">
          {runningSessions.length === 0
            ? <EmptyState icon="directions_run" text="Set your race details above to generate Week 1." />
            : runningSessions.map((s, i) => (
                <SessionCard key={s.id} session={s} index={i} today={today} onToggle={() => toggleSession(s.id)} />
              ))}
        </div>
      </Reveal>

      <Reveal>
        <section className="rounded-2xl bg-ink-card ring-1 ring-tile-border p-md">
          <div className="flex items-center justify-between gap-md">
            <div>
              <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Other Activities</h3>
              <p className="font-body-md text-[13px] text-on-surface-variant">
                Log gym, sport or extra cardio separately from the running plan.
              </p>
            </div>
            <button
              onClick={() => setShowLog((v) => !v)}
              aria-label={showLog ? 'Close activity form' : 'Add activity'}
              className="min-h-12 w-12 rounded-full bg-lime text-on-lime flex items-center justify-center shrink-0 transition-transform duration-150 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
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

          {manualSessions.length > 0 && (
            <div className="mt-md space-y-sm">
              {manualSessions.map((s, i) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  index={i}
                  today={today}
                  onToggle={() => toggleSession(s.id)}
                  onDelete={() => removeSession(s.id)}
                />
              ))}
            </div>
          )}
        </section>
      </Reveal>
    </motion.div>
  )
}

function RunningPlanCard({
  profile,
  onUpdate,
}: {
  profile: UserProfile
  onUpdate: (patch: Partial<UserProfile>) => void
}) {
  const thisWeek = startOfWeek(todayISO())
  const nextWeek = addDays(thisWeek, 7)
  const initialStart = profile.planStartDate ?? thisWeek
  const initialMode: StartMode = initialStart === thisWeek ? 'this-week' : initialStart === nextWeek ? 'next-week' : 'custom'

  const [raceType, setRaceType] = useState(profile.raceType)
  const [raceDate, setRaceDate] = useState(profile.raceDate ?? '')
  const [trainingDays, setTrainingDays] = useState(profile.trainingDaysPerWeek)
  const [halfGoal, setHalfGoal] = useState(profile.halfMarathonGoal)
  const [fivePace, setFivePace] = useState(formatPace(profile.bestFiveKmPaceSecPerKm).replace('/km', ''))
  const [tenPace, setTenPace] = useState(formatPace(profile.bestTenKmPaceSecPerKm).replace('/km', ''))
  const [longestKm, setLongestKm] = useState(String(profile.bestRunDistanceKm))
  const [startMode, setStartMode] = useState<StartMode>(initialMode)
  const [customStart, setCustomStart] = useState(initialStart)
  const [preferredDays, setPreferredDays] = useState<number[]>(normalPreferred(profile.runPreferredDays, profile.trainingDaysPerWeek))
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setExpanded(false)
  }, [])

  const parsedFive = parsePace(fivePace)
  const parsedTen = parsePace(tenPace)
  const planStartDate = startMode === 'this-week' ? thisWeek : startMode === 'next-week' ? nextWeek : customStart
  const cleanDays = clampPreferredDays(preferredDays, trainingDays)
  const hasEnoughRunDays = cleanDays.length === trainingDays
  const draftProfile = useMemo<UserProfile>(() => ({
    ...profile,
    raceType,
    raceDate: raceDate || null,
    trainingDaysPerWeek: trainingDays,
    halfMarathonGoal: halfGoal,
    bestFiveKmPaceSecPerKm: parsedFive || profile.bestFiveKmPaceSecPerKm,
    bestTenKmPaceSecPerKm: parsedTen || profile.bestTenKmPaceSecPerKm,
    bestRunPaceSecPerKm: parsedFive || profile.bestRunPaceSecPerKm,
    bestRunDistanceKm: Math.max(1, Number(longestKm) || profile.bestRunDistanceKm),
    planStartDate,
    runPreferredDays: hasEnoughRunDays ? cleanDays : normalPreferred(cleanDays, trainingDays),
  }), [cleanDays, customStart, fivePace, halfGoal, hasEnoughRunDays, longestKm, parsedFive, parsedTen, planStartDate, profile, raceDate, raceType, tenPace, trainingDays])

  const cap = planCapability(draftProfile)
  const assessment = cap.assessment
  const dirty =
    raceType !== profile.raceType ||
    raceDate !== (profile.raceDate ?? '') ||
    trainingDays !== profile.trainingDaysPerWeek ||
    halfGoal !== profile.halfMarathonGoal ||
    parsedFive !== profile.bestFiveKmPaceSecPerKm ||
    parsedTen !== profile.bestTenKmPaceSecPerKm ||
    Number(longestKm) !== profile.bestRunDistanceKm ||
    planStartDate !== (profile.planStartDate ?? thisWeek) ||
    normalPreferred(cleanDays, trainingDays).join(',') !== normalPreferred(profile.runPreferredDays, profile.trainingDaysPerWeek).join(',')

  const canSave = Boolean(parsedFive && parsedTen && Number(longestKm) && planStartDate && hasEnoughRunDays)

  const handleSave = () => {
    onUpdate({
      raceType,
      raceDate: raceDate || null,
      trainingDaysPerWeek: trainingDays,
      halfMarathonGoal: halfGoal,
      bestFiveKmPaceSecPerKm: parsedFive,
      bestTenKmPaceSecPerKm: parsedTen,
      bestRunPaceSecPerKm: parsedFive,
      bestRunDistanceKm: Math.max(1, Number(longestKm)),
      planStartDate,
      runPreferredDays: normalPreferred(cleanDays, trainingDays),
      sports: profile.sports.includes('running') ? profile.sports : [...profile.sports, 'running'],
    })
    setExpanded(false)
  }

  return (
    <Reveal>
      <section className="rounded-2xl bg-ink-card ring-1 ring-tile-border overflow-hidden">
        <div className="p-md border-b border-white/5">
          <div className="flex items-start justify-between gap-md">
            <div className="min-w-0">
              <div className="flex items-center gap-sm">
                <div className="h-10 w-10 rounded-xl bg-lime/15 text-lime flex items-center justify-center">
                  <Icon name="speed" size={22} />
                </div>
                <div className="min-w-0">
                  <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Running</h2>
                  <p className="font-body-md text-[13px] text-on-surface-variant">
                    {raceDate ? `${raceType === 'half-marathon' ? 'Half marathon' : 'Marathon'} on ${shortDate(raceDate)} · ${trainingDays} days/week` : `${trainingDays} days/week · race date not set`}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-sm shrink-0">
              <span className={`hidden sm:inline-flex rounded-full px-sm py-xs font-data-mono text-[12px] ${assessment.difficulty === 'unrealistic' ? 'bg-error/15 text-error' : assessment.difficulty === 'stretch' ? 'bg-tertiary/15 text-tertiary' : 'bg-lime/15 text-lime'}`}>
                {assessment.difficulty === 'unrealistic' ? 'Too aggressive' : assessment.difficulty === 'stretch' ? 'Stretch' : 'Achievable'}
              </span>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="min-h-11 rounded-full bg-lime text-on-lime px-md font-metric-md text-[14px] inline-flex items-center gap-xs transition-transform duration-150 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
                aria-expanded={expanded}
              >
                <Icon name={expanded ? 'expand_less' : 'edit'} size={18} />
                {expanded ? 'Done' : 'Edit plan'}
              </button>
            </div>
          </div>
        </div>

        <div className="p-md space-y-md">
          <div className="grid grid-cols-3 gap-sm">
            <Metric label="Realistic" value={formatFinishTime(assessment.realisticFinishMin)} sub={formatPace(assessment.realisticPace)} />
            <Metric label="Stretch" value={formatFinishTime(assessment.stretchFinishMin)} sub={formatPace(assessment.stretchPace)} />
            <Metric label="Plan pace" value={formatPace(cap.targetPace).replace('/km', '')} sub={formatFinishTime(cap.projectedFinishMin)} strong />
          </div>

          <div className="rounded-xl bg-[#101112] ring-1 ring-white/10 p-md">
            <p className="font-body-md text-[13px] text-on-surface">
              Based on your 5K, 10K, longest run, {trainingDays} available days and race runway,
              FitCore recommends <span className="text-lime font-semibold">{halfMarathonGoalLabel(assessment.recommendedGoal)}</span> as the logical goal.
            </p>
          </div>

          {expanded && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-md border-t border-white/5 pt-md"
            >
              <div className="grid grid-cols-2 gap-sm">
                <Field label="Race">
                  <select value={raceType} onChange={(e) => setRaceType(e.target.value as RaceType)} className={fieldCls}>
                    <option value="half-marathon">Half Marathon</option>
                    <option value="marathon">Marathon</option>
                  </select>
                </Field>
                <Field label="Race date">
                  <input type="date" value={raceDate} onChange={(e) => setRaceDate(e.target.value)} className={fieldCls} />
                </Field>
              </div>

              {raceType === 'half-marathon' && (
                <Field label="Target concept">
                  <div className="grid grid-cols-2 gap-sm">
                    {HALF_MARATHON_GOALS.map((goal) => {
                      const pace = halfMarathonGoalPace(goal)
                      return (
                        <button
                          key={goal}
                          onClick={() => setHalfGoal(goal)}
                          className={`min-h-12 rounded-xl p-sm text-left ring-1 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime ${
                            halfGoal === goal ? 'bg-lime text-on-lime ring-lime' : 'bg-[#101112] text-on-surface ring-white/10'
                          }`}
                        >
                          <span className="block font-metric-md text-[14px]">{halfMarathonGoalLabel(goal)}</span>
                          <span className={`block font-data-mono text-[12px] ${halfGoal === goal ? 'opacity-75' : 'text-on-surface-variant'}`}>
                            {pace ? formatPace(pace) : 'No time pressure'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </Field>
              )}

              <div className="grid grid-cols-3 gap-sm">
                <Field label="Best 5K pace">
                  <input value={fivePace} onChange={(e) => setFivePace(e.target.value)} placeholder="6:20" className={fieldCls} />
                </Field>
                <Field label="Best 10K pace">
                  <input value={tenPace} onChange={(e) => setTenPace(e.target.value)} placeholder="7:00" className={fieldCls} />
                </Field>
                <Field label="Longest run">
                  <input type="number" min={1} step="0.1" value={longestKm} onChange={(e) => setLongestKm(e.target.value)} className={fieldCls} />
                </Field>
              </div>

              <Field label="Training days / week">
                <div className="grid grid-cols-5 gap-sm">
                  {[3, 4, 5, 6, 7].map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setTrainingDays(d)
                        setPreferredDays((current) => clampPreferredDays(current, d))
                      }}
                      className={`min-h-11 rounded-xl font-metric-md text-[15px] ring-1 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime ${
                        trainingDays === d ? 'bg-lime text-on-lime ring-lime' : 'bg-[#101112] text-on-surface-variant ring-white/10'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Preferred run days">
                <p className="font-body-md text-[13px] text-on-surface-variant">
                  Pick exactly {trainingDays} days. Selected {cleanDays.length}/{trainingDays}.
                </p>
                <div className="grid grid-cols-7 gap-xs">
                  {DAY_OPTIONS.map((day) => {
                    const active = cleanDays.includes(day.id)
                    return (
                      <button
                        key={day.id}
                        onClick={() => setPreferredDays((current) => toggleDay(current, day.id, trainingDays))}
                        className={`min-h-11 rounded-lg font-data-mono text-[12px] ring-1 transition-colors duration-150 ${
                          active ? 'bg-lime text-on-lime ring-lime' : 'bg-[#101112] text-on-surface-variant ring-white/10'
                        }`}
                      >
                        {day.label}
                      </button>
                    )
                  })}
                </div>
              </Field>

              <Field label="Start training">
                <div className="grid grid-cols-3 gap-sm">
                  {[
                    { id: 'this-week' as StartMode, label: 'This week', sub: shortDate(thisWeek) },
                    { id: 'next-week' as StartMode, label: 'Next week', sub: shortDate(nextWeek) },
                    { id: 'custom' as StartMode, label: 'Custom', sub: customStart ? shortDate(customStart) : 'Pick date' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setStartMode(option.id)}
                      className={`min-h-[58px] rounded-xl p-sm text-left ring-1 transition-colors duration-150 ${
                        startMode === option.id ? 'bg-lime text-on-lime ring-lime' : 'bg-[#101112] text-on-surface ring-white/10'
                      }`}
                    >
                      <span className="block font-metric-md text-[13px]">{option.label}</span>
                      <span className={`block font-data-mono text-[12px] ${startMode === option.id ? 'opacity-75' : 'text-on-surface-variant'}`}>{option.sub}</span>
                    </button>
                  ))}
                </div>
              </Field>

              {startMode === 'custom' && (
                <Field label="Custom start date">
                  <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className={fieldCls} />
                </Field>
              )}

              <button
                disabled={!dirty || !canSave}
                onClick={handleSave}
                className="w-full min-h-12 rounded-full bg-lime text-on-lime font-metric-md disabled:opacity-40 transition-transform duration-150 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
              >
                Update plan
              </button>
            </motion.div>
          )}
        </div>
      </section>
    </Reveal>
  )
}

function SectionHeader({ title, subtitle, icon }: { title: string; subtitle: string; icon: string }) {
  return (
    <div className="flex items-center gap-md pt-sm">
      <div className="w-10 h-10 rounded-xl bg-ink-card ring-1 ring-tile-border flex items-center justify-center">
        <Icon name={icon} className="text-lime" size={20} />
      </div>
      <div>
        <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">{title}</h3>
        <p className="font-body-md text-[13px] text-on-surface-variant">{subtitle}</p>
      </div>
    </div>
  )
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="rounded-2xl bg-ink-card ring-1 ring-tile-border p-md flex items-center gap-md">
      <Icon name={icon} className="text-on-surface-variant" />
      <p className="font-body-md text-body-md text-on-surface-variant">{text}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-label-caps text-[12px] text-on-surface-variant uppercase">{label}</span>
      {children}
    </label>
  )
}

function Metric({ label, value, sub, strong }: { label: string; value: string; sub: string; strong?: boolean }) {
  return (
    <div className={`rounded-xl p-sm ring-1 ${strong ? 'bg-lime text-on-lime ring-lime' : 'bg-[#101112] text-on-surface ring-white/10'}`}>
      <p className={`font-data-mono text-[12px] ${strong ? 'opacity-75' : 'text-on-surface-variant'}`}>{label}</p>
      <p className="font-metric-md text-[20px] leading-tight mt-1">{value}</p>
      <p className={`font-data-mono text-[12px] ${strong ? 'opacity-75' : 'text-lime'}`}>{sub}</p>
    </div>
  )
}

function StatTile({ icon, label, value, sub, strong }: { icon: string; label: string; value: string; sub: string; strong?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-md ring-1 ${strong ? 'bg-lime text-on-lime ring-lime' : 'bg-ink-card text-on-surface ring-tile-border'}`}>
      <div className="flex items-center justify-between">
        <span className={`font-data-mono text-[12px] ${strong ? 'opacity-75' : 'text-on-surface-variant'}`}>{label}</span>
        <Icon name={icon} size={15} className={strong ? 'opacity-70' : 'text-lime'} />
      </div>
      <div className="font-metric-md text-[22px] leading-none mt-xs">{value}</div>
      <span className={`font-data-mono text-[12px] ${strong ? 'opacity-75' : 'text-on-surface-variant'}`}>{sub}</span>
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
    <div className="mt-md space-y-md">
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
            className={`shrink-0 min-h-11 px-md rounded-full font-data-mono text-[12px] ring-1 transition-colors duration-150 ${
              category === c.id ? 'bg-lime text-on-lime ring-lime' : 'bg-ink text-on-surface-variant ring-white/10'
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
            className={`min-h-[74px] rounded-xl ring-1 p-sm text-left transition-colors duration-150 ${
              activityId === a.id ? 'bg-lime text-on-lime ring-lime' : 'bg-ink ring-white/10 text-on-surface'
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon name={a.icon} size={18} />
              <span className="font-metric-md text-[14px] leading-tight">{a.label}</span>
            </div>
            <span className={`font-data-mono text-[12px] ${activityId === a.id ? 'opacity-70' : 'text-on-surface-variant'}`}>{a.met} MET</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-sm">
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldCls} />
        </Field>
        <Field label="Minutes">
          <input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} className={fieldCls} />
        </Field>
        <Field label="Km">
          <input type="number" min={0} step="0.1" disabled={activity.type !== 'run'} value={distance} onChange={(e) => setDistance(e.target.value)} className={`${fieldCls} disabled:opacity-40`} />
        </Field>
      </div>
      <div className="rounded-xl bg-[#101112] ring-1 ring-lime/20 p-md">
        <div className="flex items-center justify-between">
          <span className="font-data-mono text-[12px] text-on-surface-variant">Estimated burn</span>
          <span className="font-metric-md text-[22px] text-lime">{kcal} kcal</span>
        </div>
        <p className="font-data-mono text-[12px] text-on-surface-variant mt-1">
          {activity.label} - {met.toFixed(1)} MET{pace ? ` - ${pace}` : ''}. Estimate based on MET method.
        </p>
      </div>
      <button onClick={save} className="w-full min-h-12 rounded-full bg-lime text-on-lime font-metric-md transition-transform duration-150 active:scale-[0.98]">Save activity</button>
    </div>
  )
}

function SessionCard({ session: s, index, today, onToggle, onDelete }: { session: PlanSession; index: number; today: string; onToggle: () => void; onDelete?: () => void }) {
  const done = s.completed
  const isToday = s.date === today
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03, ...spring }}>
      <div className={`rounded-2xl p-md flex items-center justify-between gap-sm ${done ? 'bg-ink-card ring-1 ring-tile-border' : 'bg-[#101112] ring-1 ring-white/10'} ${isToday && !done ? 'outline outline-2 outline-lime outline-offset-2' : ''}`}>
        <Press as="div" onClick={onToggle} className="flex items-center gap-md flex-1 min-w-0">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${done ? 'bg-secondary/15 text-secondary' : 'bg-lime/15 text-lime'}`}>
            <Icon name={done ? 'check' : s.icon} fill />
          </div>
          <div className="min-w-0">
            <p className={`font-metric-md text-metric-md truncate ${done ? 'text-on-surface line-through' : 'text-on-surface'}`}>{s.title}</p>
            <p className="font-data-mono text-[12px] text-on-surface-variant">{weekday(s.date)} - {s.detail}</p>
            <p className="font-data-mono text-[12px] text-lime">{s.kcal} kcal{s.manual ? ' - logged' : ''}</p>
          </div>
        </Press>
        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${done ? 'text-secondary' : 'bg-lime text-on-lime'}`}>
          {done ? <Icon name="check_circle" fill /> : s.durationMin > 0 ? (
            <>
              <span className="font-metric-md text-[15px] leading-none">{s.durationMin}</span>
              <span className="font-data-mono text-[10px] uppercase">min</span>
            </>
          ) : <Icon name="bedtime" />}
        </div>
        {onDelete && (
          <button onClick={onDelete} className="w-10 h-10 rounded-xl bg-error/10 text-error flex items-center justify-center">
            <Icon name="delete" size={18} />
          </button>
        )}
      </div>
    </motion.div>
  )
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

function normalPreferred(days: number[] | undefined, count: number): number[] {
  const fallback = [...DEFAULT_RUN_DAYS, 0, 4, 2, 6]
  const clean = [...new Set([...(days ?? []), ...fallback])]
    .map((day) => Math.max(0, Math.min(6, Math.round(day))))
  return clean.slice(0, Math.max(3, Math.min(7, count)))
}

function clampPreferredDays(days: number[] | undefined, count: number): number[] {
  const limit = Math.max(3, Math.min(7, count))
  return [...new Set(days ?? [])]
    .map((day) => Math.max(0, Math.min(6, Math.round(day))))
    .slice(0, limit)
}

function toggleDay(current: number[], day: number, count: number): number[] {
  const limit = Math.max(3, Math.min(7, count))
  const clean = clampPreferredDays(current, limit)
  const hasDay = current.includes(day)
  if (hasDay) return clean.filter((d) => d !== day)
  if (clean.length >= limit) return [...clean.slice(1), day]
  return [...clean, day]
}

const fieldCls = 'w-full min-h-11 bg-[#101112] ring-1 ring-white/10 rounded-xl px-sm py-2 text-on-surface font-data-mono text-[13px] focus:ring-2 focus:ring-lime focus:outline-none'
