import { useEffect, useState } from 'react'

/** Current time, re-rendering every `ms` (for live countdowns). */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(iv)
  }, [ms])
  return now
}

/** 1:05:09 / 14:59 / 00:07 */
export function formatCountdown(msLeft) {
  const s = Math.max(0, Math.ceil(msLeft / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${String(m).padStart(2, '0')}:${sec}`
}
