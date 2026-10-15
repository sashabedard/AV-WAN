import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { safeLocalStorage } from '../theme/themePreference'
import { SIDEBAR_DEFAULT, SIDEBAR_MAX, SIDEBAR_MIN, clampSidebarWidth, loadSidebarWidth, saveSidebarWidth } from './sidebarWidth'

const KEY_STEP = 16

// Poignée sur le bord droit du panneau de gauche. La largeur passe par --left-w sur .shell :
// en glissant, seule la poignée refait un rendu (le canvas et les panneaux ne bougent pas).
export function SidebarResizer() {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; width: number } | null>(null)
  const [width, setWidth] = useState(() => loadSidebarWidth(safeLocalStorage()))
  const [dragging, setDragging] = useState(false)
  const resize = (w: number): void => setWidth(clampSidebarWidth(w))

  useLayoutEffect(() => {
    ref.current?.parentElement?.style.setProperty('--left-w', `${width}px`)
  }, [width])
  // Enregistrée une fois le geste fini, pas à chaque pixel.
  useEffect(() => {
    if (!dragging) saveSidebarWidth(width, safeLocalStorage())
  }, [width, dragging])
  // Le curseur reste « col-resize » partout pendant le geste, même hors de la poignée.
  useEffect(() => {
    document.documentElement.classList.toggle('is-resizing', dragging)
  }, [dragging])

  const end = (): void => {
    drag.current = null
    setDragging(false)
  }

  return (
    <div
      ref={ref}
      className={`shell__resizer${dragging ? ' is-dragging' : ''}`}
      role="separator"
      aria-orientation="vertical"
      aria-label="Largeur du panneau de gauche"
      aria-valuemin={SIDEBAR_MIN}
      aria-valuemax={SIDEBAR_MAX}
      aria-valuenow={width}
      tabIndex={0}
      title="Glisser pour élargir · double-clic : largeur d’origine"
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = { x: e.clientX, width }
        setDragging(true)
      }}
      onPointerMove={(e) => {
        if (drag.current) resize(drag.current.width + e.clientX - drag.current.x)
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onDoubleClick={() => resize(SIDEBAR_DEFAULT)}
      onKeyDown={(e) => {
        const keys: Record<string, number> = { ArrowLeft: width - KEY_STEP, ArrowRight: width + KEY_STEP, Home: SIDEBAR_MIN, End: SIDEBAR_MAX }
        const next = keys[e.key]
        if (next === undefined) return
        e.preventDefault()
        resize(next)
      }}
    />
  )
}
