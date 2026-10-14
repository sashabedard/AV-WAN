import { createStore, type StoreApi } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { AvwanApi, LibraryFile } from '../../../shared/api'
import { DeviceTemplateSchema } from '../model/schema'
import { CUSTOM_ID } from '../model/customTemplate'
import type { DeviceTemplate } from '../model/types'

type LibraryApi = AvwanApi['library']

export interface LibraryState {
  templates: DeviceTemplate[]
  load(): Promise<void>
  save(template: DeviceTemplate): Promise<void>
  replace(oldId: string, template: DeviceTemplate): Promise<void>
  remove(id: string): Promise<void>
}

const byName = (list: readonly DeviceTemplate[]): DeviceTemplate[] => [...list].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
const toText = (t: DeviceTemplate): string => `${JSON.stringify(t, null, 2)}\n`

// Un fichier illisible, mal formé, au mauvais nom, ou un switch, est ignoré.
export function parseLibrary(files: readonly LibraryFile[]): DeviceTemplate[] {
  const out: DeviceTemplate[] = []
  for (const f of files) {
    try {
      const r = DeviceTemplateSchema.safeParse(JSON.parse(f.text))
      if (r.success && r.data.id === f.id && CUSTOM_ID.test(r.data.id) && !r.data.switch) out.push({ ...r.data, isCustom: true })
    } catch {
      // JSON illisible
    }
  }
  return byName(out)
}

// Le store ne change qu'après une écriture réussie sur le disque.
export function createLibraryStore(api: () => LibraryApi): StoreApi<LibraryState> {
  return createStore<LibraryState>()((set, get) => ({
    templates: [],
    load: async () => {
      set({ templates: parseLibrary(await api().list()) })
    },
    save: async (input) => {
      const template = { ...input, isCustom: true }
      await api().save(template.id, toText(template))
      set({ templates: byName([...get().templates.filter((t) => t.id !== template.id), template]) })
    },
    replace: async (oldId, input) => {
      const template = { ...input, isCustom: true }
      await api().save(template.id, toText(template))
      if (oldId !== template.id) await api().remove(oldId)
      set({ templates: byName([...get().templates.filter((t) => t.id !== oldId && t.id !== template.id), template]) })
    },
    remove: async (id) => {
      await api().remove(id)
      set({ templates: get().templates.filter((t) => t.id !== id) })
    }
  }))
}

export const libraryStore = createLibraryStore(() => window.avwan.library)

export function useLibraryStore<T>(selector: (s: LibraryState) => T): T {
  return useStore(libraryStore, selector)
}

export function libraryTemplate(id: string): DeviceTemplate | undefined {
  return libraryStore.getState().templates.find((t) => t.id === id)
}
