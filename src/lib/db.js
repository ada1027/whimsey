// Tiny data-access layer with two interchangeable backends:
//   • supabaseAdapter – real Postgres + Realtime + Storage
//   • mockAdapter     – the same tables in localStorage (syncs across tabs of one browser)
// api.js is written once against this interface, so both modes run the same game logic.
//
// Filter shape used by select/update/remove:
//   { eq: { col: value }, in: { col: [values] }, ilike: { col: 'pattern%' }, order: [col, { ascending }], limit: n }

import { isSupabaseConfigured, PROOF_BUCKET, supabase } from './supabase.js'

export const TABLES = ['profiles', 'friendships', 'parties', 'party_members', 'quest_feed']

/* ------------------------------------------------------------------ */
/* Supabase                                                            */
/* ------------------------------------------------------------------ */

function applyFilter(q, f = {}) {
  for (const [k, v] of Object.entries(f.eq ?? {})) q = q.eq(k, v)
  for (const [k, v] of Object.entries(f.in ?? {})) q = q.in(k, v)
  for (const [k, v] of Object.entries(f.ilike ?? {})) q = q.ilike(k, v)
  return q
}

function check({ data, error }) {
  if (error) {
    const e = new Error(error.message)
    e.code = error.code
    throw e
  }
  return data
}

const supabaseAdapter = {
  mode: 'supabase',

  async select(table, f = {}) {
    let q = applyFilter(supabase.from(table).select('*'), f)
    if (f.order) q = q.order(f.order[0], f.order[1] ?? { ascending: true })
    if (f.limit) q = q.limit(f.limit)
    return check(await q)
  },
  async insert(table, rows) {
    return check(await supabase.from(table).insert(rows).select())
  },
  async update(table, patch, f) {
    return check(await applyFilter(supabase.from(table).update(patch), f).select())
  },
  /** Insert, silently skipping rows that hit the unique constraint on `onConflict` columns. */
  async insertIgnore(table, rows, onConflict) {
    return check(await supabase.from(table).upsert(rows, { onConflict, ignoreDuplicates: true }).select())
  },
  async remove(table, f) {
    check(await applyFilter(supabase.from(table).delete(), f))
  },
  /** Atomic vote write (see cast_vote in supabase_schema.sql) so simultaneous votes don't overwrite each other. */
  async castVote(partyId, userId, vote) {
    check(await supabase.rpc('cast_vote', { p_party_id: partyId, p_user_id: userId, p_vote: vote }))
  },
  /** Atomic reaction toggle (see toggle_reaction in supabase_schema.sql). */
  async toggleReaction(postId, userId, kind) {
    check(await supabase.rpc('toggle_reaction', { p_post_id: postId, p_user_id: userId, p_kind: kind }))
  },
  async upload(path, file) {
    check(await supabase.storage.from(PROOF_BUCKET).upload(path, file, { upsert: true, contentType: file.type }))
    return supabase.storage.from(PROOF_BUCKET).getPublicUrl(path).data.publicUrl
  },
  /** Calls onChange(table) whenever any row in our tables changes, on any device. */
  subscribe(onChange) {
    const channel = supabase.channel('whimsey-db')
    for (const table of TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange(table))
    }
    channel.subscribe()
    return () => supabase.removeChannel(channel)
  },
}

/* ------------------------------------------------------------------ */
/* Local mock (localStorage)                                           */
/* ------------------------------------------------------------------ */

const MOCK_KEY = 'whimsey:mockdb:v1'
const bus = new EventTarget()
const now = () => new Date().toISOString()
const uuid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

const DEFAULTS = {
  profiles: () => ({ id: uuid(), avatar: null, level: 1, xp: 0, coins: 0, streak: 0, status: 'online', is_bot: false, created_at: now(), updated_at: now() }),
  friendships: () => ({ id: uuid(), status: 'pending', created_at: now() }),
  parties: () => ({ id: uuid(), status: 'lobby', current_quest: null, rerolls_used: 0, votes: {}, created_at: now(), updated_at: now() }),
  party_members: () => ({ id: uuid(), is_ready: false, has_completed: false, completion_mode: null, proof_url: null, joined_at: now() }),
  quest_feed: () => ({ id: uuid(), proof_url: null, completion_tag: null, duration_seconds: null, reactions: {}, category: null, party: null, created_at: now() }),
}

function readDb() {
  try {
    const raw = localStorage.getItem(MOCK_KEY)
    if (raw) {
      const db = JSON.parse(raw)
      for (const t of TABLES) db[t] ??= [] // tables added in later versions
      return db
    }
  } catch { /* ignore */ }
  return Object.fromEntries(TABLES.map((t) => [t, []]))
}

function writeDb(db, table) {
  try { localStorage.setItem(MOCK_KEY, JSON.stringify(db)) } catch { /* ignore */ }
  bus.dispatchEvent(new CustomEvent('change', { detail: table }))
}

const likeToRegex = (p) => new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.')}$`, 'i')

function matches(row, f = {}) {
  for (const [k, v] of Object.entries(f.eq ?? {})) if (row[k] !== v) return false
  for (const [k, v] of Object.entries(f.in ?? {})) if (!v.includes(row[k])) return false
  for (const [k, v] of Object.entries(f.ilike ?? {})) if (!likeToRegex(v).test(row[k] ?? '')) return false
  return true
}

function uniqueViolation(db, table, row, ignoreId) {
  const others = db[table].filter((r) => r.id !== ignoreId)
  const clash =
    (table === 'profiles' && others.some((r) => r.username.toLowerCase() === row.username?.toLowerCase())) ||
    (table === 'party_members' && others.some((r) => r.user_id === row.user_id)) ||
    (table === 'friendships' && others.some((r) => r.user_id === row.user_id && r.friend_id === row.friend_id)) ||
    (table === 'quest_feed' && others.some((r) => r.user_id === row.user_id && r.quest_ref === row.quest_ref))
  if (clash) {
    const e = new Error(`duplicate key value violates unique constraint on ${table}`)
    e.code = '23505'
    throw e
  }
}

const clone = (x) => JSON.parse(JSON.stringify(x))

const mockAdapter = {
  mode: 'local',

  async select(table, f = {}) {
    let rows = readDb()[table].filter((r) => matches(r, f))
    if (f.order) {
      const [col, { ascending = true } = {}] = f.order
      rows.sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (ascending ? 1 : -1))
    }
    if (f.limit) rows = rows.slice(0, f.limit)
    return clone(rows)
  },
  async insert(table, rows) {
    const db = readDb()
    const list = (Array.isArray(rows) ? rows : [rows]).map((r) => ({ ...DEFAULTS[table](), ...r }))
    for (const r of list) { uniqueViolation(db, table, r); db[table].push(r) }
    writeDb(db, table)
    return clone(list)
  },
  async insertIgnore(table, rows) {
    const out = []
    for (const r of Array.isArray(rows) ? rows : [rows]) {
      try { out.push(...(await this.insert(table, r))) } catch (e) { if (e.code !== '23505') throw e }
    }
    return out
  },
  async update(table, patch, f) {
    const db = readDb()
    const out = []
    db[table] = db[table].map((r) => {
      if (!matches(r, f)) return r
      const next = { ...r, ...patch, ...('updated_at' in r ? { updated_at: now() } : {}) }
      uniqueViolation(db, table, next, r.id)
      out.push(next)
      return next
    })
    writeDb(db, table)
    return clone(out)
  },
  async remove(table, f) {
    const db = readDb()
    const removed = db[table].filter((r) => matches(r, f))
    db[table] = db[table].filter((r) => !matches(r, f))
    // mimic ON DELETE CASCADE
    if (table === 'parties') {
      const ids = removed.map((p) => p.id)
      db.party_members = db.party_members.filter((m) => !ids.includes(m.party_id))
    }
    if (table === 'profiles') {
      const ids = removed.map((p) => p.id)
      db.friendships = db.friendships.filter((x) => !ids.includes(x.user_id) && !ids.includes(x.friend_id))
      db.party_members = db.party_members.filter((m) => !ids.includes(m.user_id))
      db.quest_feed = db.quest_feed.filter((x) => !ids.includes(x.user_id))
    }
    writeDb(db, table)
  },
  async castVote(partyId, userId, vote) {
    const db = readDb()
    db.parties = db.parties.map((p) => (p.id === partyId ? { ...p, votes: { ...p.votes, [userId]: vote }, updated_at: now() } : p))
    writeDb(db, 'parties')
  },
  async toggleReaction(postId, userId, kind) {
    const db = readDb()
    db.quest_feed = db.quest_feed.map((p) => {
      if (p.id !== postId) return p
      const list = p.reactions?.[kind] ?? []
      const next = list.includes(userId) ? list.filter((u) => u !== userId) : [...list, userId]
      return { ...p, reactions: { ...p.reactions, [kind]: next } }
    })
    writeDb(db, 'quest_feed')
  },
  async upload(path, file) {
    // Small images are kept as data URLs so other tabs can show the thumbnail; larger files keep just a name.
    if (file.type.startsWith('image/') && file.size < 400_000) {
      return await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => resolve(`local:${file.name}`)
        reader.readAsDataURL(file)
      })
    }
    return `local:${path}`
  },
  subscribe(onChange) {
    const local = (e) => onChange(e.detail)
    const crossTab = (e) => e.key === MOCK_KEY && onChange('*')
    bus.addEventListener('change', local)
    window.addEventListener('storage', crossTab)
    return () => { bus.removeEventListener('change', local); window.removeEventListener('storage', crossTab) }
  },
}

export const db = isSupabaseConfigured ? supabaseAdapter : mockAdapter
