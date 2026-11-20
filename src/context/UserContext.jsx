import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { applyXp } from '../data/progression.js'
import {
  CATALOG_BY_ID, coinsFor, dayKey, DEFAULT_PROFILE, DIFFICULTY, ITEM_BY_ID, isOwned, PARTY_BONUS, penaltyFor, pickDailies,
  RANDOM_BY_ID, resolveLook, ROLLS_PER_DAY,
} from '../data/seed.js'

const UserContext = createContext(null)
const MIN = 60_000

const setQuest = (state, id, patch) => ({
  ...state,
  quests: state.quests.map((q) => (q.id === id ? { ...q, ...patch } : q)),
})

const hasActive = (state) => state.quests.some((q) => q.status === 'active')
const freshRolls = (date) => ({ date, used: 0, pending: null })
const rollsLeft = (state) => ROLLS_PER_DAY - (state.rolls?.used ?? 0)

/** Consecutive days with at least one completed quest. */
function bumpStreak(state) {
  const today = dayKey()
  if (state.lastStreakDay === today) return {}
  const yesterday = dayKey(new Date(Date.now() - 864e5))
  return { streak: state.lastStreakDay === yesterday ? state.streak + 1 : 1, lastStreakDay: today }
}

function reducer(state, action) {
  switch (action.type) {
    case 'ROLL_DAILIES': {
      if (state.daily?.date === action.date && state.rolls?.date === action.date) return state
      return { ...state, daily: { date: action.date, ids: pickDailies(action.date) }, rolls: freshRolls(action.date) }
    }

    /* ----- Random rolls: the first reveal is free; Reroll and Accept each spend 1 of 3 daily rolls ----- */
    case 'REVEAL_ROLL': {
      if (state.rolls?.pending || rollsLeft(state) < 1 || !RANDOM_BY_ID[action.questId]) return state
      return { ...state, rolls: { ...state.rolls, pending: action.questId } }
    }
    case 'REROLL': {
      // Keep at least one roll back so the new quest can still be accepted.
      if (!state.rolls?.pending || rollsLeft(state) < 2 || !RANDOM_BY_ID[action.questId]) return state
      return { ...state, rolls: { ...state.rolls, used: state.rolls.used + 1, pending: action.questId } }
    }
    case 'ACCEPT_ROLL': {
      const t = RANDOM_BY_ID[state.rolls?.pending]
      if (!t || rollsLeft(state) < 1 || hasActive(state)) return state
      const now = Date.now()
      const id = `roll-${state.rolls.date}-${state.rolls.used + 1}-${t.id}`
      const q = { ...t, id, type: 'random', status: 'active', acceptedAt: now, expiresAt: now + t.limit * MIN, completedAt: null, proof: null }
      return {
        ...state,
        quests: [q, ...state.quests],
        rolls: { ...state.rolls, used: state.rolls.used + 1, pending: null },
        lastAccepted: { id: now, questId: id, title: t.title },
      }
    }

    /** Accept one of today's dailies — only when no other quest is active. */
    case 'ACCEPT_DAILY': {
      const { daily } = state
      const t = CATALOG_BY_ID[action.catalogId]
      if (!t || !daily?.ids.includes(t.id) || hasActive(state)) return state
      const id = `daily-${daily.date}-${t.id}`
      if (state.quests.some((q) => q.id === id)) return state // one attempt per daily per day
      const now = Date.now()
      const q = {
        ...t,
        id,
        catalogId: t.id,
        type: 'daily',
        date: daily.date,
        status: 'active',
        acceptedAt: now,
        expiresAt: now + t.limit * MIN,
        penalty: penaltyFor(t.difficulty),
        completedAt: null,
        proof: null,
      }
      return {
        ...state,
        quests: [q, ...state.quests],
        // Transient: expands the active-quest dock for a few seconds (not persisted).
        lastAccepted: { id: now, questId: id, title: t.title },
      }
    }

    /** Added on every teammate's device when their party accepts a quest (see OnlineContext). */
    case 'ADD_GROUP_QUEST': {
      const { id, quest: t, members, partyId, acceptedAt } = action.payload
      if (state.quests.some((q) => q.id === id)) return state
      const baseXp = DIFFICULTY[t.difficulty].xp
      const started = acceptedAt ?? Date.now()
      const limit = t.limit ?? DIFFICULTY[t.difficulty].limit
      const q = {
        id,
        partyId,
        title: t.title,
        description: t.description,
        category: t.category,
        difficulty: t.difficulty,
        limit,
        baseXp,
        xp: Math.round(baseXp * (1 + PARTY_BONUS)),
        type: 'group',
        group: true,
        members,
        status: 'active',
        acceptedAt: started,
        expiresAt: started + limit * MIN, // same deadline on every device
        penalty: penaltyFor(t.difficulty),
        completedAt: null,
        proof: null,
      }
      return {
        ...state,
        quests: [q, ...state.quests],
        lastAccepted: { id: Date.now(), questId: id, title: t.title },
      }
    }

    case 'COMPLETE_QUEST': {
      const q = state.quests.find((x) => x.id === action.id)
      if (!q || q.status !== 'active') return state
      const { levelsGained, ...next } = applyXp(state, q.xp)
      const coins = coinsFor(q.xp)
      return {
        ...setQuest(state, action.id, { status: 'completed', completedAt: Date.now(), proof: action.proof ?? null }),
        ...next,
        ...bumpStreak(state),
        coins: state.coins + coins,
        // Transient: drives the reward overlay (not persisted).
        lastReward: {
          id: Date.now(),
          questId: q.id,
          title: q.title,
          xp: q.xp,
          coins,
          levelsGained,
          group: !!q.group,
          from: { xp: state.xp, level: state.level, maxXp: state.maxXp },
          to: next,
        },
      }
    }

    /** Time ran out (or the player gave up): apply the penalty and free the active slot. */
    case 'FAIL_QUEST': {
      const q = state.quests.find((x) => x.id === action.id)
      if (!q || q.status !== 'active') return state
      const pen = q.penalty ?? penaltyFor(q.difficulty)
      return {
        ...setQuest(state, action.id, { status: 'failed', failedAt: Date.now(), failReason: action.reason }),
        xp: Math.max(0, state.xp - pen.xp), // never drops you a level
        coins: Math.max(0, state.coins - pen.coins),
        streak: 0,
        lastStreakDay: null,
        lastFailure: { id: Date.now(), questId: q.id, title: q.title, penalty: pen, reason: action.reason, group: !!q.group, partyId: q.partyId },
      }
    }

    /** Snapshot of teammates' proofs for a group quest, shown later in the Done tab. */
    case 'SET_PARTY_PROOFS':
      return setQuest(state, action.id, { partyProofs: action.proofs })

    /** The completion has been shared to the friend feed. */
    case 'MARK_POSTED':
      return setQuest(state, action.id, { posted: true })

    case 'EQUIP': {
      const item = ITEM_BY_ID[action.itemId]
      if (!item || !isOwned(item, state)) return state
      return { ...state, equipped: { ...state.equipped, [item.slot]: item.id } }
    }
    case 'BUY_ITEM': {
      const item = ITEM_BY_ID[action.itemId]
      const cost = item?.unlock?.coins
      if (!cost || isOwned(item, state) || state.coins < cost) return state
      return {
        ...state,
        coins: state.coins - cost,
        purchased: [...state.purchased, item.id],
        equipped: { ...state.equipped, [item.slot]: item.id },
      }
    }
    case 'UPDATE_PROFILE':
      return { ...state, ...action.patch }
    case 'DISMISS_REWARD':
      return { ...state, lastReward: null }
    case 'DISMISS_ACCEPTED':
      return { ...state, lastAccepted: null }
    case 'DISMISS_FAILURE':
      return { ...state, lastFailure: null }
    case 'RESET':
      return { ...DEFAULT_PROFILE, daily: { date: dayKey(), ids: pickDailies(dayKey()) }, rolls: freshRolls(dayKey()) }
    default:
      return state
  }
}

function load(storageKey) {
  let state = DEFAULT_PROFILE
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      const { friends: _f, party: _p, ...saved } = JSON.parse(raw)
      state = saved.version === 3
        ? { ...DEFAULT_PROFILE, ...saved }
        : {
            // Older saves: keep identity, progress and finished quests; start the new daily loop clean.
            ...DEFAULT_PROFILE,
            ...Object.fromEntries(['username', 'bio', 'tags', 'gamemode', 'level', 'xp', 'maxXp', 'coins', 'equipped', 'purchased']
              .filter((k) => k in saved).map((k) => [k, saved[k]])),
            quests: (saved.quests ?? []).filter((q) => q.status === 'completed'),
          }
    }
  } catch { /* storage unavailable or corrupt */ }
  const today = dayKey()
  if (state.daily?.date !== today) state = { ...state, daily: { date: today, ids: pickDailies(today) } }
  if (state.rolls?.date !== today) state = { ...state, rolls: freshRolls(today) }
  return state
}

/** Local progress (quests, locker, XP). Each adventurer gets their own storageKey. */
export function UserProvider({ storageKey, children }) {
  const [state, dispatch] = useReducer(reducer, storageKey, load)

  // Persist everything except transient UI events.
  useEffect(() => {
    const { lastReward: _r, lastAccepted: _a, lastFailure: _f, ...persisted } = state
    try { localStorage.setItem(storageKey, JSON.stringify(persisted)) } catch { /* ignore */ }
  }, [state, storageKey])

  // Expire timed-out quests (also catches quests that ran out while the app was closed),
  // and roll new dailies after midnight.
  const active = state.quests.find((q) => q.status === 'active')
  useEffect(() => {
    const tick = () => {
      if (active?.expiresAt && Date.now() >= active.expiresAt) dispatch({ type: 'FAIL_QUEST', id: active.id, reason: 'expired' })
      dispatch({ type: 'ROLL_DAILIES', date: dayKey() })
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [active?.id, active?.expiresAt])

  const value = useMemo(() => {
    const activeQuest = state.quests.filter((q) => q.status === 'active').sort((a, b) => b.acceptedAt - a.acceptedAt)[0] ?? null
    const completedQuests = state.quests.filter((q) => q.status === 'completed')
    const history = state.quests
      .filter((q) => q.status === 'completed' || q.status === 'failed')
      .sort((a, b) => (b.completedAt ?? b.failedAt) - (a.completedAt ?? a.failedAt))
    const dailies = (state.daily?.ids ?? []).map((cid) => ({
      ...CATALOG_BY_ID[cid],
      attempt: state.quests.find((q) => q.catalogId === cid && q.date === state.daily.date) ?? null,
    }))

    return {
      profile: state,
      rollsLeft: rollsLeft(state),
      pendingRoll: RANDOM_BY_ID[state.rolls?.pending] ?? null,
      look: resolveLook(state.equipped),
      title: ITEM_BY_ID[state.equipped.title]?.name ?? 'Rookie',
      dailies,
      /** The one quest in progress (solo or group), or null. */
      activeQuest,
      completedQuests,
      /** Completed + failed, newest first (the Done tab). */
      history,
      acceptDaily: (catalogId) => dispatch({ type: 'ACCEPT_DAILY', catalogId }),
      revealRoll: (questId) => dispatch({ type: 'REVEAL_ROLL', questId }),
      reroll: (questId) => dispatch({ type: 'REROLL', questId }),
      acceptRoll: () => dispatch({ type: 'ACCEPT_ROLL' }),
      markPosted: (id) => dispatch({ type: 'MARK_POSTED', id }),
      /** payload: { id, quest, members, partyId, acceptedAt } */
      addGroupQuest: (payload) => dispatch({ type: 'ADD_GROUP_QUEST', payload }),
      /** proof: { name, type, size, kind, sample, url? } — metadata only; solo files stay on the device. */
      completeQuest: (id, proof) => dispatch({ type: 'COMPLETE_QUEST', id, proof }),
      failQuest: (id, reason = 'expired') => dispatch({ type: 'FAIL_QUEST', id, reason }),
      setPartyProofs: (id, proofs) => dispatch({ type: 'SET_PARTY_PROOFS', id, proofs }),
      equip: (itemId) => dispatch({ type: 'EQUIP', itemId }),
      buyItem: (itemId) => dispatch({ type: 'BUY_ITEM', itemId }),
      updateProfile: (patch) => dispatch({ type: 'UPDATE_PROFILE', patch }),
      dismissReward: () => dispatch({ type: 'DISMISS_REWARD' }),
      dismissAccepted: () => dispatch({ type: 'DISMISS_ACCEPTED' }),
      dismissFailure: () => dispatch({ type: 'DISMISS_FAILURE' }),
      resetProfile: () => dispatch({ type: 'RESET' }),
    }
  }, [state])

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>')
  return ctx
}
