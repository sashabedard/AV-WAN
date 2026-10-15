import { describe, expect, it, vi } from 'vitest'
import { createDmxChannelsStore } from './dmxChannelsStore'

const WASH = { templateId: 'dmx-fixture', model: 'Wash', mode: '9CH' }

function fakeApi(initial: string | null = null) {
  let text = initial
  return {
    read: vi.fn(async () => text),
    write: vi.fn(async (t: string) => {
      text = t
    }),
    text: () => text
  }
}

describe('dmxChannelsStore', () => {
  it('charge, enregistre puis retire une liste', async () => {
    const api = fakeApi(JSON.stringify({ lists: [{ ...WASH, params: ['Red'] }] }))
    const store = createDmxChannelsStore(() => api)
    await store.getState().load()
    expect(store.getState().lists).toEqual([{ ...WASH, params: ['Red'] }])
    await store.getState().save(WASH, ['Red', 'Green'])
    expect(JSON.parse(api.text()!)).toEqual({ lists: [{ ...WASH, params: ['Red', 'Green'] }] })
    await store.getState().remove(WASH)
    expect(store.getState().lists).toEqual([])
  })

  it('n’écrit rien quand rien ne change', async () => {
    const api = fakeApi()
    const store = createDmxChannelsStore(() => api)
    await store.getState().remove(WASH)
    await store.getState().save(WASH, ['Red'])
    await store.getState().save(WASH, ['Red '])
    expect(api.write).toHaveBeenCalledTimes(1)
  })

  it('une écriture ratée ne change pas le store', async () => {
    const api = { read: vi.fn(async () => null), write: vi.fn(async () => Promise.reject(new Error('disque plein'))) }
    const store = createDmxChannelsStore(() => api)
    await expect(store.getState().save(WASH, ['Red'])).rejects.toThrow('disque plein')
    expect(store.getState().lists).toEqual([])
  })

  it('deux enregistrements rapides de clés différentes : aucun n’est perdu', async () => {
    const api = fakeApi()
    const store = createDmxChannelsStore(() => api)
    await Promise.all([store.getState().save(WASH, ['Red']), store.getState().save({ ...WASH, mode: '13CH' }, ['Dim'])])
    expect(JSON.parse(api.text()!).lists).toHaveLength(2)
  })
})
