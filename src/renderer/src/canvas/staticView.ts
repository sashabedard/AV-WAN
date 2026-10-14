import { createContext, useContext } from 'react'
import { useProjectStore } from '../store/projectStore'

// Canvas sans édition (vignette épinglée, PDF) : pas de renommage au double-clic, pas de poignées de zone.
export const StaticViewContext = createContext(false)

// Vrai quand on ne peut rien modifier depuis cette vue : fichier en lecture seule, ou vue statique.
export function useLocked(): boolean {
  const readOnly = useProjectStore((s) => s.readOnly)
  const staticView = useContext(StaticViewContext)
  return readOnly || staticView
}
