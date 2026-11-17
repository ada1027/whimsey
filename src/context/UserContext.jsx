import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { coinsFor, DEFAULT_PROFILE, DIFFICULTY, ITEM_BY_ID, isOwned, resolveLook } from '../data/seed.js'

const UserContext = createContext(null)
const KEY = 'whimsey:profile:v2'
const MAX_PARTY = 3

/** XP needed for the next level grows ~25% per level, rounded to 10s. */
const nextMaxXp = (maxXp) => Math.round((maxXp * 1.25) / 10) * 10

/** Add XP and roll over any level-ups. */
function applyXp({ xp, level, maxXp }, amount) {
  xp += amount
  let levelsGained = 0
  while (xp >= maxXp) {
    xp -= maxXp
    level += 1
    maxXp = nextMaxXp(maxXp)
    levelsGained += 1
  }
  return { xp, level, maxXp, levelsGained }
}

const setQuest = (state, id, patch) => ({
  ...state,
  quests: state.quests.map((q) => (q.id === id ? { ...q, ...patch } : q)),
})

function reducer(state, action) {
  switch (action.type) {
    case 'ACCEPT_QUEST': {
      const q = state.quests.find((x) => x.id === action.id)
      if (!q || q.status !== 'available') return state
      return setQuest(state, action.id, { status: 'active', acceptedAt: Date.now() })
    }
    case 'DROP_QUEST': {
      const q = state.quests.find((x) => x.id === action.id)
      if (!q || q.status !== 'active') return state
      // Custom quests have no board slot to return to.
      if (q.custom) return { ...state, quests: state.quests.filter((x) => x.id !== action.id) }
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
    case 'ADD_FRIEND': {
      const palette = ['#7dffc0', '#7cd3ff', '#ff9ccb', '#bba2ff', '#ffd23f']
      const faces = ['classic', 'happy', 'determined']
      const n = state.friends.length
      const friend = {
        id: `f-${Date.now()}`,
        name: action.name,
        level: 1,
        status: 'pending',
        note: 'Friend request sent',
        xpWeek: 0,
        look: { color: palette[n % palette.length], face: faces[n % faces.length], hat: 'none', item: 'bottle' },
      }
      return { ...state, friends: [...state.friends, friend] }
    }
    case 'TOGGLE_PARTY': {
      const inParty = state.party.includes(action.id)
      if (!inParty && state.party.length >= MAX_PARTY) return state
      return { ...state, party: inParty ? state.party.filter((x) => x !== action.id) : [...state.party, action.id] }
    }
    case 'UPDATE_PROFILE':
      return { ...state, ...action.patch }
    case 'DISMISS_REWARD':
      return { ...state, lastReward: null }
    case 'RESET':
      return { ...DEFAULT_PROFILE }
    default:
      return state
  }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULT_PROFILE, ...JSON.parse(raw) }
  } catch { /* storage unavailable or corrupt */ }
  return DEFAULT_PROFILE
}

export function UserProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  // Persist everything except the transient reward event.
  useEffect(() => {
    const { lastReward: _reward, ...persisted } = state
    try { localStorage.setItem(KEY, JSON.stringify(persisted)) } catch { /* ignore */ }
  }, [state])

  const value = useMemo(() => {
    const by = (s) => state.quests.filter((q) => q.status === s)
    const completedQuests = by('completed').sort((a, b) => b.completedAt - a.completedAt)
    const xpWeek = completedQuests.reduce((s, q) => s + q.xp, 0)
    const leaderboard = [
      ...state.friends.filter((f) => f.status !== 'pending'),
      { id: 'me', name: state.username, level: state.level, xpWeek, look: resolveLook(state.equipped), me: true },
    ].sort((a, b) => b.xpWeek - a.xpWeek)

    return {
      profile: state,
      look: resolveLook(state.equipped),
      title: ITEM_BY_ID[state.equipped.title]?.name ?? 'Rookie',
      availableQuests: by('available'),
      activeQuests: by('active').sort((a, b) => (b.acceptedAt ?? 0) - (a.acceptedAt ?? 0)),
      completedQuests,
      leaderboard,
      rank: leaderboard.findIndex((p) => p.me) + 1,
      maxParty: MAX_PARTY,
      acceptQuest: (id) => dispatch({ type: 'ACCEPT_QUEST', id }),
      dropQuest: (id) => dispatch({ type: 'DROP_QUEST', id }),
      /** proof: { name, type, size, kind, sample } — metadata only; no file data is stored. */
      completeQuest: (id, proof) => dispatch({ type: 'COMPLETE_QUEST', id, proof }),
      addQuest: (quest) => dispatch({ type: 'ADD_QUEST', quest }),
      equip: (itemId) => dispatch({ type: 'EQUIP', itemId }),
      buyItem: (itemId) => dispatch({ type: 'BUY_ITEM', itemId }),
      addFriend: (name) => dispatch({ type: 'ADD_FRIEND', name }),
      toggleParty: (id) => dispatch({ type: 'TOGGLE_PARTY', id }),
      updateProfile: (patch) => dispatch({ type: 'UPDATE_PROFILE', patch }),
      dismissReward: () => dispatch({ type: 'DISMISS_REWARD' }),
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
