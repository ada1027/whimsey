import { Cloud, Gamepad2, HardDrive, LogOut, Map, Menu, Moon, RotateCcw, ShoppingBag, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSession } from '../context/SessionContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import Character from './Character.jsx'
import { XPBar } from './ui.jsx'

/** Top bar from the wireframe: profile card (left) · map / shop / menu (right). */
export default function StatusBar({ onNavigate, onOpenGamemode }) {
  const { profile, look, title } = useUser()
  const toast = useToast()
  const pro = profile.gamemode === 'pro'

  return (
    <header className="relative z-30 shrink-0 border-b-[3px] border-outline bg-surface">
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Profile card */}
        <button
          onClick={() => onNavigate('profile')}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl border-[3px] border-outline bg-surface-2 p-1.5 pr-3 text-left shadow-[0_4px_0_var(--outline)] transition active:translate-y-1 active:shadow-none"
          aria-label="Open profile"
        >
          <div className="relative shrink-0">
            <div className="size-11 overflow-hidden rounded-xl border-[3px] border-outline stage">
              <Character look={look} crop="head" className="size-full" />
            </div>
            <span className="absolute -bottom-2 -right-2 pill bg-gold px-1 text-[10px] leading-4 text-on-accent">{profile.level}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm uppercase leading-tight">
              {profile.username} <span className="text-muted">· {title}</span>
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="font-display text-xs">LV</span>
              <XPBar xp={profile.xp} maxXp={profile.maxXp} size="sm" />
            </div>
          </div>
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <IconBtn label="Interactive map" onClick={() => toast('Interactive map coming soon!', { tone: 'blue', icon: Map })}>
            <Map size={18} strokeWidth={2.75} />
          </IconBtn>
          {pro && (
            <IconBtn label="Shop" onClick={() => onNavigate('profile')} tone="btn-gold">
              <ShoppingBag size={18} strokeWidth={2.75} />
            </IconBtn>
          )}
          <MainMenu onOpenGamemode={onOpenGamemode} />
        </div>
      </div>
    </header>
  )
}

function IconBtn({ label, onClick, children, tone = 'btn-ghost' }) {
  return (
    <button onClick={onClick} className={`btn ${tone} size-10 rounded-xl`} aria-label={label} title={label}>
      {children}
    </button>
  )
}

function MainMenu({ onOpenGamemode }) {
  const { theme, toggleTheme } = useTheme()
  const { profile, resetProfile } = useUser()
  const { logout, mode } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const esc = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  const item = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-display uppercase tracking-wide hover:bg-surface-2'
  return (
    <div className="relative" ref={ref}>
      <IconBtn label="Menu" onClick={() => setOpen((o) => !o)}>
        <Menu size={18} strokeWidth={2.75} />
      </IconBtn>
      {open && (
        <div role="menu" className="card absolute right-0 top-12 w-64 animate-pop p-2">
          <p className="flex items-center gap-2 px-3 pb-1 pt-1.5 text-xs font-extrabold uppercase tracking-wider text-muted">
            {mode === 'supabase' ? <><Cloud size={14} /> Live sync · Supabase</> : <><HardDrive size={14} /> Local mode · this browser only</>}
          </p>
          <button role="menuitem" className={item} onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />} {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button role="menuitem" className={item} onClick={() => { setOpen(false); onOpenGamemode() }}>
            <Gamepad2 size={18} /> Mode: {profile.gamemode}
          </button>
          <button
            role="menuitem"
            className={`${item} text-pink`}
            onClick={() => { setOpen(false); if (confirm('Reset all progress?')) resetProfile() }}
          >
            <RotateCcw size={18} /> Reset progress
          </button>
          <button role="menuitem" className={item} onClick={() => { setOpen(false); logout() }}>
            <LogOut size={18} /> Switch adventurer
          </button>
        </div>
      )}
    </div>
  )
}
