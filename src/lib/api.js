// Game-level operations on top of db.js (works the same in Supabase and local mode).
import { BOT_NAMES, GROUP_QUESTS, MAX_PARTY_SIZE, MAX_REROLLS, SAMPLE_FEED, SAMPLE_USERS } from '../data/seed.js'
import { db } from './db.js'

const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`)
const uniq = (xs) => [...new Set(xs)]

/* ---------- avatar encoding ---------- */

/** profiles.avatar stores JSON: { look: {color,face,hat,item}, equipped: {slot: itemId} } */
export const encodeAvatar = (look, equipped) => JSON.stringify({ look, equipped })
export function parseAvatar(text) {
  try {
    const v = JSON.parse(text)
    if (v?.look) return v
  } catch { /* ignore */ }
  return { look: { color: '#fff1d6', face: 'classic', hat: 'none', item: 'bat' }, equipped: null }
}

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
    await db.insert('profiles', missing.map(({ look, ...u }) => ({ ...u, avatar: encodeAvatar(look, null), is_bot: true })))
  }
  return missing.length
}

/* ---------- friends ---------- */

export async function sendFriendRequest(me, target) {
  // If they already asked us, accept instead of creating a second row.
  const reverse = (await db.select('friendships', { eq: { user_id: target.id, friend_id: me } }))[0]
  if (reverse) return db.update('friendships', { status: 'accepted' }, { eq: { id: reverse.id } })
  // Sample users / bots have nobody to click "accept", so they accept instantly.
  return db.insert('friendships', { user_id: me, friend_id: target.id, status: target.is_bot ? 'accepted' : 'pending' })
}

export const acceptFriendRequest = (id) => db.update('friendships', { status: 'accepted' }, { eq: { id } })
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

  const ids = uniq([me, ...friendships.map(other), ...members.map((m) => m.user_id), ...lobbyMembers.map((m) => m.user_id)])
  const botIds = new Set(bots.map((b) => b.id))
  const profiles = [...bots, ...(await db.select('profiles', { in: { id: ids.filter((id) => !botIds.has(id)) } }))]

  return { friendships, party, members, lobbies, lobbyMembers, profiles, feed }
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
  if ((await memberCount(partyId)) >= MAX_PARTY_SIZE) throw new Error('That party is full')
  await db.insert('party_members', { party_id: partyId, user_id: me, is_ready: false })
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
  const looks = ['#7dffc0', '#7cd3ff', '#ff9ccb', '#bba2ff', '#ffd23f']
  const faces = ['classic', 'happy', 'determined', 'star']
  const hats = ['cap', 'party', 'headband', 'none']
  const names = [...BOT_NAMES].sort(() => Math.random() - 0.5)
  while (free.length < count) {
    const i = free.length + Math.floor(Math.random() * 100)
    const name = `${names.pop()}-${Math.random().toString(36).slice(2, 5)}`
    const look = { color: looks[i % looks.length], face: faces[i % faces.length], hat: hats[i % hats.length], item: 'bottle' }
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
export function postToFeed(userId, post) {
  return db.insertIgnore('quest_feed', {
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
  }, 'user_id,quest_ref')
}

/** Latest posts from the given authors, newest first. */
export const loadFeed = (authorIds, limit = 30) =>
  authorIds.length
    ? db.select('quest_feed', { in: { user_id: authorIds }, order: ['created_at', { ascending: false }], limit })
    : Promise.resolve([])

export const toggleReaction = (postId, userId, kind) => db.toggleReaction(postId, userId, kind)

/** Makes sure the sample users exist and have a few posts, so the feed isn't empty on first load. */
export async function seedSampleFeed() {
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
