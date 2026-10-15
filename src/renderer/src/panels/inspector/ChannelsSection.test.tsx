// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Inspector } from '../Inspector'
import { projectStore } from '../../store/projectStore'
import { dmxChannelsStore } from '../../store/dmxChannelsStore'
import { createDevice, createProject } from '../../model/project'
import { channelKey, resolveChannels } from '../../model/dmxChannels'
import type { Device, DeviceTemplate, Project } from '../../model/types'

const LYRE: DeviceTemplate = {
  id: 'custom-lyre000001', category: 'eclairage', name: 'Lyre', code: 'MH', icon: { kind: 'builtin', name: 'fixture' },
  ports: [{ id: 'DMX-IN', label: 'DMX IN', connector: 'dmx' }],
  dmx: { footprint: 3, modes: [{ name: '3CH', channels: 3, params: ['Dimmer', 'Pan', 'Tilt'] }, { name: '2CH', channels: 2 }] },
  isCustom: true
}

function project(): Project {
  let p: Project = { ...createProject(new Date(2026, 9, 15)), templates: [LYRE] }
  const add = (id: string, templateId: string, extra: Partial<Device> = {}): void => {
    p = { ...p, devices: [...p.devices, { ...createDevice(p, templateId, { x: 0, y: 0 }, { id }), ...extra }] }
  }
  add('a', LYRE.id)
  add('b', LYRE.id)
  add('w', 'dmx-fixture', { model: 'Wash', dmx: { footprint: 9, mode: '9CH' } })
  return p
}
const present = (): Project => projectStore.getState().history.present
const dev = (id: string): Device => present().devices.find((d) => d.id === id)!
const names = (id: string): string[] | undefined => resolveChannels(present(), dmxChannelsStore.getState().lists, channelKey(dev(id))!)?.params
const select = (id: string): void => projectStore.getState().setSelection({ deviceIds: [id], linkIds: [] })
const original = dmxChannelsStore.getState()
const save = vi.fn(async () => undefined)
const remove = vi.fn(async () => undefined)

beforeEach(() => {
  projectStore.getState().loadProject(project(), null)
  dmxChannelsStore.setState({ lists: [], save, remove })
})
afterEach(() => {
  cleanup()
  dmxChannelsStore.setState(original, true)
  save.mockClear()
  remove.mockClear()
})

describe('inspecteur : canaux DMX', () => {
  it('liste du catalogue, partagée, une ligne par canal', () => {
    select('a')
    render(<Inspector />)
    expect(screen.getByText('Canaux · 3 — partagés par 2 appareils · d’après le manuel')).toBeTruthy()
    expect((screen.getByLabelText('Canal 2') as HTMLInputElement).value).toBe('Pan')
    expect(screen.queryByLabelText('Canal 4')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Rétablir le manuel' })).toBeNull()
  })

  it('Entrée valide et passe au canal suivant ; projet et réglages écrits ; Rétablir revient au manuel', async () => {
    const user = userEvent.setup()
    select('a')
    render(<Inspector />)
    await user.clear(screen.getByLabelText('Canal 2'))
    await user.type(screen.getByLabelText('Canal 2'), 'Pan 16{Enter}')
    expect(document.activeElement).toBe(screen.getByLabelText('Canal 3'))
    expect(names('b')).toEqual(['Dimmer', 'Pan 16', 'Tilt'])
    expect(save).toHaveBeenCalledWith({ templateId: LYRE.id, model: '', mode: '3CH' }, ['Dimmer', 'Pan 16', 'Tilt'])
    expect(screen.getByText('Canaux · 3 — partagés par 2 appareils · modifiée')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Rétablir le manuel' }))
    expect(present().dmxChannels).toBeUndefined()
    expect(remove).toHaveBeenCalledWith({ templateId: LYRE.id, model: '', mode: '3CH' })
    expect(names('a')).toEqual(['Dimmer', 'Pan', 'Tilt'])
  })

  it('coller plusieurs lignes remplit les canaux suivants et signale le surplus', async () => {
    const user = userEvent.setup()
    select('w')
    render(<Inspector />)
    expect(screen.getByText('Canaux · 9')).toBeTruthy()
    await user.click(screen.getByLabelText('Canal 1'))
    await user.paste('Red\nGreen\nBlue\n')
    expect(names('w')).toEqual(['Red', 'Green', 'Blue'])
    await user.click(screen.getByLabelText('Canal 5'))
    await user.paste(Array.from({ length: 10 }, (_, i) => `P${i + 1}`).join('\n'))
    expect(names('w')).toEqual(['Red', 'Green', 'Blue', '', 'P1', 'P2', 'P3', 'P4', 'P5'])
    expect(projectStore.getState().toast).toBe('5 lignes ignorées après le canal 9.')
  })

  it('moins de canaux puis autant qu’avant : les noms reviennent', () => {
    projectStore.getState().setChannelList({ templateId: 'dmx-fixture', model: 'Wash', mode: '9CH' }, ['A', 'B', 'C', 'D', 'E'])
    select('w')
    render(<Inspector />)
    act(() => projectStore.getState().updateDevice('w', { dmx: { footprint: 3, mode: '9CH' } }))
    expect(screen.queryByLabelText('Canal 4')).toBeNull()
    act(() => projectStore.getState().updateDevice('w', { dmx: { footprint: 9, mode: '9CH' } }))
    expect((screen.getByLabelText('Canal 5') as HTMLInputElement).value).toBe('E')
  })

  it('changer de mode donne la liste de l’autre mode ; l’autre appareil garde la sienne', async () => {
    const user = userEvent.setup()
    select('a')
    render(<Inspector />)
    await user.selectOptions(screen.getByLabelText('Mode DMX'), '2CH')
    expect(screen.getByText('Canaux · 2')).toBeTruthy()
    expect((screen.getByLabelText('Canal 1') as HTMLInputElement).value).toBe('')
    expect(names('b')).toEqual(['Dimmer', 'Pan', 'Tilt'])
  })

  it('fichier en lecture seule : rien n’est écrit, ni projet ni réglages', async () => {
    const user = userEvent.setup()
    projectStore.setState({ readOnly: true })
    select('w')
    render(<Inspector />)
    await user.type(screen.getByLabelText('Canal 1'), 'Red{Enter}')
    expect(present().dmxChannels).toBeUndefined()
    expect(save).not.toHaveBeenCalled()
    expect(projectStore.getState().toast).toMatch(/lecture seule/)
  })
})
