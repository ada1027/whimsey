import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import * as api from '../lib/api.js'
import { db } from '../lib/db.js'
import { maxXpForLevel } from '../data/progression.js'
import { DEFAULT_EQUIPPED, ITEM_BY_ID, resolveLook } from '../data/seed.js'

const SessionContext = createContext(null)
const SESSION_KEY = 'whimsey:session:v1'
export const GUEST_STORE_KEY = 'whimsey:profile:v2'
export const userStoreKey = (userId) => `whimsey:profile:v3:${userId}`

// Saved in localStorage (so a returning player skips the login) and in sessionStorage (so two
// tabs in one browser can play as two different adventurers when testing).
function readSession() {
  for (const store of [sessionStorage, localStorage]) {
    try {
      const v = JSON.parse(store.getItem(SESSION_KEY))
      if (v?.userId) return v
    } catch { /* ignore */ }
  }
  return null
}
function writeSession(v) {
  for (const store of [sessionStorage, localStorage]) {
    try {
      if (v) store.setItem(SESSION_KEY, JSON.stringify(v))
      else store.removeItem(SESSION_KEY)
    } catch { /* ignore */ }
  }
}

export function SessionProvider({ children }) {
  const [session, setSession] = useState(readSession)
  const [checking, setChecking] = useState(() => !!readSession())

  // Make sure the saved profile still exists (e.g. after the database was reset).
  useEffect(() => {
    if (!session) return
    let alive = true
    api.getProfile(session.userId)
      .then((p) => { if (alive && !p) { writeSession(null); setSession(null) } })
      .catch(() => { /* offline: keep the session */ })
      .finally(() => alive && setChecking(false))
    return () => { alive = false }
  }, [session])

  /**
   * Log in by username, creating the profile if it doesn't exist.
   * `localState` is the current (guest) progress, used for brand-new profiles.
   */
  const login = useCallback(async (username, localState) => {
    const name = username.trim()
    const existing = await api.findProfileByUsername(name)
    const profile = existing ?? await api.createProfile({
      username: name,
      avatar: api.encodeAvatar(resolveLook(localState.equipped), localState.equipped, localState.companionName),
      level: localState.level,
      xp: localState.xp,
      coins: localState.coins,
      streak: localState.streak,
    })

    // Seed this adventurer's local save the first time they play on this device.
    const key = userStoreKey(profile.id)
    if (!localStorage.getItem(key)) {
      const { lastReward: _r, lastAccepted: _a, lastFailure: _f, ...base } = localState
      const parsed = existing ? api.parseAvatar(existing.avatar) : null
      const saved = parsed?.equipped
      const equipped = saved && Object.values(saved).every((id) => ITEM_BY_ID[id]) ? saved : base.equipped ?? DEFAULT_EQUIPPED
      const maxXp = maxXpForLevel(profile.level)
      const start = existing
        ? { ...base, username: profile.username, level: profile.level, xp: Math.min(profile.xp, maxXp - 1), maxXp, coins: profile.coins, streak: profile.streak, equipped, companionName: parsed.name || base.companionName }
        : { ...base, username: profile.username }
      try { localStorage.setItem(key, JSON.stringify(start)) } catch { /* ignore */ }
    }

    const next = { userId: profile.id, username: profile.username }
    writeSession(next)
    setSession(next)
    return { profile, created: !existing }
  }, [])

  const logout = useCallback(() => { writeSession(null); setSession(null) }, [])

  return (
    <SessionContext.Provider value={{ session, checking, login, logout, mode: db.mode }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>')
  return ctx
}
