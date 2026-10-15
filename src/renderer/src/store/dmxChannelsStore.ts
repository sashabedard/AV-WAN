import { createStore, type StoreApi } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { AvwanApi } from '../../../shared/api'
import type { DmxChannelList } from '../model/types'
import { parseSettingsLists, removeList, serializeSettingsLists, upsertList, type ChannelKey } from '../model/dmxChannels'

type ChannelsApi = Pick<AvwanApi['dmxChannels'], 'read' | 'write'>

export interface DmxChannelsState {
  lists: readonly DmxChannelList[]
  load(): Promise<void>
  save(key: ChannelKey, params: readonly string[]): Promise<void>
  remove(key: ChannelKey): Promise<void>
}

// Réglages (spec canaux-dmx § 3.5) : listes valables pour tous les projets. Le store ne change qu'après une
// écriture réussie ; les écritures passent l'une après l'autre (chacune repart de la liste à jour).
export function createDmxChannelsStore(api: () => ChannelsApi): StoreApi<DmxChannelsState> {
  return createStore<DmxChannelsState>()((set, get) => {
    let queue: Promise<void> = Promise.resolve()
    const serial = (op: () => Promise<void>): Promise<void> => {
      const run = queue.then(op)
      queue = run.catch(() => undefined)
      return run
    }
    const write = (next: (lists: readonly DmxChannelList[]) => readonly DmxChannelList[]): Promise<void> =>
      serial(async () => {
        const lists = next(get().lists)
        if (lists === get().lists) return
        await api().write(serializeSettingsLists(lists))
        set({ lists })
      })
    return {
      lists: [],
      load: () => serial(async () => set({ lists: parseSettingsLists(await api().read()) })),
      save: (key, params) => write((lists) => upsertList(lists, key, params)),
      remove: (key) => write((lists) => removeList(lists, key))
    }
  })
}

export const dmxChannelsStore = createDmxChannelsStore(() => window.avwan.dmxChannels)

export function useDmxChannelsStore<T>(selector: (s: DmxChannelsState) => T): T {
  return useStore(dmxChannelsStore, selector)
}
