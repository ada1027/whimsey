import { X } from 'lucide-react'
import { useEffect, useId } from 'react'
import { FILL } from '../data/tones.js'

/** Loot-style badge pill. */
export function Pill({ tone = 'dark', icon: Icon, children, className = '' }) {
  return (
    <span className={`pill ${FILL[tone]} ${className}`}>
      {Icon && <Icon size={12} strokeWidth={3} />}
      {children}
    </span>
  )
}

/** Chunky segmented XP meter. */
export function XPBar({ xp, maxXp, size = 'md', className = '' }) {
  const pct = Math.min(100, Math.round((xp / maxXp) * 100))
  const h = { sm: 'h-3', md: 'h-4', lg: 'h-6' }[size]
  return (
    <div
      className={`relative ${h} w-full overflow-hidden rounded-full border-[3px] border-outline bg-outline/60 ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={maxXp}
      aria-valuenow={xp}
      aria-label="Experience points"
    >
      <div
        className="relative h-full rounded-full bg-gradient-to-b from-[#7dffb4] to-neon transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%` }}
      >
        <div className="absolute inset-x-1 top-0.5 h-1/3 rounded-full bg-white/50" />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0_calc(10%-2px),rgb(0_0_0/0.25)_calc(10%-2px)_10%)]" />
    </div>
  )
}

/** Uppercase section heading. */
export function SectionTitle({ icon: Icon, children, action, tone = 'gold' }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 font-display text-xl uppercase tracking-wide">
        {Icon && (
          <span className={`grid size-8 place-items-center rounded-lg border-[3px] border-outline ${FILL[tone]}`}>
            <Icon size={16} strokeWidth={2.75} />
          </span>
        )}
        {children}
      </h2>
      {action}
    </div>
  )
}

/** Big outlined page title. */
export function PageTitle({ children, subtitle, action }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h1 className="title-stroke text-4xl uppercase">{children}</h1>
        {subtitle && <p className="mt-1 font-bold text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

/** Accessible modal that slides up as a bottom sheet inside the phone screen. */
export function Modal({ onClose, title, eyebrow, children, dismissable = true, className = '', z = 'z-50', headerAction }) {
  const titleId = useId()

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && dismissable && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, dismissable])

  return (
    <div
      className={`fixed inset-0 ${z} grid place-items-end bg-[#05020f]/70 backdrop-blur-sm`}
      onClick={() => dismissable && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className={`card max-h-[90%] w-full animate-sheet overflow-y-auto rounded-b-none border-b-0 p-5 pb-7 shadow-none ${className}`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && <p className="font-display text-sm uppercase tracking-widest text-muted">{eyebrow}</p>}
            <h2 id={titleId} className="font-display text-2xl uppercase leading-tight">{title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerAction}
            <button onClick={onClose} disabled={!dismissable} className="btn btn-ghost size-10 shrink-0 rounded-xl" aria-label="Close">
              <X size={18} strokeWidth={3} />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
