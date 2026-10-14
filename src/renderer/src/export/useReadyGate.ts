import { useCallback, useEffect, useRef } from 'react'

const nextFrame = (cb: () => void): void => {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => cb())
  else setTimeout(cb, 16)
}

// La page est prête quand chaque schéma a fini son cadrage, puis quand les polices sont chargées et que
// deux images ont été peintes (recherche 02, § 4.3). onReady n'est appelé qu'une fois, même sans schéma.
export function useReadyGate(count: number, onReady: () => void): () => void {
  const left = useRef(count)
  const fired = useRef(false)
  const fire = useCallback(() => {
    if (fired.current) return
    fired.current = true
    const fonts: Promise<unknown> = 'fonts' in document ? document.fonts.ready : Promise.resolve()
    void fonts.then(() => nextFrame(() => nextFrame(onReady)))
  }, [onReady])
  useEffect(() => {
    if (count <= 0) fire()
  }, [count, fire])
  return useCallback(() => {
    left.current -= 1
    if (left.current <= 0) fire()
  }, [fire])
}
