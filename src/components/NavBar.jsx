import { House, Swords, User, Users } from 'lucide-react'
import { useUser } from '../context/UserContext.jsx'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Home', icon: House },
  { id: 'quests', label: 'Quests', icon: Swords },
  { id: 'social', label: 'Social', icon: Users },
  { id: 'profile', label: 'Profile', icon: User },
]

/** Bottom tab bar, pinned to the bottom of the phone screen. */
export default function NavBar({ view, onChange }) {
  const { activeQuest } = useUser()

  return (
    <nav aria-label="Main" className="relative z-30 shrink-0 border-t-[3px] border-outline bg-surface">
      <ul className="flex justify-around gap-1 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const active = view === id
          return (
            <li key={id} className="flex-1">
              <button
                onClick={() => onChange(id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex w-full flex-col items-center gap-0.5 rounded-2xl border-[3px] py-1.5 font-display text-xs uppercase tracking-wide transition
                  ${active
                    ? '-translate-y-1.5 border-outline bg-gold text-on-accent shadow-[inset_0_-4px_0_rgb(0_0_0/.2),0_4px_0_var(--outline)]'
                    : 'border-transparent text-muted hover:text-ink'}`}
              >
                <Icon size={22} strokeWidth={2.75} />
                {label}
                {id === 'quests' && activeQuest && (
                  <span className="live-dot absolute -top-1 right-[calc(50%-20px)] size-3.5 rounded-full border-[3px] border-outline bg-pink" aria-label="Quest in progress" />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
