import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { MAX_PARTY_SIZE, resolveLook } from '../data/seed.js'
import * as api from '../lib/api.js'
import { db } from '../lib/db.js'
import { useSession } from './SessionContext.jsx'
import { useToast } from './ToastContext.jsx'
import { useUser } from './UserContext.jsx'
import { Users, X } from 'lucide-react'

const OnlineContext = createContext(null)

const SEARCH_MS = 2200 // "Searching for group quest…" animation
const POLL_MS = 15000 // safety net in case Realtime isn't enabled
const HEARTBEAT_MS = 60000
const rand = (min, max) => min + Math.random() * (max - min)

export const partyQuestId = (party) => `party-${party.id}-${party.current_quest?.round}`

/** "Online", "In a lobby", "Last seen 5m ago"… for a profile row. */
export function presence(p) {
  if (!p) return { label: '', dot: 'bg-surface-3', online: false }
  if (p.is_bot) return { label: 'Sample player', dot: 'bg-blue', online: true }
  const mins = Math.floor((Date.now() - Date.parse(p.updated_at)) / 60000)
  if (mins >= 3) {
    const ago = mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`
    return { label: `Last seen ${ago} ago`, dot: 'bg-surface-3', online: false }
  }
  return {
    online: { label: 'Online', dot: 'bg-neon', online: true },
    in_lobby: { label: 'In a lobby', dot: 'bg-gold', online: true },
    in_quest: { label: 'On a quest', dot: 'bg-pink', online: true },
  }[p.status] ?? { label: 'Online', dot: 'bg-neon', online: true }
}

export function OnlineProvider({ children }) {
  const { session, mode } = useSession()
  const me = session.userId
  const user = useUser()
  const toast = useToast()
  const [raw, setRaw] = useState(null)
  const [error, setError] = useState(null)
  const [searching, setSearching] = useState(false)
  const [autoQueue, setAutoQueue] = useState(false)
  const [hiddenVoteRound, setHiddenVoteRound] = useState(null)
  const [optimistic, setOptimistic] = useState({}) // `${postId}:${kind}` → reacted?

  /* ---------------- loading + realtime ---------------- */

  const seq = useRef(0)
  const refresh = useCallback(async () => {
    const n = ++seq.current
    try {
      const data = await api.loadSocial(me)
      if (n === seq.current) { setRaw(data); setError(null) }
    } catch (e) {
      if (n === seq.current) setError(e.message)
    }
  }, [me])

  useEffect(() => {
    refresh()
    let t
    const unsubscribe = db.subscribe(() => { clearTimeout(t); t = setTimeout(refresh, 120) })
    const poll = setInterval(refresh, POLL_MS)
    return () => { clearTimeout(t); clearInterval(poll); unsubscribe() }
  }, [refresh])

  /* ---------------- derived view of the data ---------------- */

  const derived = useMemo(() => {
    if (!raw) return null
    const profilesById = Object.fromEntries(raw.profiles.map((p) => [p.id, p]))
    const other = (f) => (f.user_id === me ? f.friend_id : f.user_id)
    const withProfile = (f) => ({ ...f, profile: profilesById[other(f)] })
    const friends = raw.friendships.filter((f) => f.status === 'accepted').map(withProfile).filter((f) => f.profile)
    const incoming = raw.friendships.filter((f) => f.status === 'pending' && f.friend_id === me).map(withProfile).filter((f) => f.profile)
    const outgoing = raw.friendships.filter((f) => f.status === 'pending' && f.user_id === me).map(withProfile).filter((f) => f.profile)

    const memberView = (m) => ({ ...m, profile: profilesById[m.user_id], look: api.parseAvatar(profilesById[m.user_id]?.avatar).look })
    let party = null
    if (raw.party) {
      const members = raw.members.map(memberView).filter((m) => m.profile)
      members.sort((a, b) => (b.user_id === raw.party.leader_id) - (a.user_id === raw.party.leader_id))
      party = { ...raw.party, members }
    }
    const lobbies = raw.lobbies.map((p) => ({
      ...p,
      members: raw.lobbyMembers.filter((m) => m.party_id === p.id).map(memberView).filter((m) => m.profile)
        .sort((a, b) => (b.user_id === p.leader_id) - (a.user_id === p.leader_id)),
    }))
    return { profilesById, friends, incoming, outgoing, party, lobbies, meProfile: profilesById[me] ?? null }
  }, [raw, me])

  const party = derived?.party ?? null
  // Latest values for async handlers and timers (updated before other effects run).
  const latest = useRef({})
  const quests = user.profile.quests
  useLayoutEffect(() => { latest.current = { party, derived, quests } }, [party, derived, quests])

  /* ---------------- actions ---------------- */

  const selfAction = useRef(false) // suppresses "you were added/removed" toasts for our own actions

  const run = useCallback(async (fn) => {
    try {
      const out = await fn()
      await refresh()
      return out
    } catch (e) {
      toast(e.message || 'Something went wrong', { tone: 'pink', icon: X })
      await refresh()
      return undefined
    }
  }, [refresh, toast])

  const ensureParty = useCallback(async () => {
    const p = latest.current.party
    if (p) return p.id
    selfAction.current = true
    return (await api.createParty(me)).id
  }, [me])

  const leaveCurrent = useCallback(async () => {
    const { party: p, derived: d } = latest.current
    if (!p) return
    selfAction.current = true
    await api.leaveParty(p, p.members, d.profilesById, me)
  }, [me])

  /* ---------------- feed publishing ---------------- */

  const markPosted = user.markPosted
  const partySnapshot = useCallback(() =>
    latest.current.party?.members.map((m) => ({ id: m.user_id, name: m.profile.username, look: m.look })) ?? null, [])

  /** Share a completed quest to the friend feed (idempotent per author + quest). */
  const publish = useCallback(async (authorId, quest, { proofUrl = null, tag = null, party: snap = null } = {}) => {
    const type = quest.type ?? (quest.group ? 'group' : 'daily')
    const rows = await api.postToFeed(authorId, {
      ref: quest.id,
      title: quest.title,
      type,
      category: quest.category,
      proofUrl,
      tag: type === 'group' ? tag : null,
      durationSeconds: quest.acceptedAt ? Math.max(1, Math.round((Date.now() - quest.acceptedAt) / 1000)) : null,
      party: type === 'group' ? snap : null,
    })
    return rows?.[0] ?? null
  }, [])

  /** Sample users react to your new post a few seconds later, so the feed feels social while testing. */
  const cheerFromBots = useCallback((postId) => {
    const bots = Object.values(latest.current.derived?.profilesById ?? {}).filter((p) => p.is_bot).sort(() => Math.random() - 0.5).slice(0, 2)
    bots.forEach((b, i) => setTimeout(() => api.toggleReaction(postId, b.id, i ? 'gg' : 'hype').catch(() => {}), 3000 + i * 2500 + Math.random() * 1500))
  }, [])

  const actions = useMemo(() => ({
    refresh,
    searchUsers: (q) => api.searchProfiles(q, me),
    seedSampleUsers: () => run(api.seedSampleUsers),
    sendFriendRequest: (target) => run(() => api.sendFriendRequest(me, target)),
    acceptFriend: (id) => run(() => api.acceptFriendRequest(id)),
    removeFriendship: (id) => run(() => api.removeFriendship(id)),

    invite: (userId) => run(async () => api.addMember(await ensureParty(), userId)),
    join: (lobby) => run(async () => { await leaveCurrent(); selfAction.current = true; await api.joinParty(lobby.id, me) }),
    leave: () => run(leaveCurrent),
    kick: (userId) => run(() => api.kickMember(latest.current.party.id, userId)),
    setReady: (isReady) => run(() => api.setReady(latest.current.party.id, me, isReady)),
    setBots: (on) => run(async () => {
      const pid = await ensureParty()
      const p = latest.current.party
      if (on) {
        const count = Math.min(2, MAX_PARTY_SIZE - (p?.members.length ?? 1))
        if (count <= 0) throw new Error('Party is full')
        await api.addBots(pid, count)
      } else {
        await api.removeBots(pid, (p?.members ?? []).filter((m) => m.profile.is_bot).map((m) => m.user_id))
      }
    }),

    /** Leader: search, then pop a quest for the party to vote on. */
    startQueue: async () => {
      setSearching(true)
      await new Promise((r) => setTimeout(r, SEARCH_MS))
      await run(() => api.startVote(latest.current.party.id))
      setSearching(false)
    },
    /** Solo: bring in simulated teammates, then queue once they're ready. */
    findGroupSolo: async () => {
      setSearching(true)
      setAutoQueue(true)
      const ok = await run(async () => {
        const pid = await ensureParty()
        await api.addBots(pid, 2)
        return true
      })
      if (!ok) { setSearching(false); setAutoQueue(false) }
    },
    vote: (v) => run(() => api.castVote(latest.current.party.id, me, v)),

    /**
     * After a quest is completed locally: upload the proof (if a real file), sync group completion
     * (for everyone when mode is 'together'), and post it to the friend feed.
     */
    completeWithProof: ({ quest, mode = null, file = null, sampleName = null }) => run(async () => {
      let url = sampleName ? `sample:${sampleName}` : null
      if (file) {
        try { url = await api.uploadProof(quest.partyId ?? 'solo', me, file) } catch (e) {
          toast(`Upload failed (${e.message}) — completed without the photo`, { tone: 'pink', icon: X })
        }
      }
      if (quest.partyId) await api.submitGroupCompletion(quest.partyId, me, mode, url ?? `local:${file?.name ?? 'proof'}`)
      const post = await publish(me, quest, { proofUrl: url, tag: mode, party: partySnapshot() })
      markPosted(quest.id)
      if (post) cheerFromBots(post.id)
      return url
    }),

    /** Tap-to-toggle 🔥 / 👏 / 👀 on a feed post (optimistic, then synced). */
    toggleReaction: async (post, kind) => {
      const key = `${post.id}:${kind}`
      setOptimistic((o) => ({ ...o, [key]: !post.mine[kind] }))
      try { await api.toggleReaction(post.id, me, kind) } catch (e) { toast(e.message, { tone: 'pink', icon: X }) }
      await refresh()
      setOptimistic((o) => { const { [key]: _, ...rest } = o; return rest })
    },
  }), [refresh, run, me, ensureParty, leaveCurrent, toast, publish, partySnapshot, markPosted, cheerFromBots])

  /* ---------------- seed the sample feed once, so it's alive on first load ---------------- */

  const seededFeed = useRef(false)
  useEffect(() => {
    if (!raw || seededFeed.current) return
    seededFeed.current = true
    const botIds = new Set(raw.profiles.filter((p) => p.is_bot).map((p) => p.id))
    if (!raw.feed.some((p) => botIds.has(p.user_id))) api.seedSampleFeed().then(refresh).catch(() => {})
  }, [raw, refresh])

  /* ---------------- solo auto-queue once bots are ready ---------------- */

  useEffect(() => {
    if (!autoQueue || !party || party.status !== 'lobby' || party.leader_id !== me) return
    if (party.members.length < 2 || !party.members.every((m) => m.user_id === me || m.is_ready)) return
    setAutoQueue(false)
    actions.startQueue()
  }, [autoQueue, party, me, actions])

  /* ---------------- party → local quest sync (every device) ---------------- */

  const addGroupQuest = user.addGroupQuest
  const completeQuest = user.completeQuest
  const setPartyProofs = user.setPartyProofs
  useEffect(() => {
    if (!party?.current_quest || party.status === 'lobby' || party.status === 'voting') return
    const id = partyQuestId(party)
    const local = latest.current.quests.find((q) => q.id === id)
    if (!local && party.status === 'active_quest') {
      addGroupQuest({
        id,
        partyId: party.id,
        quest: party.current_quest,
        // Everyone's timer counts down from the moment the party accepted.
        acceptedAt: Date.parse(party.current_quest.acceptedAt) || Date.now(),
        members: party.members.filter((m) => m.user_id !== me).map((m) => ({ id: m.user_id, name: m.profile.username, look: m.look })),
      })
      return
    }
    // Keep a copy of everyone's proof on the local quest, for the Done tab (the party row is reset later).
    if (local) {
      const proofs = party.members.map((m) => ({
        id: m.user_id,
        name: m.user_id === me ? 'You' : m.profile.username,
        look: m.look,
        url: m.proof_url?.startsWith('failed:') ? null : m.proof_url,
        failed: !!m.proof_url?.startsWith('failed:'),
      }))
      if (JSON.stringify(proofs) !== JSON.stringify(local.partyProofs ?? null)) setPartyProofs(id, proofs)
    }
    // A teammate submitted proof "together" → finish it here too.
    const mine = party.members.find((m) => m.user_id === me)
    if (mine?.has_completed && local?.status === 'active') {
      const url = mine.proof_url ?? ''
      completeQuest(id, { name: url.startsWith('sample:') ? url.slice(7) : 'Team proof', kind: 'photo', url, shared: true })
      toast('A teammate submitted proof for the whole party!', { tone: 'blue', icon: Users })
      publish(me, local, { proofUrl: mine.proof_url, tag: 'together', party: partySnapshot() })
        .then(() => markPosted(id)).catch(() => {})
    }
  }, [party, me, addGroupQuest, completeQuest, setPartyProofs, toast, publish, partySnapshot, markPosted])

  /* ---------------- group quest failed on this device → free the party ---------------- */

  const failure = user.profile.lastFailure
  const reportedFailure = useRef(null)
  useEffect(() => {
    if (!failure?.group || reportedFailure.current === failure.id) return
    reportedFailure.current = failure.id
    // Counts as "done" for the party (marked failed) so teammates can still finish.
    api.submitGroupCompletion(failure.partyId, me, 'separate', `failed:${failure.reason}`).then(refresh).catch(() => {})
  }, [failure, me, refresh])

  /* ---------------- join / kick notifications ---------------- */

  const prevPartyId = useRef(undefined)
  useEffect(() => {
    if (!raw) return
    const id = party?.id ?? null
    if (prevPartyId.current !== undefined && prevPartyId.current !== id && !selfAction.current) {
      if (id && party.leader_id !== me) {
        const leader = party.members.find((m) => m.user_id === party.leader_id)
        toast(`${leader?.profile.username ?? 'A friend'} pulled you into their party!`, { tone: 'neon', icon: Users })
      } else if (!id && prevPartyId.current) {
        toast('You were removed from the party', { tone: 'pink', icon: X })
      }
    }
    prevPartyId.current = id
    selfAction.current = false
  }, [raw, party, me, toast])

  /* ---------------- leader automation: votes, completion, bots ---------------- */

  const scheduled = useRef(new Map())
  useEffect(() => () => scheduled.current.forEach(clearTimeout), [])
  const schedule = useCallback((key, delay, fn) => {
    if (scheduled.current.has(key)) return
    scheduled.current.set(key, setTimeout(async () => {
      scheduled.current.delete(key)
      try { await fn() } catch { /* next refresh retries */ }
    }, delay))
  }, [])

  useEffect(() => {
    if (!party || party.leader_id !== me) return
    const ids = party.members.map((m) => m.user_id)
    const round = party.current_quest?.round

    if (party.status === 'voting' && ids.every((id) => party.votes?.[id])) {
      schedule(`resolve:${round}`, 600, () => api.resolveVote(party, ids))
    }
    if (party.status === 'active_quest' && party.members.every((m) => m.has_completed)) {
      schedule(`complete:${round}`, 800, () => api.markCompleted(party.id))
    }
    if (party.status === 'completed') {
      schedule(`reset:${round}`, 4000, () => api.resetToLobby(party.id, me))
    }

    // Bots: the leader's device plays for any bot in the party.
    party.members.filter((m) => m.profile.is_bot).forEach((bot, i) => {
      const fresh = () => latest.current.party
      if (party.status === 'lobby' && !bot.is_ready) {
        schedule(`ready:${bot.user_id}`, rand(700, 1600), () => fresh() && api.setReady(party.id, bot.user_id, true))
      }
      if (party.status === 'voting' && !party.votes?.[bot.user_id]) {
        // The first bot sometimes asks for a reroll on the first pop, to show off voting.
        const v = i === 0 && party.rerolls_used === 0 && Math.random() < 0.35 ? 'reroll' : 'accept'
        schedule(`vote:${bot.user_id}:${round}`, rand(900, 2200), () => fresh()?.status === 'voting' && api.castVote(party.id, bot.user_id, v))
      }
      if (party.status === 'active_quest' && !bot.has_completed) {
        schedule(`done:${bot.user_id}:${round}`, rand(5000, 9000), async () => {
          const p = fresh()
          const m = p?.members.find((x) => x.user_id === bot.user_id)
          if (p?.status === 'active_quest' && m && !m.has_completed) {
            await api.submitGroupCompletion(party.id, bot.user_id, 'separate', 'sample:bot-proof.jpg')
            // Teammates post their completions too.
            const q = p.current_quest
            await publish(bot.user_id, { id: partyQuestId(p), title: q.title, type: 'group', category: q.category, acceptedAt: Date.parse(q.acceptedAt) },
              { proofUrl: 'sample:bot-proof.jpg', tag: 'separate', party: partySnapshot() })
          }
        })
      }
    })
  }, [party, me, schedule, publish, partySnapshot])

  /* ---------------- profile sync: local stats → profiles row ---------------- */

  const { username, level, xp, coins, streak, equipped } = user.profile
  const meProfile = derived?.meProfile
  const updateLocalProfile = user.updateProfile
  useEffect(() => {
    if (!meProfile) return
    const avatar = api.encodeAvatar(resolveLook(equipped), equipped)
    const want = { username, level, xp, coins, streak, avatar }
    const patch = Object.fromEntries(Object.entries(want).filter(([k, v]) => meProfile[k] !== v))
    if (!Object.keys(patch).length) return
    const t = setTimeout(() => {
      api.updateProfile(me, patch).catch((e) => {
        if (e.code === '23505') {
          toast(`The name "${username}" is taken`, { tone: 'pink', icon: X })
          updateLocalProfile({ username: meProfile.username })
        }
      })
    }, 800)
    return () => clearTimeout(t)
  }, [username, level, xp, coins, streak, equipped, meProfile, me, toast, updateLocalProfile])

  /* ---------------- presence status + heartbeat ---------------- */

  const localQuestActive = party?.current_quest
    ? user.profile.quests.some((q) => q.id === partyQuestId(party) && q.status === 'active')
    : false
  const status = !party || party.members.length < 2 ? 'online'
    : party.status === 'active_quest' && localQuestActive ? 'in_quest' : 'in_lobby'
  useEffect(() => {
    if (meProfile && meProfile.status !== status) api.updateProfile(me, { status }).catch(() => {})
  }, [status, meProfile, me])
  useEffect(() => {
    const iv = setInterval(() => api.updateProfile(me, { status }).catch(() => {}), HEARTBEAT_MS)
    return () => clearInterval(iv)
  }, [me, status])

  /* ---------------- context value ---------------- */

  const value = useMemo(() => {
    const d = derived
    const friends = d?.friends ?? []
    const meRow = { id: me, username: user.profile.username, level: user.profile.level, xp: user.profile.xp, look: user.look, me: true }
    const leaderboard = [
      ...friends.map((f) => ({ id: f.profile.id, username: f.profile.username, level: f.profile.level, xp: f.profile.xp, look: api.parseAvatar(f.profile.avatar).look, bot: f.profile.is_bot })),
      meRow,
    ].sort((a, b) => b.level - a.level || b.xp - a.xp)
    const feed = (raw?.feed ?? []).map((post) => {
      const author = d?.profilesById[post.user_id]
      const counts = {}
      const mine = {}
      for (const r of ['hype', 'gg', 'sus']) {
        const list = post.reactions?.[r] ?? []
        const opt = optimistic[`${post.id}:${r}`]
        mine[r] = opt ?? list.includes(me)
        counts[r] = list.length + (opt === undefined ? 0 : opt === list.includes(me) ? 0 : opt ? 1 : -1)
      }
      return { ...post, author, counts, mine, isMine: post.user_id === me }
    }).filter((p) => p.author)
    const relation = (id) =>
      friends.some((f) => f.profile.id === id) ? 'friend'
        : d?.incoming.some((f) => f.profile.id === id) ? 'incoming'
          : d?.outgoing.some((f) => f.profile.id === id) ? 'outgoing' : null

    return {
      mode,
      me,
      loaded: !!d,
      error,
      friends,
      incoming: d?.incoming ?? [],
      outgoing: d?.outgoing ?? [],
      relation,
      party,
      isLeader: !party || party.leader_id === me,
      inParty: !!party && party.members.length > 1,
      partyLeader: party?.members.find((m) => m.user_id === party.leader_id) ?? null,
      myMember: party?.members.find((m) => m.user_id === me) ?? null,
      hasBots: !!party?.members.some((m) => m.profile.is_bot),
      lobbies: d?.lobbies ?? [],
      leaderboard,
      feed,
      profilesById: d?.profilesById ?? {},
      rank: leaderboard.findIndex((p) => p.me) + 1,
      searching,
      hiddenVoteRound,
      hideVote: setHiddenVoteRound,
      showVote: () => setHiddenVoteRound(null),
      ...actions,
    }
  }, [derived, raw, optimistic, error, party, searching, hiddenVoteRound, actions, mode, me, user.profile.username, user.profile.level, user.profile.xp, user.look])

  return <OnlineContext.Provider value={value}>{children}</OnlineContext.Provider>
}

export function useOnline() {
  const ctx = useContext(OnlineContext)
  if (!ctx) throw new Error('useOnline must be used inside <OnlineProvider>')
  return ctx
}
