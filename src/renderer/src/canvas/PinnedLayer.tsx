import { useEffect, useRef, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { uiStore, useUiStore } from '../store/uiStore'
import { pinCurrentView, unpinView } from './viewport'
import { PinnedFrame } from './PinnedFrame'
import { PinnedDiagram } from './PinnedDiagram'
import { clampVignette, defaultPlacement, type Box, type Size } from './pinnedView'

const setPointerInside = (on: boolean): void => uiStore.getState().setPointerOverPinned(on)

// Vue épinglée (spec 2026-10-14) : une couche de la taille du canvas, montée à côté du canvas principal
// (pas dedans) pour qu'aucun clic, double-clic ou coup de molette de la vignette n'y remonte.
export function PinnedLayer() {
  const rect = useUiStore((s) => s.pinnedRect)
  const layer = useRef<HTMLDivElement>(null)
  const [bounds, setBounds] = useState<Size | null>(null)
  const [box, setBox] = useState<Box | null>(null)
  useEffect(() => {
    const el = layer.current
    if (!el) return
    const measure = (): void => setBounds({ width: el.clientWidth, height: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  // La place par défaut (haut-droit) se calcule à chaque ouverture ; vignette ouverte, « Recadrer » la garde
  // et un changement de taille du canvas ne fait que la ramener à l'intérieur.
  useEffect(() => {
    if (!bounds) return
    setBox((b) => (!rect ? null : b ? clampVignette(b, bounds) : defaultPlacement(bounds)))
  }, [bounds, rect])
  return (
    <div ref={layer} className="pinned-layer">
      {rect && bounds && box && (
        <PinnedFrame box={box} bounds={bounds} onBoxChange={setBox} onRepin={pinCurrentView} onClose={unpinView} onPointerInside={setPointerInside}>
          <ReactFlowProvider>
            <PinnedDiagram rect={rect} />
          </ReactFlowProvider>
        </PinnedFrame>
      )}
    </div>
  )
}
