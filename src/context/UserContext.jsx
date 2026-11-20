import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { applyXp } from '../data/progression.js'
import { coinsFor, DEFAULT_PROFILE, DIFFICULTY, ITEM_BY_ID, isOwned, PARTY_BONUS, resolveLook } from '../data/seed.js'

const UserContext = createContext(null)

const setQuest = (state, id, patch) => ({
  ...state,
  quests: state.quests.map((q) => (q.id === id ? { ...q, ...patch } : q)),
})

function reducer(state, action) {
  switch (action.type) {
    case 'ACCEPT_QUEST': {
      const q = state.quests.find((x) => x.id === action.id)
      if (!q || q.status !== 'available') return state
      return {
        ...setQuest(state, action.id, { status: 'active', acceptedAt: Date.now() }),
        // Transient: drives the "Quest accepted" banner (not persisted).
        lastAccepted: action.notify === false ? state.lastAccepted : { id: Date.now(), questId: q.id, title: q.title },
      }
    }
    case 'DROP_QUEST': {
      const q = state.quests.find((x) => x.id === action.id)
      if (!q || q.status !== 'active') return state
      // Custom and group quests have no board slot to return to.
      if (q.custom || q.group) return { ...state, quests: state.quests.filter((x) => x.id !== action.id) }
      return setQuest(state, action.id, { status: 'available', acceptedAt: null })
    }
    case 'COMPLETE_QUEST': {
      const q = state.quests.find((x) => x.id === action.id)
      if (!q || q.status !== 'active') return state
      const { levelsGained, ...next } = applyXp(state, q.xp)
      const coins = coinsFor(q.xp)
      return {
        ...setQuest(state, action.id, { status: 'completed', completedAt: Date.now(), proof: action.proof ?? null }),
        ...next,
        coins: state.coins + coins,
        // Transient: drives the reward overlay (not persisted).
        lastReward: {
          id: Date.now(),
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
    case 'ADD_QUEST': {
      const { title, description = '', category = 'life', difficulty = 'easy', minutes = 5 } = action.quest
      const q = {
        id: crypto.randomUUID?.() ?? String(Date.now()),
        title, description, category, difficulty, minutes,
        xp: DIFFICULTY[difficulty].xp,
        status: 'active',
        custom: true,
        acceptedAt: Date.now(),
        completedAt: null,
        proof: null,
      }
      return { ...state, quests: [q, ...state.quests] }
    }
    case 'ADD_GROUP_QUEST': {
      // Added on every teammate's device when their party accepts a quest (see OnlineContext).
      const { id, quest: t, members, partyId } = action.payload
      if (state.quests.some((q) => q.id === id)) return state
      const baseXp = DIFFICULTY[t.difficulty].xp
      const q = {
        id,
        partyId,
        title: t.title,
        description: t.description,
        category: t.category,
        difficulty: t.difficulty,
        minutes: t.minutes,
        baseXp,
        xp: Math.round(baseXp * (1 + PARTY_BONUS)),
        group: true,
        members,
        status: 'active',
        acceptedAt: Date.now(),
        completedAt: null,
        proof: null,
      }
      return {
        ...state,
        quests: [q, ...state.quests],
        lastAccepted: { id: Date.now(), questId: id, title: t.title },
      }
    }
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
    case 'RESET':
      return { ...DEFAULT_PROFILE }
    default:
      return state
  }
}

function load(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw) {
      // Party and friends used to live here; they're now synced via OnlineContext.
      const { friends: _f, party: _p, ...saved } = JSON.parse(raw)
      return { ...DEFAULT_PROFILE, ...saved }
    }
  } catch { /* storage unavailable or corrupt */ }
  return DEFAULT_PROFILE
}

/** Local progress (quests, locker, XP). Each adventurer gets their own storageKey. */
export function UserProvider({ storageKey, children }) {
  const [state, dispatch] = useReducer(reducer, storageKey, load)

  // Persist everything except the transient reward event.
  useEffect(() => {
    const { lastReward: _reward, lastAccepted: _accepted, ...persisted } = state
    try { localStorage.setItem(storageKey, JSON.stringify(persisted)) } catch { /* ignore */ }
  }, [state, storageKey])

  const value = useMemo(() => {
    const by = (s) => state.quests.filter((q) => q.status === s)
    const completedQuests = by('completed').sort((a, b) => b.completedAt - a.completedAt)

    const activeQuests = by('active').sort((a, b) => (b.acceptedAt ?? 0) - (a.acceptedAt ?? 0))

    return {
      profile: state,
      look: resolveLook(state.equipped),
      title: ITEM_BY_ID[state.equipped.title]?.name ?? 'Rookie',
      availableQuests: by('available'),
      activeQuests,
      /** The quest to do right now: the most recently accepted active quest. */
      currentQuest: activeQuests[0] ?? null,
      completedQuests,
      /** notify: false skips the "Quest accepted" banner (e.g. when we navigate to the quest instead). */
      acceptQuest: (id, { notify = true } = {}) => dispatch({ type: 'ACCEPT_QUEST', id, notify }),
      /** payload: { id, quest, members, partyId } */
      addGroupQuest: (payload) => dispatch({ type: 'ADD_GROUP_QUEST', payload }),
      dropQuest: (id) => dispatch({ type: 'DROP_QUEST', id }),
      /** proof: { name, type, size, kind, sample } — metadata only; no file data is stored. */
      completeQuest: (id, proof) => dispatch({ type: 'COMPLETE_QUEST', id, proof }),
      addQuest: (quest) => dispatch({ type: 'ADD_QUEST', quest }),
      equip: (itemId) => dispatch({ type: 'EQUIP', itemId }),
      buyItem: (itemId) => dispatch({ type: 'BUY_ITEM', itemId }),
      updateProfile: (patch) => dispatch({ type: 'UPDATE_PROFILE', patch }),
      dismissReward: () => dispatch({ type: 'DISMISS_REWARD' }),
      dismissAccepted: () => dispatch({ type: 'DISMISS_ACCEPTED' }),
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
