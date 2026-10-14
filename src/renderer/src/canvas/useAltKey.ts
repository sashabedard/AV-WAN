import { useEffect, useState } from 'react'

export function useAltKey(): boolean {
  const [down, setDown] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => setDown(e.altKey)
    const onBlur = (): void => setDown(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      window.removeEventListener('blur', onBlur)
    }
  }, [])
  return down
}
