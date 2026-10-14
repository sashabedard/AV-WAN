import { useEffect, type RefObject } from 'react'

// Ferme un popover sur un appui de souris en dehors de lui.
export function useDismissOnOutside(ref: RefObject<HTMLElement | null>, active: boolean, onDismiss: () => void): void {
  useEffect(() => {
    if (!active) return
    const onDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [ref, active, onDismiss])
}
