// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Inspector } from '../Inspector'
import { projectStore } from '../../store/projectStore'
import { uiStore } from '../../store/uiStore'
import { createDevice, createProject } from '../../model/project'
import type { Device, StoredTemplate, Project } from '../../model/types'

const LYRE: StoredTemplate = {
  id: 'custom-lyre000001', category: 'eclairage', name: 'Lyre', code: 'MH', icon: { kind: 'builtin', name: 'fixture' },
  ports: [{ id: 'DMX-IN', label: 'DMX IN', connector: 'dmx' }], dmx: { footprint: 31, modes: [{ name: 'Standard', channels: 31 }, { name: 'Basic', channels: 16 }] }, isCustom: true
}

function project(): Project {
  let p: Project = { ...createProject(new Date(2026, 9, 14)), templates: [LYRE] }
  const add = (id: string, templateId: string, extra: Partial<Device> = {}): void => {
    p = { ...p, devices: [...p.devices, { ...createDevice(p, templateId, { x: 0, y: 0 }, { id }), ...extra }] }
  }
  add('ode', 'dmx-node', { name: 'ODE-1', portState: { 'DMX-2': { universe: 2 } } })
  add('f1', 'dmx-fixture', { dmx: { footprint: 16 } })
  add('f2', 'dmx-fixture', { dmx: { footprint: 16, address: 1, universe: 2 } })
  add('lone', 'dmx-fixture', { dmx: { footprint: 16 } })
  add('mh', LYRE.id)
  p = { ...p, links: [{ id: 'l1', cableId: 'C-001', a: { deviceId: 'ode', portId: 'DMX-2' }, b: { deviceId: 'f1', portId: 'DMX-IN' }, medium: 'dmx' }] }
  return p
}
const dev = (id: string) => projectStore.getState().history.present.devices.find((d) => d.id === id)!
const select = (id: string): void => projectStore.getState().setSelection({ deviceIds: [id], linkIds: [] })

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  projectStore.getState().loadProject(project(), null)
})
afterEach(() => {
  act(() => uiStore.getState().setLang('fr'))
  cleanup()
  projectStore.getState().clearToast()
  vi.restoreAllMocks()
})

describe('bloc Patch DMX', () => {
  it('montre l’univers déduit en gris dans le champ vide', () => {
    select('f1')
    render(<Inspector />)
    expect(screen.getByLabelText('Univers DMX').getAttribute('placeholder')).toBe('2 · via ODE-1 › DMX 2')
  })

  it('tape une adresse et affiche la plage', async () => {
    const user = userEvent.setup()
    select('f1')
    render(<Inspector />)
    await user.type(screen.getByLabelText('Adresse DMX'), '33{Enter}')
    expect(dev('f1').dmx).toEqual({ footprint: 16, address: 33 })
    expect(screen.getByText('33–48')).toBeTruthy()
  })

  it('refuse une adresse hors bornes avec un message', async () => {
    const user = userEvent.setup()
    select('f1')
    render(<Inspector />)
    await user.type(screen.getByLabelText('Adresse DMX'), '600{Enter}')
    expect(dev('f1').dmx).toEqual({ footprint: 16 })
    expect(projectStore.getState().toast).toBe('Adresse DMX : un nombre entier de 1 à 512.')
  })

  it('« Suivante libre » saute la plage occupée de FIX-2', async () => {
    const user = userEvent.setup()
    select('f1')
    render(<Inspector />)
    await user.click(screen.getByRole('button', { name: 'Suivante libre' }))
    expect(dev('f1').dmx?.address).toBe(17)
  })

  it('« Suivante libre » est grisé sans univers', () => {
    select('lone')
    render(<Inspector />)
    expect((screen.getByRole('button', { name: 'Suivante libre' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('vider l’univers tapé revient à l’univers déduit, vider les canaux ne fait rien', async () => {
    const user = userEvent.setup()
    projectStore.getState().updateDevice('f1', { dmx: { footprint: 16, universe: 9 } })
    select('f1')
    render(<Inspector />)
    await user.clear(screen.getByLabelText('Univers DMX'))
    await user.tab()
    expect(dev('f1').dmx).toEqual({ footprint: 16 })
    await user.clear(screen.getByLabelText('Canaux DMX'))
    await user.tab()
    expect(dev('f1').dmx?.footprint).toBe(16)
  })

  it('le mode d’un modèle connu règle les canaux', async () => {
    const user = userEvent.setup()
    select('mh')
    render(<Inspector />)
    expect(dev('mh').dmx).toEqual({ footprint: 31, mode: 'Standard' })
    await user.selectOptions(screen.getByLabelText('Mode DMX'), 'Basic')
    expect(dev('mh').dmx).toEqual({ footprint: 16, mode: 'Basic' })
  })

  it('signale un chevauchement sans bloquer', async () => {
    const user = userEvent.setup()
    select('f1')
    render(<Inspector />)
    await user.type(screen.getByLabelText('Adresse DMX'), '10{Enter}')
    expect(dev('f1').dmx?.address).toBe(10)
    expect(screen.getByText('Chevauche FIX-2 (1–16)')).toBeTruthy()
  })

  it('signale discrètement un univers tapé que le câble contredit', () => {
    projectStore.getState().updateDevice('f1', { dmx: { footprint: 16, universe: 9 } })
    select('f1')
    render(<Inspector />)
    expect(screen.getByText('Univers tapé 9 ; le câble donne 2').className).toBe('insp__warn')
  })
})

describe('colonne Univers des ports', () => {
  it('règle l’univers d’une sortie de nœud', async () => {
    const user = userEvent.setup()
    select('ode')
    render(<Inspector />)
    await user.type(screen.getByLabelText('Univers DMX 1'), '0{Enter}')
    expect(dev('ode').portState['DMX-1']?.universe).toBe(0)
  })

  it('pas de colonne Univers sur un appareil patchable', () => {
    select('f1')
    render(<Inspector />)
    expect(screen.queryByRole('columnheader', { name: 'Univers' })).toBeNull()
  })
})

describe('bloc Patch DMX en anglais', () => {
  it('affiche les libellés et les messages en anglais', async () => {
    const user = userEvent.setup()
    act(() => uiStore.getState().setLang('en'))
    select('f1')
    render(<Inspector />)
    expect(screen.getByRole('heading', { name: 'DMX patch' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next free' })).toBeTruthy()
    await user.type(screen.getByLabelText('DMX address'), '600{Enter}')
    expect(projectStore.getState().toast).toBe('DMX address: a whole number from 1 to 512.')
  })
})
