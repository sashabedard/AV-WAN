import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react'
import { createPortal } from 'react-dom'

const TIP_DELAY = 300

type TipAt = { top: number; left: number }

// Nom coupé par la largeur du panneau : au survol, une bulle montre le nom complet à droite du panneau.
// `cut` dit si le libellé était coupé au dernier survol (pour taire le title natif, qui ferait doublon).
export function useTruncTip(label: RefObject<HTMLElement | null>) {
  const [at, setAt] = useState<TipAt | null>(null)
  const [cut, setCut] = useState(false)
  const timer = useRef(0)
  const hide = useCallback(() => {
    window.clearTimeout(timer.current)
    setAt(null)
  }, [])
  const show = useCallback((e: PointerEvent<HTMLElement>) => {
    const el = label.current
    const isCut = !!el && el.scrollWidth > el.clientWidth
    setCut(isCut)
    if (!isCut) return
    const row = e.currentTarget
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const r = row.getBoundingClientRect()
      const panel = row.closest('.shell__left')?.getBoundingClientRect() ?? r
      setAt({ top: r.top + r.height / 2, left: panel.right + 8 })
    }, TIP_DELAY)
  }, [label])
  // La bulle est en position fixe : un défilement la décalerait de sa rangée.
  useEffect(() => {
    if (!at) return
    window.addEventListener('scroll', hide, true)
    return () => window.removeEventListener('scroll', hide, true)
  }, [at, hide])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return { at, cut, show, hide }
}

export function TruncTip({ at, text }: { at: TipAt | null; text: string }) {
  if (!at) return null
  return createPortal(
    <div className="trunc-tip" role="tooltip" style={{ top: at.top, left: at.left }}>
      {text}
    </div>,
    document.body
  )
}
