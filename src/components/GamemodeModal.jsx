import { Check, Gamepad2, Rocket, Sprout } from 'lucide-react'
import { useToast } from '../context/ToastContext.jsx'
import { useUser } from '../context/UserContext.jsx'
import { Modal } from './ui.jsx'

const MODES = [
  { id: 'simple', name: 'Simple', tag: 'Beginner', icon: Sprout, tone: 'btn-neon',
    desc: 'Just the essentials: play, your current task and friends.' },
  { id: 'pro', name: 'Pro', tag: 'Full HUD', icon: Rocket, tone: 'btn-pink',
    desc: 'Adds daily tasks, mystery events, leaderboard, guilds and the shop.' },
]

export default function GamemodeModal({ onClose }) {
  const { profile, updateProfile } = useUser()
  const toast = useToast()

  const choose = (id) => {
    updateProfile({ gamemode: id })
    toast(`${id === 'pro' ? 'Pro' : 'Simple'} mode on!`, { tone: id === 'pro' ? 'pink' : 'neon', icon: Gamepad2 })
    onClose()
  }

  return (
    <Modal onClose={onClose} title="Choose gamemode" eyebrow="Gamemode">
      <div className="space-y-3">
        {MODES.map(({ id, name, tag, icon: Icon, tone, desc }) => {
          const active = profile.gamemode === id
          return (
            <button key={id} onClick={() => choose(id)} aria-pressed={active}
              className={`btn ${active ? tone : 'btn-ghost'} w-full justify-start gap-4 rounded-2xl p-4 text-left normal-case`}>
              <span className="grid size-12 shrink-0 place-items-center rounded-xl border-[3px] border-outline bg-surface text-ink [text-shadow:none]">
                <Icon size={24} strokeWidth={2.5} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-2xl uppercase">{name}
                  <span className="pill bg-surface text-ink [text-shadow:none]">{tag}</span>
                </span>
                <span className="block font-sans text-sm font-bold tracking-normal opacity-90">{desc}</span>
              </span>
              {active && <Check size={24} strokeWidth={3.5} />}
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
