// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Inspector } from '../Inspector'
import { isDirty, projectStore } from '../../store/projectStore'
import { dmxChannelsStore } from '../../store/dmxChannelsStore'
import { createDevice, createProject } from '../../model/project'
import { channelKey, removeList, resolveChannels, upsertList, type ChannelKey } from '../../model/dmxChannels'
import { fileTextOf } from '../../app/fileText'
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
// Comme le vrai store : la liste des réglages change après l'écriture.
const save = vi.fn(async (key: ChannelKey, params: readonly string[]) => {
  dmxChannelsStore.setState({ lists: upsertList(dmxChannelsStore.getState().lists, key, params) })
})
const remove = vi.fn(async (key: ChannelKey) => {
  dmxChannelsStore.setState({ lists: removeList(dmxChannelsStore.getState().lists, key) })
})
const MANUAL = { templateId: LYRE.id, mode: '3CH', params: ['Dimmer', 'Pan', 'Tilt'] }

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
    expect(present().dmxChannels).toEqual([MANUAL])
    expect(remove).toHaveBeenCalledWith({ templateId: LYRE.id, model: '', mode: '3CH' })
    expect(names('a')).toEqual(['Dimmer', 'Pan', 'Tilt'])
    expect(screen.getByText('Canaux · 3 — partagés par 2 appareils · d’après le manuel')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Rétablir le manuel' })).toBeNull()
  })

  it('appareil placé : ⌘Z après la première modification ramène le nom d’avant', async () => {
    const user = userEvent.setup()
    projectStore.getState().loadProject({ ...createProject(new Date(2026, 9, 15)), templates: [LYRE] }, null)
    const id = projectStore.getState().addDevice(LYRE.id, { x: 0, y: 0 })
    select(id)
    render(<Inspector />)
    await user.clear(screen.getByLabelText('Canal 2'))
    await user.type(screen.getByLabelText('Canal 2'), 'Pan 16{Enter}')
    expect(names(id)).toEqual(['Dimmer', 'Pan 16', 'Tilt'])
    act(() => projectStore.getState().undo())
    expect((screen.getByLabelText('Canal 2') as HTMLInputElement).value).toBe('Pan')
  })

  it('projet sans entrée qui lit les réglages : Rétablir écrit le manuel dans le projet, donc dans le fichier', async () => {
    const user = userEvent.setup()
    const mine = { templateId: LYRE.id, mode: '3CH', params: ['Dim', 'P', 'T'] }
    dmxChannelsStore.setState({ lists: [mine] })
    select('a')
    render(<Inspector />)
    expect(JSON.parse(fileTextOf(present())).dmxChannels).toEqual([mine]) // déjà enregistré ainsi (enregistrement automatique)
    expect(isDirty(projectStore.getState())).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Rétablir le manuel' }))
    expect(present().dmxChannels).toEqual([MANUAL])
    expect(isDirty(projectStore.getState())).toBe(true)
    expect(JSON.parse(fileTextOf(present())).dmxChannels).toEqual([MANUAL])
    expect(screen.getByText('Canaux · 3 — partagés par 2 appareils · d’après le manuel')).toBeTruthy()
    act(() => projectStore.getState().undo())
    expect(present().dmxChannels).toBeUndefined()
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

  it('coller plusieurs lignes par-dessus un brouillon : une seule étape, le brouillon n’est pas validé', async () => {
    const user = userEvent.setup()
    select('w')
    render(<Inspector />)
    const before = present()
    await user.type(screen.getByLabelText('Canal 1'), 'abc')
    await user.paste('Red\nGreen')
    expect(names('w')).toEqual(['Red', 'Green'])
    expect((screen.getByLabelText('Canal 1') as HTMLInputElement).value).toBe('Red')
    expect(projectStore.getState().history.past).toHaveLength(1)
    expect(save).toHaveBeenCalledTimes(1)
    act(() => projectStore.getState().undo())
    expect(present()).toBe(before)
  })

  // Le <datalist> natif d’Electron ne défile pas : les dernières suggestions étaient hors d’atteinte.
  it('suggestions : liste maison qui défile, toutes les suggestions atteignables', async () => {
    const user = userEvent.setup()
    select('w')
    const { container } = render(<Inspector />)
    expect(container.querySelector('datalist')).toBeNull()
    await user.click(screen.getByLabelText('Canal 1'))
    const list = screen.getByRole('listbox', { name: 'Suggestions' })
    expect(list.classList.contains('suggest')).toBe(true)
    expect(within(list).getAllByRole('option')).toHaveLength(32)
    expect(within(list).getByRole('option', { name: 'Function' })).toBeTruthy()
  })

  it('suggestions : la frappe filtre ; flèches + Entrée choisit en une étape et passe au canal suivant ; Échap ferme sans annuler', async () => {
    const user = userEvent.setup()
    select('w')
    render(<Inspector />)
    await user.type(screen.getByLabelText('Canal 1'), 'gob')
    const list = screen.getByRole('listbox', { name: 'Suggestions' })
    expect(within(list).getAllByRole('option').map((o) => o.textContent)).toEqual(['Gobo', 'Gobo rotation'])
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(names('w')).toEqual(['Gobo rotation'])
    expect(projectStore.getState().history.past).toHaveLength(1)
    expect(save).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(screen.getByLabelText('Canal 2'))
    expect(screen.queryByRole('listbox')).toBeNull()
    await user.keyboard('zo')
    expect(screen.getByRole('option', { name: 'Zoom' })).toBeTruthy()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(document.activeElement).toBe(screen.getByLabelText('Canal 2'))
    expect((screen.getByLabelText('Canal 2') as HTMLInputElement).value).toBe('zo')
  })

  it('suggestions : un clic choisit et valide en une étape', async () => {
    const user = userEvent.setup()
    select('w')
    render(<Inspector />)
    await user.click(screen.getByLabelText('Canal 3'))
    await user.click(screen.getByRole('option', { name: 'Zoom' }))
    expect(names('w')).toEqual(['', '', 'Zoom'])
    expect(projectStore.getState().history.past).toHaveLength(1)
    expect(save).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('listbox')).toBeNull()
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

  it('lecture seule : un collage trop long garde le message de lecture seule, rien n’est écrit', async () => {
    const user = userEvent.setup()
    projectStore.setState({ readOnly: true })
    select('w')
    render(<Inspector />)
    await user.click(screen.getByLabelText('Canal 5'))
    await user.paste(Array.from({ length: 10 }, (_, i) => `P${i + 1}`).join('\n'))
    expect(present().dmxChannels).toBeUndefined()
    expect(save).not.toHaveBeenCalled()
    expect(projectStore.getState().toast).toMatch(/lecture seule/)
  })
})
