import { useMemo } from 'react'
import { TEMPLATES } from '../catalog/templates'
import { projectOnlyTemplates } from '../model/customTemplate'
import type { DeviceTemplate, StoredTemplate } from '../model/types'
import { useLibraryStore } from '../store/libraryStore'
import { useProjectStore } from '../store/projectStore'

export interface PlaceableTemplates {
  library: StoredTemplate[]
  projectOnly: StoredTemplate[]
  all: DeviceTemplate[]
}

// Ce qu'on peut placer : ma bibliothèque, les composantes du projet absentes de la bibliothèque, puis le catalogue.
export function usePlaceableTemplates(): PlaceableTemplates {
  const library = useLibraryStore((s) => s.templates)
  const embedded = useProjectStore((s) => s.history.present.templates)
  return useMemo(() => {
    const ids = new Set(library.map((t) => t.id))
    const projectOnly = projectOnlyTemplates({ templates: embedded }, ids)
    return { library, projectOnly, all: [...library, ...projectOnly, ...TEMPLATES] }
  }, [library, embedded])
}
