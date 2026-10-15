// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDmxChannelsLoad } from './useDmxChannelsLoad'
import { dmxChannelsStore } from '../store/dmxChannelsStore'

const text = (params: string[]): string => JSON.stringify({ lists: [{ templateId: 'dmx-fixture', params }] })

afterEach(() => {
  dmxChannelsStore.setState({ lists: [] })
  delete (window as unknown as { avwan?: unknown }).avwan
})

describe('useDmxChannelsLoad', () => {
  it('lit les réglages au démarrage, puis à chaque retour sur la fenêtre', async () => {
    const read = vi.fn(async () => text(['Red']))
    ;(window as unknown as { avwan: unknown }).avwan = { dmxChannels: { read, write: vi.fn() } }
    renderHook(() => useDmxChannelsLoad())
    await waitFor(() => expect(dmxChannelsStore.getState().lists[0]?.params).toEqual(['Red']))
    read.mockResolvedValue(text(['Green']))
    window.dispatchEvent(new Event('focus'))
    await waitFor(() => expect(dmxChannelsStore.getState().lists[0]?.params).toEqual(['Green']))
  })
})
