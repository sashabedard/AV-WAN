// src/renderer/src/panels/inspector/PowerSections.test.tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Inspector } from '../Inspector'
import { projectStore } from '../../store/projectStore'
import { createDevice, createProject } from '../../model/project'
import type { Device, Project } from '../../model/types'

function project(): Project {
  let p: Project = createProject(new Date(2026, 9, 14))
  const add = (id: string, templateId: string, extra: Partial<Device> = {}): void => {
    p = { ...p, devices: [...p.devices, { ...createDevice(p, templateId, { x: 0, y: 0 }, { id }), ...extra }] }
  }
  add('psu', 'psu', { name: 'PSU-1', psu: { volts: 24, amps: 15 } })
  add('led1', 'led-strip', { name: 'LED-1', ledStrip: { type: 'cob', volts: 24, wPerM: 14.4, lengthM: 10 } })
  add('led2', 'led-strip', { name: 'LED-2', ledStrip: { type: 'cob', volts: 24, wPerM: 14.4, lengthM: 10 } })
  add('fix', 'dmx-fixture')
  p = {
    ...p,
    links: [
      { id: 'l1', cableId: 'C-001', a: { deviceId: 'psu', portId: 'DC-OUT-1' }, b: { deviceId: 'led1', portId: 'DC-IN' }, medium: 'dc' },
      { id: 'l2', cableId: 'C-002', a: { deviceId: 'psu', portId: 'DC-OUT-2' }, b: { deviceId: 'led2', portId: 'DC-IN' }, medium: 'dc' }
    ]
  }
  return p
}
const dev = (id: string) => projectStore.getState().history.present.devices.find((d) => d.id === id)!
const select = (id: string): void => projectStore.getState().setSelection({ deviceIds: [id], linkIds: [] })

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  projectStore.getState().loadProject(project(), null)
})
afterEach(() => {
  cleanup()
  projectStore.getState().clearToast()
  vi.restoreAllMocks()
})

describe('puissance d’un appareil', () => {
  it('accepte la virgule et refuse le texte', async () => {
    const user = userEvent.setup()
    select('fix')
    render(<Inspector />)
    await user.type(screen.getByLabelText('Puissance (W)'), '470,5{Enter}')
    expect(dev('fix').powerW).toBe(470.5)
    await user.clear(screen.getByLabelText('Puissance (W)'))
    await user.type(screen.getByLabelText('Puissance (W)'), 'abc{Enter}')
    expect(dev('fix').powerW).toBe(470.5)
    expect(projectStore.getState().toast).toBe('Puissance : un nombre positif ou nul, en watts.')
  })

  it('n’est pas un champ libre pour une bande (calculée)', () => {
    select('led1')
    render(<Inspector />)
    expect(screen.queryByLabelText('Puissance (W)')).toBeNull()
  })
})

describe('alimentation', () => {
  it('calcule la puissance et affiche la charge à 80 %', () => {
    select('psu')
    render(<Inspector />)
    expect(screen.getByLabelText('Puissance (W)').getAttribute('placeholder')).toBe('360')
    expect(screen.getByText('Charge : 288 W / 360 W (80 %)')).toBeTruthy()
    expect(screen.getByText('Alimente : LED-1 (144 W), LED-2 (144 W)')).toBeTruthy()
    expect(screen.queryByText('Marge de 20 % dépassée')).toBeNull()
  })

  it('signale la surcharge quand le courant baisse', async () => {
    const user = userEvent.setup()
    select('psu')
    render(<Inspector />)
    await user.clear(screen.getByLabelText('Courant (A)'))
    await user.type(screen.getByLabelText('Courant (A)'), '10{Enter}')
    expect(dev('psu').psu).toEqual({ volts: 24, amps: 10 })
    expect(screen.getByText('Charge : 288 W / 240 W (120 %)')).toBeTruthy()
    expect(screen.getByText('Surcharge')).toBeTruthy()
  })

  it('signale V × I différent de la puissance tapée', async () => {
    const user = userEvent.setup()
    select('psu')
    render(<Inspector />)
    await user.type(screen.getByLabelText('Puissance (W)'), '350{Enter}')
    expect(screen.getByText('V × I = 360 W')).toBeTruthy()
  })
})

describe('bande LED', () => {
  it('le type préremplit, puis W, A, pixels, canaux et univers se calculent', async () => {
    const user = userEvent.setup()
    select('led1')
    render(<Inspector />)
    await user.selectOptions(screen.getByLabelText('Type de bande'), 'sk6812-rgbw')
    await user.selectOptions(screen.getByLabelText('Tension de la bande'), '24')
    await user.clear(screen.getByLabelText('Puissance (W/m)'))
    await user.type(screen.getByLabelText('Puissance (W/m)'), '14,4{Enter}')
    await user.clear(screen.getByLabelText('Longueur (m)'))
    await user.type(screen.getByLabelText('Longueur (m)'), '5{Enter}')
    expect(dev('led1').ledStrip).toEqual({ type: 'sk6812-rgbw', volts: 24, wPerM: 14.4, lengthM: 5, pxPerM: 60 })
    expect(screen.getByText('→ 72 W · 3,0 A')).toBeTruthy()
    expect(screen.getByText('→ 300 px · 1 200 ch · 3 univers')).toBeTruthy()
  })

  it('vider la longueur rend la puissance « à définir »', async () => {
    const user = userEvent.setup()
    select('led1')
    render(<Inspector />)
    await user.clear(screen.getByLabelText('Longueur (m)'))
    await user.tab()
    expect(dev('led1').ledStrip?.lengthM).toBeUndefined()
    expect(screen.getByText('→ longueur à définir')).toBeTruthy()
  })

  it('refuse une longueur nulle', async () => {
    const user = userEvent.setup()
    select('led1')
    render(<Inspector />)
    await user.clear(screen.getByLabelText('Longueur (m)'))
    await user.type(screen.getByLabelText('Longueur (m)'), '0{Enter}')
    expect(dev('led1').ledStrip?.lengthM).toBe(10)
    expect(projectStore.getState().toast).toBe('Longueur : un nombre plus grand que 0, en mètres.')
  })
})

describe('tension secteur du projet', () => {
  it('se règle dans la fiche du projet', async () => {
    const user = userEvent.setup()
    render(<Inspector />)
    await user.click(screen.getByRole('button', { name: '230 V' }))
    expect(projectStore.getState().history.present.settings.mainsVoltage).toBe(230)
  })
})
