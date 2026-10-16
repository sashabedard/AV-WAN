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
  let p: Project = { ...createProject(new Date(2026, 9, 14), 'fr'), templates: [LYRE] }
  const add = (id: string, templateId: string, extra: Partial<Device> = {}): void => {
    p = { ...p, devices: [...p.devices, { ...createDevice(p, templateId, { x: 0, y: 0 }, { lang: 'fr', id }), ...extra }] }
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
    await user.clear(screen.getByLabelText('Adresse DMX')) // f1 est en chaîne : son champ affiche déjà l'adresse calculée
    await user.type(screen.getByLabelText('Adresse DMX'), '33{Enter}')
    expect(dev('f1').dmx).toEqual({ footprint: 16, address: 33, addressPinned: true })
    expect(screen.getByText('33–48')).toBeTruthy()
  })

  it('refuse une adresse hors bornes avec un message', async () => {
    const user = userEvent.setup()
    select('lone')
    render(<Inspector />)
    await user.type(screen.getByLabelText('Adresse DMX'), '600{Enter}')
    expect(dev('lone').dmx).toEqual({ footprint: 16 })
    expect(projectStore.getState().toast).toBe('Adresse DMX : un nombre entier de 1 à 512.')
  })

  it('« Suivante libre » saute la plage occupée de FIX-2', async () => {
    const user = userEvent.setup()
    projectStore.getState().updateDevice('f1', { dmx: { footprint: 16, address: 1, addressPinned: true } }) // fixée : la chaîne ne la recalcule pas
    select('f1')
    render(<Inspector />)
    await user.click(screen.getByRole('button', { name: 'Suivante libre' }))
    expect(dev('f1').dmx?.address).toBe(17)
  })

  it('une adresse tapée sur un appareil en chaîne est fixée et survit au recalcul', async () => {
    const user = userEvent.setup()
    select('f1')
    render(<Inspector />)
    await user.clear(screen.getByLabelText('Adresse DMX'))
    await user.type(screen.getByLabelText('Adresse DMX'), '101{Enter}')
    expect(dev('f1').dmx?.addressPinned).toBe(true)
    expect(dev('f1').dmx?.address).toBe(101)
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
    expect(dev('f1').dmx).toEqual({ footprint: 16, address: 1 }) // redevenu automatique : la chaîne lui donne 1
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
    await user.clear(screen.getByLabelText('Adresse DMX'))
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
    select('lone') // hors chaîne : « Next free » reste affiché
    render(<Inspector />)
    expect(screen.getByRole('heading', { name: 'DMX patch' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next free' })).toBeTruthy()
    await user.type(screen.getByLabelText('DMX address'), '600{Enter}')
    expect(projectStore.getState().toast).toBe('DMX address: a whole number from 1 to 512.')
  })
})

describe('mode DMX d’un modèle du catalogue en anglais', () => {
  it('affiche « Extended (EXT) » mais garde la clé « Étendu (EXT) »', async () => {
    const p = projectStore.getState().history.present
    const aura = { ...createDevice(p, 'martin-mac-aura-xb', { x: 0, y: 0 }, { lang: 'fr', id: 'aura' }), dmx: { footprint: 25, mode: 'Étendu (EXT)' } }
    projectStore.getState().loadProject({ ...p, devices: [...p.devices, aura] }, null)
    select('aura')
    act(() => uiStore.getState().setLang('en'))
    render(<Inspector />)
    const sel = screen.getByRole('combobox', { name: /mode/i }) as HTMLSelectElement
    expect(sel.value).toBe('Étendu (EXT)')
    expect(sel.selectedOptions[0]!.textContent).toBe('Extended (EXT) · 25 ch')
    expect(dev('aura').dmx?.mode).toBe('Étendu (EXT)')
  })
})

// Banc de chaîne : ode DMX 1 (univers 1) → a → b → c, plus un appareil hors chaîne.
function chainBench(count = 3, footprint = 16): Project {
  let p: Project = createProject(new Date(2026, 9, 14), 'fr')
  const add = (id: string, templateId: string, extra: Partial<Device> = {}): void => {
    p = { ...p, devices: [...p.devices, { ...createDevice(p, templateId, { x: 0, y: 0 }, { lang: 'fr', id }), ...extra }] }
  }
  add('ode', 'dmx-node', { name: 'ODE-1', portState: { 'DMX-1': { universe: 1 } } })
  const ids = Array.from({ length: count }, (_, i) => `d${i + 1}`)
  ids.forEach((id) => add(id, 'dmx-fixture', { dmx: { footprint } }))
  add('lone', 'dmx-fixture', { dmx: { footprint: 16 } })
  const links = ids.map((id, i) => ({
    id: `k${i}`, cableId: `C-00${i + 1}`, medium: 'dmx' as const,
    a: i === 0 ? { deviceId: 'ode', portId: 'DMX-1' } : { deviceId: ids[i - 1]!, portId: 'DMX-OUT' },
    b: { deviceId: id, portId: 'DMX-IN' }
  }))
  return { ...p, links }
}

describe('bloc Patch DMX : automatique ou fixée', () => {
  beforeEach(() => projectStore.getState().loadProject(chainBench(), null))

  it('taper 101 sur d2 la fixe, et d3 suit à 117', async () => {
    const user = userEvent.setup()
    select('d2')
    render(<Inspector />)
    await user.clear(screen.getByLabelText('Adresse DMX'))
    await user.type(screen.getByLabelText('Adresse DMX'), '101{Enter}')
    expect(dev('d2').dmx?.addressPinned).toBe(true)
    expect(dev('d3').dmx?.address).toBe(117)
  })

  it('le bouton auto fixe l’adresse actuelle, le bouton fixée la libère', async () => {
    const user = userEvent.setup()
    select('d2')
    render(<Inspector />)
    const toggle = screen.getByRole('button', { name: 'auto' })
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    expect(toggle.getAttribute('title')).toBe('Fixer cette adresse : la chaîne repart d’ici')
    await user.click(toggle)
    expect(dev('d2').dmx).toEqual({ footprint: 16, address: 17, addressPinned: true })
    const pinned = screen.getByRole('button', { name: /fixée/ })
    expect(pinned.getAttribute('aria-pressed')).toBe('true')
    expect(pinned.getAttribute('title')).toBe('Libérer : l’adresse suit la chaîne')
    projectStore.getState().updateDevice('d1', { dmx: { footprint: 20 } }) // la chaîne se décale, d2 fixée reste
    expect(dev('d2').dmx?.address).toBe(17)
    await user.click(pinned)
    expect(dev('d2').dmx?.addressPinned).toBeUndefined()
    expect(dev('d2').dmx?.address).toBe(21)
  })

  it('cacher « Suivante libre » pour un appareil automatique en chaîne, le garder fixé ou hors chaîne', async () => {
    const user = userEvent.setup()
    select('d2')
    const { rerender } = render(<Inspector />)
    expect(screen.queryByRole('button', { name: 'Suivante libre' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'auto' }))
    expect(screen.getByRole('button', { name: 'Suivante libre' })).toBeTruthy()
    act(() => select('lone'))
    rerender(<Inspector />)
    expect(screen.getByRole('button', { name: 'Suivante libre' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'auto' })).toBeNull()
    expect(screen.queryByRole('button', { name: /fixée/ })).toBeNull()
  })

  it('signale une chaîne qui dépasse 512 canaux', () => {
    projectStore.getState().loadProject(chainBench(33), null)
    select('d33')
    render(<Inspector />)
    expect(screen.getByText('La chaîne dépasse 512 canaux dans l’univers 1').className).toBe('insp__warn')
  })

  it('affiche « pinned » et l’avertissement en anglais', () => {
    projectStore.getState().loadProject(chainBench(33), null)
    projectStore.getState().updateDevice('d1', { dmx: { footprint: 16, address: 1, addressPinned: true } })
    act(() => uiStore.getState().setLang('en'))
    select('d1')
    const { unmount } = render(<Inspector />)
    expect(screen.getByRole('button', { name: /pinned/ }).getAttribute('aria-pressed')).toBe('true')
    unmount()
    select('d33')
    render(<Inspector />)
    expect(screen.getByText('The chain exceeds 512 channels in universe 1')).toBeTruthy()
  })
})
