import { useEffect, useRef, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { useT } from '../i18n/useT'
import { Icon } from '../icons/Icon'
import { clampVignette, type Box, type Size } from './pinnedView'
import './pinned.css'

export interface PinnedFrameProps {
  box: Box
  bounds: Size // taille du canvas : la boîte n'en sort jamais
  onBoxChange(box: Box): void
  onRepin(): void
  onClose(): void
  onPointerInside(inside: boolean): void
  children: ReactNode
}

type Gesture = { kind: 'move' | 'resize'; x: number; y: number; box: Box }

// La boîte flottante de la vue épinglée (spec 2026-10-14 § 3.2) : on la déplace par sa barre de titre et
// on la redimensionne par le coin. Le geste part de la boîte d'origine : aucune dérive pendant le glisser.
export function PinnedFrame({ box, bounds, onBoxChange, onRepin, onClose, onPointerInside, children }: PinnedFrameProps) {
  const { m } = useT()
  const gesture = useRef<Gesture | null>(null)
  useEffect(() => {
    const onMove = (e: MouseEvent): void => {
      const g = gesture.current
      if (!g) return
      const dx = e.clientX - g.x
      const dy = e.clientY - g.y
      const next = g.kind === 'move' ? { ...g.box, left: g.box.left + dx, top: g.box.top + dy } : { ...g.box, width: g.box.width + dx, height: g.box.height + dy }
      onBoxChange(clampVignette(next, bounds))
    }
    const onUp = (): void => {
      gesture.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [bounds, onBoxChange])
  // Une vignette retirée alors que le pointeur est dessus ne reçoit jamais mouseleave.
  useEffect(() => () => onPointerInside(false), [onPointerInside])
  const start = (kind: Gesture['kind']) => (e: ReactMouseEvent): void => {
    if (e.button !== 0 || (e.target as Element).closest('button')) return
    e.preventDefault()
    gesture.current = { kind, x: e.clientX, y: e.clientY, box }
  }
  return (
    <section
      className="pinned"
      aria-label={m.canvas.pinned.title}
      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
      onMouseEnter={() => onPointerInside(true)}
      onMouseLeave={() => onPointerInside(false)}
    >
      <header className="pinned__bar" onMouseDown={start('move')}>
        <Icon name="pin" size={13} />
        <span className="pinned__title">{m.canvas.pinned.title}</span>
        <button type="button" className="pinned__btn" onClick={onRepin} title={m.canvas.pinned.repinHint}>
          {m.canvas.pinned.repin}
        </button>
        <button type="button" className="pinned__btn pinned__btn--icon" onClick={onClose} aria-label={m.canvas.pinned.remove} title={m.canvas.pinned.remove}>
          <Icon name="close" size={13} />
        </button>
      </header>
      <div className="pinned__body">{children}</div>
      <div className="pinned__grip" onMouseDown={start('resize')} aria-hidden="true" />
    </section>
  )
}
