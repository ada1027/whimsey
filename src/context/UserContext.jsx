import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import {
  coinsFor, DEFAULT_PROFILE, DIFFICULTY, ITEM_BY_ID, isOwned, MAX_PARTY_SIZE, PARTY_BONUS, playerSnapshot, resolveLook, SOLO_PARTY,
} from '../data/seed.js'

const UserContext = createContext(null)
const KEY = 'whimsey:profile:v2'

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
      const { quest: t, members } = action.match
      const baseXp = DIFFICULTY[t.difficulty].xp
      const q = {
        id: `g-${t.key}-${Date.now()}`,
        title: t.title,
        description: t.description,
        category: t.category,
        difficulty: t.difficulty,
        minutes: t.minutes,
        baseXp,
        xp: Math.round(baseXp * (1 + PARTY_BONUS)),
        group: true,
        members: members.map(({ id, name, look }) => ({ id, name, look })),
        status: 'active',
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
    /* ----- party (you are always in it; members excludes you) ----- */
    case 'INVITE_TO_PARTY': {
      const { party } = state
      if (party.leaderId !== 'me' || party.members.length >= MAX_PARTY_SIZE - 1) return state
      if (party.members.some((m) => m.id === action.id)) return state
      const member = playerSnapshot(action.id)
      return member ? { ...state, party: { ...party, members: [...party.members, member] } } : state
    }
    case 'KICK_FROM_PARTY': {
      if (state.party.leaderId !== 'me') return state
      return { ...state, party: { ...state.party, members: state.party.members.filter((m) => m.id !== action.id) } }
    }
    case 'JOIN_LOBBY': {
      const { lobby } = action
      if (lobby.memberIds.length >= MAX_PARTY_SIZE) return state
      return {
        ...state,
        party: { leaderId: lobby.leaderId, members: lobby.memberIds.map(playerSnapshot).filter(Boolean), lobbyId: lobby.id },
      }
    }
    case 'LEAVE_PARTY':
      return { ...state, party: SOLO_PARTY }
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

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const saved = { ...DEFAULT_PROFILE, ...JSON.parse(raw) }
      // Older saves stored the party as an array of friend ids.
      if (!saved.party || Array.isArray(saved.party)) saved.party = SOLO_PARTY
      return saved
    }
  } catch { /* storage unavailable or corrupt */ }
  return DEFAULT_PROFILE
}

export function UserProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  // Persist everything except the transient reward event.
  useEffect(() => {
    const { lastReward: _reward, lastAccepted: _accepted, ...persisted } = state
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

    const activeQuests = by('active').sort((a, b) => (b.acceptedAt ?? 0) - (a.acceptedAt ?? 0))
    const { party } = state

    return {
      profile: state,
      look: resolveLook(state.equipped),
      title: ITEM_BY_ID[state.equipped.title]?.name ?? 'Rookie',
      availableQuests: by('available'),
      activeQuests,
      /** The quest to do right now: the most recently accepted active quest. */
      currentQuest: activeQuests[0] ?? null,
      completedQuests,
      leaderboard,
      rank: leaderboard.findIndex((p) => p.me) + 1,
      party,
      isLeader: party.leaderId === 'me',
      inParty: party.members.length > 0,
      partyLeader: party.leaderId === 'me' ? null : party.members.find((m) => m.id === party.leaderId),
      /** notify: false skips the "Quest accepted" banner (e.g. when we navigate to the quest instead). */
      acceptQuest: (id, { notify = true } = {}) => dispatch({ type: 'ACCEPT_QUEST', id, notify }),
      addGroupQuest: (match) => dispatch({ type: 'ADD_GROUP_QUEST', match }),
      dropQuest: (id) => dispatch({ type: 'DROP_QUEST', id }),
      /** proof: { name, type, size, kind, sample } — metadata only; no file data is stored. */
      completeQuest: (id, proof) => dispatch({ type: 'COMPLETE_QUEST', id, proof }),
      addQuest: (quest) => dispatch({ type: 'ADD_QUEST', quest }),
      equip: (itemId) => dispatch({ type: 'EQUIP', itemId }),
      buyItem: (itemId) => dispatch({ type: 'BUY_ITEM', itemId }),
      addFriend: (name) => dispatch({ type: 'ADD_FRIEND', name }),
      inviteToParty: (id) => dispatch({ type: 'INVITE_TO_PARTY', id }),
      kickFromParty: (id) => dispatch({ type: 'KICK_FROM_PARTY', id }),
      joinLobby: (lobby) => dispatch({ type: 'JOIN_LOBBY', lobby }),
      leaveParty: () => dispatch({ type: 'LEAVE_PARTY' }),
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
