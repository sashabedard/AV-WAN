import { useEffect, useRef, type RefObject } from 'react'

// Vrai une fois les effets du premier rendu passés. React Flow annonce une sélection vide à son montage,
// avant d'avoir reçu les nœuds : sans ce garde, basculer Schéma ↔ Baies effacerait la sélection du projet.
// Les effets des enfants partent avant ceux du parent ; la remise à faux au démontage couvre aussi le
// double montage du mode strict.
export function useMountedRef(): RefObject<boolean> {
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  return mounted
}
