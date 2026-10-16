import { mainMessages } from './lang'

// Chemins accordés par le processus principal pendant cette session : choisis dans un dialogue
// système ou rouverts depuis la liste des récents. Comparaison exacte, sans normalisation.
export interface Grants {
  grant(path: string): void
  isGranted(path: string): boolean
  assertGranted(path: string): void
}

export function createGrants(): Grants {
  const granted = new Set<string>()
  const isGranted = (path: string): boolean => granted.has(path)
  return {
    grant: (path) => void granted.add(path),
    isGranted,
    assertGranted: (path) => {
      if (!isGranted(path)) throw new Error(mainMessages().errors.notGranted)
    }
  }
}

export function assertRecentMember(list: readonly string[], path: string): void {
  if (!list.includes(path)) throw new Error(mainMessages().errors.notRecent)
}
