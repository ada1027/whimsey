import { Cloud, HardDrive, Loader2, Play, Sparkles, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSession } from '../context/SessionContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import * as api from '../lib/api.js'
import Character from './Character.jsx'

const NAME_RE = /^[\p{L}\p{N} _.-]{2,20}$/u

/** First-run "Enter adventurer name" screen: log into an existing profile or create one. */
export default function LoginScreen() {
  const { login, mode } = useSession()
  const { profile, look } = useUser()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [recent, setRecent] = useState([])
  const [seedMsg, setSeedMsg] = useState('')

  useEffect(() => {
    api.listRecentHumans().then(setRecent).catch((e) => setError(friendly(e)))
  }, [])

  const go = async (username) => {
    const n = username.trim()
    if (!NAME_RE.test(n)) return setError('Use 2–20 letters, numbers, spaces, _ . or -')
    setBusy(true); setError('')
    try {
      await login(n, profile)
    } catch (e) {
      setError(friendly(e)); setBusy(false)
    }
  }

  const seed = async () => {
    setSeedMsg('Seeding…')
    try {
      const added = await api.seedSampleUsers()
      setSeedMsg(added ? `Added ${added} sample users — find them with Add Friend.` : 'Sample users are already there.')
    } catch (e) {
      setSeedMsg(''); setError(friendly(e))
    }
  }

  return (
    <div className="stage relative flex flex-1 flex-col overflow-y-auto px-5 pb-6 pt-8 [scrollbar-width:none]">
      <div className="text-center">
        <h1 className="title-stroke text-5xl">WHIMSEY</h1>
        <p className="mt-1 font-bold text-white/85">Daily quests. Real friends. Tiny victories.</p>
      </div>

      <div className="mx-auto my-4 w-32 animate-float">
        <Character look={look} className="w-full drop-shadow-[0_8px_0_rgb(0_0_0/.3)]" />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); go(name) }} className="card p-4 text-ink" role="dialog" aria-labelledby="login-title">
        <h2 id="login-title" className="font-display text-2xl uppercase">Enter adventurer name</h2>
        <p className="mb-3 text-sm font-bold text-muted">Pick your existing name to log in, or a new one to create a profile.</p>
        <input
          autoFocus
          value={name}
          onChange={(e) => { setName(e.target.value); setError('') }}
          maxLength={20}
          placeholder="e.g. QuestQueen"
          aria-label="Adventurer name"
          className="w-full rounded-xl border-[3px] border-outline bg-surface-2 px-3 py-3 font-display text-xl focus:bg-surface focus:outline-none focus:ring-4 focus:ring-blue/40"
        />
        {error && <p role="alert" className="mt-2 text-sm font-bold text-pink">{error}</p>}
        <button type="submit" disabled={busy || !name.trim()} className="btn btn-gold mt-3 h-14 w-full text-2xl">
          {busy ? <Loader2 className="animate-spin" size={24} /> : <Play size={24} fill="currentColor" />} Play
        </button>

        {recent.length > 0 && (
          <>
            <p className="mb-1.5 mt-4 font-display text-sm uppercase tracking-widest text-muted">Or continue as</p>
            <div className="flex flex-wrap gap-2">
              {recent.map((p) => (
                <button key={p.id} type="button" disabled={busy} onClick={() => go(p.username)}
                  className="pill rounded-xl bg-surface-2 py-1 pl-1 pr-2.5 text-sm normal-case tracking-normal text-ink">
                  <span className="stage size-6 overflow-hidden rounded-md border-2 border-outline">
                    <Character look={api.parseAvatar(p.avatar).look} crop="head" className="size-full" />
                  </span>
                  {p.username} <span className="text-muted">LV {p.level}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </form>

      <div className="mt-4 space-y-2 text-center">
        <button type="button" onClick={seed} className="btn btn-blue h-11 px-4 text-sm">
          <Users size={16} strokeWidth={3} /> Seed 8 sample users
        </button>
        {seedMsg && <p className="text-xs font-bold text-white/90"><Sparkles size={12} className="inline" /> {seedMsg}</p>}
        <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-white/75">
          {mode === 'supabase'
            ? <><Cloud size={14} /> Live sync via Supabase</>
            : <><HardDrive size={14} /> Local mode — add Supabase keys to sync across devices</>}
        </p>
      </div>
    </div>
  )
}

function friendly(e) {
  const m = e?.message ?? String(e)
  if (/relation .* does not exist|Could not find the table|schema cache/i.test(m)) return 'Database tables are missing — run supabase_schema.sql in the Supabase SQL Editor.'
  if (/Failed to fetch|NetworkError/i.test(m)) return "Can't reach Supabase — check VITE_SUPABASE_URL and your connection."
  return m
}
