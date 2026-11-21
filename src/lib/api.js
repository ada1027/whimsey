// Game-level operations on top of db.js (works the same in Supabase and local mode).
import { BOT_NAMES, GROUP_QUESTS, MAX_PARTY_SIZE, MAX_REROLLS, SAMPLE_FEED, SAMPLE_USERS } from '../data/seed.js'
import { fallbackCompanionName, normalizeLook } from '../data/companion.js'
import { db } from './db.js'

const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`)

/* ---------- missing-table fallback ----------
 * If quest_feed / notifications (or their RPCs) don't exist yet in Supabase — i.e. supabase_schema.sql
 * hasn't been (re)run — PostgREST answers 404 (PGRST205 / PGRST202). Instead of crashing or showing an
 * empty UI we fall back to seeded demo posts/notifications kept in memory, and flag it so the UI can say
 * "run supabase_schema.sql".
 */
export const isMissingTable = (e) =>
  ['PGRST205', 'PGRST202', '42P01', '42883'].includes(e?.code) ||
  e?.status === 404 ||
  /schema cache|does not exist|could not find the (table|function)/i.test(e?.message ?? '')

const offline = { feed: false, notifications: false }
export const offlineTables = () => ({ ...offline })
let warned = false
function goOffline(kind, e) {
  offline[kind] = true
  if (!warned) {
    warned = true
    console.warn(`[whimsey] Supabase table missing (${e?.code ?? e?.status ?? 'unknown'}). Using demo ${kind} — run supabase_schema.sql in the Supabase SQL Editor to enable it.`)
  }
}

const SEEDED_AT = Date.now()
const localPosts = [] // your own completions while quest_feed is missing
const localReactions = new Map() // postId → { kind: Set(userIds) }
const localRead = new Set()
const sampleId = (name) => `sample-${name}`

/** Read-only stand-ins for the sample users (used only in demo-fallback mode). */
export const fallbackProfiles = () => SAMPLE_USERS.map(({ look, companion, ...u }) => ({
  ...u, id: sampleId(u.username), avatar: encodeAvatar(look, null, companion), status: 'online', is_bot: true,
  created_at: new Date(SEEDED_AT).toISOString(), updated_at: new Date().toISOString(),
}))

function withLocalReactions(post) {
  const extra = localReactions.get(post.id)
  if (!extra) return post
  const reactions = { ...post.reactions }
  for (const [kind, set] of Object.entries(extra)) {
    const base = new Set(reactions[kind] ?? [])
    for (const [uid, on] of set) { if (on) base.add(uid); else base.delete(uid) }
    reactions[kind] = [...base]
  }
  return { ...post, reactions }
}

function fallbackFeed() {
  const samples = SAMPLE_FEED.map((p) => ({
    id: `local-${p.ref}`,
    user_id: sampleId(p.user),
    quest_ref: p.ref,
    quest_title: p.title,
    quest_type: p.type,
    category: p.category,
    proof_url: p.proof,
    completion_tag: p.tag ?? null,
    duration_seconds: p.duration,
    party: p.party ? p.party.map((n) => ({ id: sampleId(n), name: n })) : null,
    reactions: Object.fromEntries(Object.entries(p.reactions).map(([k, names]) => [k, names.map(sampleId)])),
    created_at: new Date(SEEDED_AT - p.ago * 60_000).toISOString(),
  }))
  return [...localPosts, ...samples].map(withLocalReactions).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
}

function fallbackNotifications(me) {
  return [
    { id: 'local-n1', user_id: me, actor_id: sampleId('Moonbeam'), type: 'reaction', payload: { kind: 'hype', quest_title: 'Mood Doodle' }, created_at: new Date(SEEDED_AT - 6 * 60_000).toISOString() },
    { id: 'local-n2', user_id: me, actor_id: sampleId('Pixel'), type: 'group_tag', payload: { quest_title: 'Campus Coffee Run', tag: 'together' }, created_at: new Date(SEEDED_AT - 25 * 60_000).toISOString() },
  ].map((n) => ({ ...n, read: localRead.has(n.id) }))
}
const uniq = (xs) => [...new Set(xs)]

/* ---------- avatar encoding ---------- */

/** profiles.avatar stores JSON: { look: { colorway, accessory, outfit }, equipped: { slot: itemId }, name: companion name } */
export const encodeAvatar = (look, equipped, name) =>
  JSON.stringify({ look: { colorway: look.colorway, accessory: look.accessory, outfit: look.outfit ?? 'none' }, equipped, name })

export function parseAvatar(text) {
  let v = null
  try { v = JSON.parse(text) } catch { /* ignore */ }
  return { look: normalizeLook(v?.look), equipped: v?.equipped ?? null, name: v?.name || null }
}

/** Companion look for any profile row, evolved to match their level. */
export const lookOf = (profile) => ({ ...parseAvatar(profile?.avatar).look, level: profile?.level ?? 1 })
export const companionNameOf = (profile) => parseAvatar(profile?.avatar).name || fallbackCompanionName(profile?.username)

/* ---------- profiles ---------- */

export async function findProfileByUsername(username) {
  const rows = await db.select('profiles', { ilike: { username: escapeLike(username.trim()) }, limit: 1 })
  return rows[0] ?? null
}

export const getProfile = async (id) => (await db.select('profiles', { eq: { id } }))[0] ?? null

export const createProfile = async (row) => (await db.insert('profiles', row))[0]

export const updateProfile = (id, patch) => db.update('profiles', patch, { eq: { id } })

/** Recently active human adventurers, for the quick-pick list on the login screen. */
export const listRecentHumans = () =>
  db.select('profiles', { eq: { is_bot: false }, order: ['updated_at', { ascending: false }], limit: 12 })

export async function searchProfiles(query, excludeId) {
  const q = query.trim()
  const rows = await db.select('profiles', {
    ilike: q ? { username: `%${escapeLike(q)}%` } : {},
    order: ['username', { ascending: true }],
    limit: 25,
  })
  return rows.filter((r) => r.id !== excludeId)
}

/** Creates the 8 sample users that are missing. Returns how many were added. */
export async function seedSampleUsers() {
  const existing = await db.select('profiles', { in: { username: SAMPLE_USERS.map((u) => u.username) } })
  const have = new Set(existing.map((p) => p.username.toLowerCase()))
  const missing = SAMPLE_USERS.filter((u) => !have.has(u.username.toLowerCase()))
  if (missing.length) {
    await db.insert('profiles', missing.map(({ look, companion, ...u }) => ({ ...u, avatar: encodeAvatar(look, null, companion), is_bot: true })))
  }
  return missing.length
}

/* ---------- friends ---------- */

export async function sendFriendRequest(me, target) {
  // If they already asked us, accept instead of creating a second row.
  const reverse = (await db.select('friendships', { eq: { user_id: target.id, friend_id: me } }))[0]
  if (reverse) return db.update('friendships', { status: 'accepted' }, { eq: { id: reverse.id } })
  // Sample users / bots have nobody to click "accept", so they accept instantly.
  const [row] = await db.insert('friendships', { user_id: me, friend_id: target.id, status: target.is_bot ? 'accepted' : 'pending' })
  if (row?.status === 'pending') await notify(target.id, me, 'friend_request', { friendship_id: row.id })
  return row
}

export async function acceptFriendRequest(id) {
  const [row] = await db.update('friendships', { status: 'accepted' }, { eq: { id } })
  if (row) await notify(row.user_id, row.friend_id, 'friend_accepted', {})
  return row
}
export const removeFriendship = (id) => db.remove('friendships', { eq: { id } })

/* ---------- loading everything the Social screen needs ---------- */

export async function loadSocial(me) {
  const [mine, theirs, membership] = await Promise.all([
    db.select('friendships', { eq: { user_id: me } }),
    db.select('friendships', { eq: { friend_id: me } }),
    db.select('party_members', { eq: { user_id: me } }),
  ])
  const friendships = [...mine, ...theirs]
  const other = (f) => (f.user_id === me ? f.friend_id : f.user_id)
  const acceptedIds = friendships.filter((f) => f.status === 'accepted').map(other)

  let party = null
  let members = []
  if (membership[0]) {
    party = (await db.select('parties', { eq: { id: membership[0].party_id } }))[0] ?? null
    if (party) members = await db.select('party_members', { eq: { party_id: party.id }, order: ['joined_at', { ascending: true }] })
  }

  // Friends' open lobbies you could join
  let lobbies = acceptedIds.length ? await db.select('parties', { in: { leader_id: acceptedIds }, eq: { status: 'lobby' } }) : []
  lobbies = lobbies.filter((p) => p.id !== party?.id)
  const lobbyMembers = lobbies.length ? await db.select('party_members', { in: { party_id: lobbies.map((p) => p.id) } }) : []

  // Feed: you, accepted friends, your party, and the sample users (so it's never empty while testing)
  const bots = await db.select('profiles', { eq: { is_bot: true }, limit: 60 })
  const authors = uniq([me, ...acceptedIds, ...members.map((m) => m.user_id), ...bots.map((b) => b.id)])
  const feed = await loadFeed(authors, 30)
  const notifications = await loadNotifications(me)

  const ids = uniq([me, ...friendships.map(other), ...members.map((m) => m.user_id), ...lobbyMembers.map((m) => m.user_id),
    ...feed.map((p) => p.user_id), ...notifications.map((n) => n.actor_id).filter(Boolean)])
  const botIds = new Set(bots.map((b) => b.id))
  const profiles = [...bots, ...(await db.select('profiles', { in: { id: ids.filter((id) => !botIds.has(id)) } }))]

  // Demo-fallback mode: make the sample authors resolvable so demo posts/notifications render.
  if (offline.feed || offline.notifications) {
    const have = new Set(profiles.map((p) => p.id))
    profiles.push(...fallbackProfiles().filter((p) => !have.has(p.id)))
  }

  return { friendships, party, members, lobbies, lobbyMembers, profiles, feed, notifications, offline: offlineTables() }
}

/* ---------- parties ---------- */

export async function createParty(me) {
  const party = (await db.insert('parties', { leader_id: me, status: 'lobby', votes: {}, rerolls_used: 0 }))[0]
  await db.insert('party_members', { party_id: party.id, user_id: me, is_ready: true })
  return party
}

async function memberCount(partyId) {
  return (await db.select('party_members', { eq: { party_id: partyId } })).length
}

/** Leader pulls someone into the party. */
export async function addMember(partyId, userId) {
  if ((await memberCount(partyId)) >= MAX_PARTY_SIZE) throw new Error('Party is full')
  try {
    await db.insert('party_members', { party_id: partyId, user_id: userId, is_ready: false })
  } catch (e) {
    if (e.code === '23505') throw new Error('Already in a party', { cause: e })
    throw e
  }
}

export async function joinParty(partyId, me) {
  const party = (await db.select('parties', { eq: { id: partyId } }))[0]
  if (!party) throw new Error('That party has closed')
  if (party.status !== 'lobby') throw new Error('That party is already on a quest')
  if ((await memberCount(partyId)) >= MAX_PARTY_SIZE) throw new Error('That party is full')
  await db.insert('party_members', { party_id: partyId, user_id: me, is_ready: false })
  // Bots never lead: a human joining a bot-hosted lobby takes over as leader.
  const leader = await getProfile(party.leader_id)
  if (leader?.is_bot) {
    await db.update('parties', { leader_id: me }, { eq: { id: partyId } })
    await db.update('party_members', { is_ready: true }, { eq: { party_id: partyId, user_id: me } })
  }
}

/** Leave; if the leader leaves, the next human takes over, or the party closes. */
export async function leaveParty(party, members, profilesById, me) {
  await db.remove('party_members', { eq: { party_id: party.id, user_id: me } })
  if (party.leader_id !== me) return
  const humans = members.filter((m) => m.user_id !== me && !profilesById[m.user_id]?.is_bot)
  if (humans.length) await db.update('parties', { leader_id: humans[0].user_id }, { eq: { id: party.id } })
  else await db.remove('parties', { eq: { id: party.id } })
}

export const kickMember = (partyId, userId) => db.remove('party_members', { eq: { party_id: partyId, user_id: userId } })

export const setReady = (partyId, userId, isReady) =>
  db.update('party_members', { is_ready: isReady }, { eq: { party_id: partyId, user_id: userId } })

/** Adds up to `count` bot teammates, reusing free sample bots and creating new ones if needed. */
export async function addBots(partyId, count) {
  if (count <= 0) return
  const bots = await db.select('profiles', { eq: { is_bot: true } })
  const busy = bots.length ? await db.select('party_members', { in: { user_id: bots.map((b) => b.id) } }) : []
  const busyIds = new Set(busy.map((m) => m.user_id))
  const free = bots.filter((b) => !busyIds.has(b.id)).sort(() => Math.random() - 0.5).slice(0, count)
  const colorways = ['mint', 'sky', 'sakura', 'grape', 'sunset']
  const accessories = ['headphones', 'sprout', 'glasses', 'none']
  const names = [...BOT_NAMES].sort(() => Math.random() - 0.5)
  while (free.length < count) {
    const i = free.length + Math.floor(Math.random() * 100)
    const name = `${names.pop()}-${Math.random().toString(36).slice(2, 5)}`
    const look = { colorway: colorways[i % colorways.length], accessory: accessories[i % accessories.length] }
    free.push(await createProfile({ username: name, avatar: encodeAvatar(look, null), level: 1 + (i % 6), is_bot: true }))
  }
  await db.insert('party_members', free.map((b) => ({ party_id: partyId, user_id: b.id, is_ready: false })))
}

export async function removeBots(partyId, botIds) {
  if (botIds.length) await db.remove('party_members', { eq: { party_id: partyId }, in: { user_id: botIds } })
}

/* ---------- group quest voting ---------- */

function randomQuest(excludeKey) {
  const pool = GROUP_QUESTS.filter((q) => q.key !== excludeKey)
  const q = pool[Math.floor(Math.random() * pool.length)]
  return { ...q, round: crypto.randomUUID?.() ?? String(Date.now()), poppedAt: new Date().toISOString() }
}

export const startVote = (partyId) =>
  db.update('parties', { status: 'voting', current_quest: randomQuest(), votes: {}, rerolls_used: 0 }, { eq: { id: partyId } })

export const castVote = (partyId, me, vote) => db.castVote(partyId, me, vote)

/** Leader resolves a finished vote: majority reroll → new quest (if rerolls left), otherwise start it. */
export async function resolveVote(party, memberIds) {
  const votes = memberIds.map((id) => party.votes?.[id])
  const rerolls = votes.filter((v) => v === 'reroll').length
  const accepts = votes.filter((v) => v === 'accept').length
  if (rerolls > accepts && party.rerolls_used < MAX_REROLLS) {
    return db.update('parties',
      { current_quest: randomQuest(party.current_quest?.key), votes: {}, rerolls_used: party.rerolls_used + 1 },
      { eq: { id: party.id } })
  }
  await db.update('party_members', { has_completed: false, completion_mode: null, proof_url: null }, { eq: { party_id: party.id } })
  return db.update('parties',
    { status: 'active_quest', current_quest: { ...party.current_quest, acceptedAt: new Date().toISOString() } },
    { eq: { id: party.id } })
}

/* ---------- completion + proof ---------- */

/** Uploads a proof file to the quest-proofs bucket under `folder/` and returns its URL. */
export async function uploadProof(folder, me, file) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  return db.upload(`${folder}/${me}-${Date.now()}.${ext}`, file)
}

/** mode 'together' completes the quest for the whole party with one proof; 'separate' only for you. */
export function submitGroupCompletion(partyId, me, mode, proofUrl) {
  const patch = { has_completed: true, completion_mode: mode, proof_url: proofUrl }
  return mode === 'together'
    ? db.update('party_members', patch, { eq: { party_id: partyId } })
    : db.update('party_members', patch, { eq: { party_id: partyId, user_id: me } })
}

export const markCompleted = (partyId) => db.update('parties', { status: 'completed' }, { eq: { id: partyId } })

export async function resetToLobby(partyId, leaderId) {
  await db.update('party_members', { is_ready: false, has_completed: false, completion_mode: null, proof_url: null }, { eq: { party_id: partyId } })
  await db.update('party_members', { is_ready: true }, { eq: { party_id: partyId, user_id: leaderId } })
  return db.update('parties', { status: 'lobby', current_quest: null, votes: {}, rerolls_used: 0 }, { eq: { id: partyId } })
}

/* ---------- friend activity feed ---------- */

/**
 * Shares a completed quest. `ref` (the local quest id) makes posting idempotent per user.
 * post: { ref, title, type: 'daily'|'random'|'group', category, proofUrl, tag, durationSeconds, party }
 */
export async function postToFeed(userId, post) {
  const row = {
    user_id: userId,
    quest_ref: post.ref,
    quest_title: post.title,
    quest_type: post.type,
    category: post.category ?? null,
    proof_url: post.proofUrl ?? null,
    completion_tag: post.tag ?? null,
    duration_seconds: post.durationSeconds ?? null,
    party: post.party ?? null,
    reactions: {},
  }
  try {
    return await db.insertIgnore('quest_feed', row, 'user_id,quest_ref')
  } catch (e) {
    if (!isMissingTable(e)) throw e
    goOffline('feed', e)
    if (localPosts.some((p) => p.user_id === userId && p.quest_ref === row.quest_ref)) return []
    const local = { ...row, id: `local-own-${Date.now()}`, created_at: new Date().toISOString() }
    localPosts.unshift(local)
    return [local]
  }
}

/** Latest posts from the given authors, newest first (demo posts if quest_feed is missing). */
export async function loadFeed(authorIds, limit = 30) {
  if (!authorIds.length) return []
  try {
    const rows = await db.select('quest_feed', { in: { user_id: authorIds }, order: ['created_at', { ascending: false }], limit })
    offline.feed = false
    return rows
  } catch (e) {
    if (!isMissingTable(e)) throw e
    goOffline('feed', e)
    return fallbackFeed().slice(0, limit)
  }
}

export async function toggleReaction(postId, userId, kind) {
  const toggleLocal = () => {
    const entry = localReactions.get(postId) ?? {}
    const set = entry[kind] ?? new Map()
    const current = fallbackFeed().find((p) => p.id === postId)?.reactions?.[kind]?.includes(userId)
    set.set(userId, !current)
    localReactions.set(postId, { ...entry, [kind]: set })
  }
  if (String(postId).startsWith('local-')) return toggleLocal()
  try {
    await db.toggleReaction(postId, userId, kind)
  } catch (e) {
    if (!isMissingTable(e)) throw e
    goOffline('feed', e)
    toggleLocal()
  }
}

/** Makes sure the sample users exist and have a few posts, so the feed isn't empty on first load. */
export async function seedSampleFeed() {
  try {
    return await seedSampleFeedRows()
  } catch (e) {
    if (!isMissingTable(e)) throw e
    goOffline('feed', e)
    return 0
  }
}

async function seedSampleFeedRows() {
  await seedSampleUsers()
  const users = await db.select('profiles', { in: { username: SAMPLE_USERS.map((u) => u.username) } })
  const idOf = Object.fromEntries(users.map((u) => [u.username, u.id]))
  const existing = await db.select('quest_feed', { in: { user_id: users.map((u) => u.id) }, limit: 1 })
  if (existing.length) return 0
  const rows = SAMPLE_FEED.filter((p) => idOf[p.user]).map((p) => ({
    user_id: idOf[p.user],
    quest_ref: p.ref,
    quest_title: p.title,
    quest_type: p.type,
    category: p.category,
    proof_url: p.proof,
    completion_tag: p.tag ?? null,
    duration_seconds: p.duration,
    party: p.party ? p.party.map((n) => ({ id: idOf[n], name: n })) : null,
    reactions: Object.fromEntries(Object.entries(p.reactions).map(([k, names]) => [k, names.map((n) => idOf[n]).filter(Boolean)])),
    created_at: new Date(Date.now() - p.ago * 60_000).toISOString(),
  }))
  return (await db.insertIgnore('quest_feed', rows, 'user_id,quest_ref')).length
}

/** All of one adventurer's posts, for their profile grid (demo posts if quest_feed is missing). */
export async function loadUserPosts(userId, limit = 60) {
  try {
    return await db.select('quest_feed', { eq: { user_id: userId }, order: ['created_at', { ascending: false }], limit })
  } catch (e) {
    if (!isMissingTable(e)) throw e
    goOffline('feed', e)
    return fallbackFeed().filter((p) => p.user_id === userId).slice(0, limit)
  }
}

/* ---------- notifications ---------- */

/**
 * type: 'reaction' | 'group_tag' | 'friend_request' | 'friend_accepted' | 'party_invite'
 * payload examples: { kind, quest_title, post_id } · { quest_title } · { friendship_id } · { party_id }
 */
export async function notify(userId, actorId, type, payload = {}) {
  if (!userId || userId === actorId || String(userId).startsWith('sample-') || String(actorId).startsWith('sample-')) return null
  try {
    return await db.insert('notifications', { user_id: userId, actor_id: actorId, type, payload, read: false })
  } catch (e) {
    if (!isMissingTable(e)) throw e
    goOffline('notifications', e)
    return null
  }
}

export async function loadNotifications(me) {
  try {
    const rows = await db.select('notifications', { eq: { user_id: me }, order: ['created_at', { ascending: false }], limit: 40 })
    offline.notifications = false
    return rows
  } catch (e) {
    if (!isMissingTable(e)) throw e
    goOffline('notifications', e)
    return fallbackNotifications(me)
  }
}

export async function markAllNotificationsRead(me) {
  if (offline.notifications) {
    fallbackNotifications(me).forEach((n) => localRead.add(n.id))
    return
  }
  try {
    await db.update('notifications', { read: true }, { eq: { user_id: me, read: false } })
  } catch (e) {
    if (!isMissingTable(e)) throw e
    goOffline('notifications', e)
    fallbackNotifications(me).forEach((n) => localRead.add(n.id))
  }
}

/**
 * First-run sample inbox: a reaction, a "Done Together" tag, a real friend request you can accept,
 * and a party invite into a sample lobby you can join.
 */
export async function seedSampleNotifications(me) {
  if (offline.notifications) return 0
  try {
    return await seedSampleNotificationRows(me)
  } catch (e) {
    if (!isMissingTable(e)) throw e
    goOffline('notifications', e)
    return 0
  }
}

async function seedSampleNotificationRows(me) {
  if ((await db.select('notifications', { eq: { user_id: me }, limit: 1 })).length) return 0
  await seedSampleUsers()
  const users = await db.select('profiles', { in: { username: ['Moonbeam', 'Pixel', 'Juniper', 'Bolt'] } })
  const u = Object.fromEntries(users.map((x) => [x.username, x]))
  const ago = (m) => new Date(Date.now() - m * 60_000).toISOString()
  const rows = []

  if (u.Bolt) {
    // Bolt hosts an open lobby (if he isn't already in one).
    const inParty = (await db.select('party_members', { eq: { user_id: u.Bolt.id } }))[0]
    const partyId = inParty?.party_id ?? (await createParty(u.Bolt.id)).id
    rows.push({ user_id: me, actor_id: u.Bolt.id, type: 'party_invite', payload: { party_id: partyId }, created_at: ago(2) })
  }
  if (u.Moonbeam) rows.push({ user_id: me, actor_id: u.Moonbeam.id, type: 'reaction', payload: { kind: 'hype', quest_title: 'Mood Doodle' }, created_at: ago(6) })
  if (u.Pixel) rows.push({ user_id: me, actor_id: u.Pixel.id, type: 'group_tag', payload: { quest_title: 'Campus Coffee Run', tag: 'together' }, created_at: ago(25) })
  if (u.Juniper) {
    const existing = [
      ...(await db.select('friendships', { eq: { user_id: u.Juniper.id, friend_id: me } })),
      ...(await db.select('friendships', { eq: { user_id: me, friend_id: u.Juniper.id } })),
    ]
    const fs = existing[0] ?? (await db.insert('friendships', { user_id: u.Juniper.id, friend_id: me, status: 'pending' }))[0]
    if (fs.status === 'pending') rows.push({ user_id: me, actor_id: u.Juniper.id, type: 'friend_request', payload: { friendship_id: fs.id }, created_at: ago(40) })
  }
  if (rows.length) await db.insert('notifications', rows.map((r) => ({ ...r, read: false })))
  return rows.length
}
