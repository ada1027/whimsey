import { createContext, useCallback, useContext, useState } from 'react'
import { FILL } from '../data/tones.js'

const ToastContext = createContext(() => {})
const ToastListContext = createContext([])

/** toast('Message', { tone: 'gold' | 'neon' | 'pink' | 'blue' | 'grape', icon: LucideIcon }) */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, { tone = 'gold', icon } = {}) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t.slice(-2), { id, message, tone, icon }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      <ToastListContext.Provider value={toasts}>{children}</ToastListContext.Provider>
    </ToastContext.Provider>
  )
}

/** Renders toasts; place it inside the phone screen so they stay within the frame. */
export function ToastViewport() {
  const toasts = useContext(ToastListContext)
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map(({ id, message, tone, icon: Icon }) => (
        <div key={id} className={`pill animate-toast px-3 py-1.5 text-sm normal-case tracking-normal shadow-[0_4px_0_var(--outline)] ${FILL[tone]}`}>
          {Icon && <Icon size={16} strokeWidth={2.75} />}
          {message}
        </div>
      ))}
    </div>
  )
}

export const useToast = () => useContext(ToastContext)
