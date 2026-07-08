import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import type { AppState, FoodEntry, PlanSession, ProgressPhoto, UserProfile, WeightEntry } from '../types'
import { clearState, emptyState, loadState, saveState, seedForProfile } from '../lib/storage'
import { generatePlan } from '../lib/plan'
import { latestMeasured } from '../lib/body'

type Action =
  | { type: 'onboard'; profile: UserProfile }
  | { type: 'updateProfile'; patch: Partial<UserProfile>; regenerate?: boolean }
  | { type: 'addFood'; food: FoodEntry }
  | { type: 'updateFood'; id: string; patch: Partial<FoodEntry> }
  | { type: 'removeFood'; id: string }
  | { type: 'addWeight'; entry: WeightEntry }
  | { type: 'removeWeight'; id: string }
  | { type: 'addPhoto'; photo: ProgressPhoto }
  | { type: 'removePhoto'; id: string }
  | { type: 'addSession'; session: PlanSession }
  | { type: 'removeSession'; id: string }
  | { type: 'toggleSession'; id: string }
  | { type: 'refresh' }
  | { type: 'reset' }

function currentWeight(state: AppState): number {
  return latestMeasured(state.weights)?.weightKg ?? state.profile.startWeightKg
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'onboard':
      return seedForProfile({ ...action.profile, onboarded: true })

    case 'updateProfile': {
      const profile = { ...state.profile, ...action.patch }
      if (action.regenerate) {
        return { ...state, profile, sessions: regenerateKeepingProgress(state, profile) }
      }
      return { ...state, profile }
    }

    case 'addFood':
      return { ...state, foods: [...state.foods, action.food] }
    case 'updateFood':
      return { ...state, foods: state.foods.map((f) => (f.id === action.id ? { ...f, ...action.patch } : f)) }
    case 'removeFood':
      return { ...state, foods: state.foods.filter((f) => f.id !== action.id) }

    case 'addWeight': {
      const weights = [...state.weights.filter((w) => w.date !== action.entry.date), action.entry]
      return { ...state, weights }
    }
    case 'removeWeight':
      return { ...state, weights: state.weights.filter((w) => w.id !== action.id) }

    case 'addPhoto':
      return { ...state, photos: [...state.photos, action.photo] }
    case 'removePhoto':
      return { ...state, photos: state.photos.filter((p) => p.id !== action.id) }

    case 'addSession':
      return { ...state, sessions: [...state.sessions, action.session] }
    case 'removeSession':
      return { ...state, sessions: state.sessions.filter((s) => s.id !== action.id) }

    case 'toggleSession':
      return {
        ...state,
        sessions: state.sessions.map((s) => (s.id === action.id ? { ...s, completed: !s.completed } : s)),
      }

    case 'refresh':
      return loadState() ?? state

    case 'reset':
      return emptyState()
  }
}

/** Regenerate the plan after a profile change but preserve completed-state on matching dates+plans. */
function regenerateKeepingProgress(state: AppState, profile: UserProfile): AppState['sessions'] {
  const fresh = generatePlan(profile, currentWeight(state))
  const manual = state.sessions.filter((s) => s.plan === 'manual' || s.manual)
  const completedKeys = new Set(state.sessions.filter((s) => s.completed).map((s) => `${s.date}|${s.plan}|${s.title}`))
  return [
    ...fresh.map((s) => (completedKeys.has(`${s.date}|${s.plan}|${s.title}`) ? { ...s, completed: true } : s)),
    ...manual,
  ].sort((a, b) => a.date.localeCompare(b.date))
}

interface Ctx {
  state: AppState
  profile: UserProfile
  weightKg: number
  onboard: (profile: UserProfile) => void
  updateProfile: (patch: Partial<UserProfile>, regenerate?: boolean) => void
  addFood: (food: FoodEntry) => void
  updateFood: (id: string, patch: Partial<FoodEntry>) => void
  removeFood: (id: string) => void
  addWeight: (entry: WeightEntry) => void
  removeWeight: (id: string) => void
  addPhoto: (photo: ProgressPhoto) => void
  removePhoto: (id: string) => void
  addSession: (session: PlanSession) => void
  removeSession: (id: string) => void
  toggleSession: (id: string) => void
  refresh: () => void
  reset: () => void
}

const AppCtx = createContext<Ctx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState() ?? emptyState())

  useEffect(() => {
    saveState(state)
  }, [state])

  const value = useMemo<Ctx>(
    () => ({
      state,
      profile: state.profile,
      weightKg: currentWeight(state),
      onboard: (profile) => dispatch({ type: 'onboard', profile }),
      updateProfile: (patch, regenerate) => dispatch({ type: 'updateProfile', patch, regenerate }),
      addFood: (food) => dispatch({ type: 'addFood', food }),
      updateFood: (id, patch) => dispatch({ type: 'updateFood', id, patch }),
      removeFood: (id) => dispatch({ type: 'removeFood', id }),
      addWeight: (entry) => dispatch({ type: 'addWeight', entry }),
      removeWeight: (id) => dispatch({ type: 'removeWeight', id }),
      addPhoto: (photo) => dispatch({ type: 'addPhoto', photo }),
      removePhoto: (id) => dispatch({ type: 'removePhoto', id }),
      addSession: (session) => dispatch({ type: 'addSession', session }),
      removeSession: (id) => dispatch({ type: 'removeSession', id }),
      toggleSession: (id) => dispatch({ type: 'toggleSession', id }),
      refresh: () => dispatch({ type: 'refresh' }),
      reset: () => {
        clearState()
        dispatch({ type: 'reset' })
      },
    }),
    [state],
  )

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): Ctx {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
