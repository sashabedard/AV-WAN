// src/renderer/src/panels/Inspector.test.tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Inspector } from './Inspector'
import { projectStore } from '../store/projectStore'
import { sampleProject } from '../model/__fixtures__/sample'

const project = () => projectStore.getState().history.present

beforeEach(() => projectStore.getState().loadProject(sampleProject(), null))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Inspector', () => {
  it('montre le projet quand rien n’est sélectionné, même après une sélection fantôme', () => {
    projectStore.getState().setSelection({ deviceIds: ['fantome'], linkIds: [] })
    render(<Inspector />)
    expect(screen.getByRole('heading', { name: 'Projet' })).toBeTruthy()
  })

  it('règle un câble en trunk : le réglage est écrit sur le port du switch', async () => {
    const user = userEvent.setup()
    projectStore.getState().setSelection({ deviceIds: [], linkIds: ['l1'] })
    render(<Inspector />)
    expect(screen.getByTestId('link-poe').textContent).toBe('PoE+ actif · 25 W')
    await user.selectOptions(screen.getByLabelText('Mode VLAN'), 'trunk')
    expect(project().devices[0]!.portState['1']).toEqual({ mode: 'trunk', nativeVlan: 40, taggedVlans: 'all' })
  })

  it('demande confirmation avant de retirer des câbles en réduisant un switch', async () => {
    const user = userEvent.setup()
    const s = projectStore.getState()
    s.updateSwitchSpec('sw1', { portCount: 8, poe: 'at', poeBudgetW: 120, sfpPlus: 0, managed: true })
    const avio = s.addDevice('dante-avio', { x: 0, y: 0 })
    s.connect({ deviceId: avio, portId: 'ETH' }, { deviceId: 'sw1', portId: '6' })
    s.setSelection({ deviceIds: ['sw1'], linkIds: [] })
    render(<Inspector />)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await user.click(screen.getByRole('button', { name: 'Modifier la configuration' }))
    await user.click(within(screen.getByRole('group', { name: 'Nombre de ports' })).getByRole('button', { name: '4' }))
    await user.click(screen.getByRole('button', { name: 'Appliquer' }))
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('C-002'))
    expect(project().devices[0]!.switch?.portCount).toBe(8)
    confirm.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Appliquer' }))
    expect(project().devices[0]!.switch?.portCount).toBe(4)
    expect(project().links).toHaveLength(1)
  })

  it('suit la sélection quand elle change', () => {
    render(<Inspector />)
    act(() => projectStore.getState().setSelection({ deviceIds: ['sw1'], linkIds: [] }))
    expect(screen.getByRole('heading', { name: 'Switch' })).toBeTruthy()
  })

  it('modifie une zone : nom, couleur, page séparée', async () => {
    const user = userEvent.setup()
    const s = projectStore.getState()
    s.setSelection({ deviceIds: ['cam1'], linkIds: [] })
    const id = s.zoneAroundSelection()!
    s.setSelection({ deviceIds: [], linkIds: [], zoneIds: [id] })
    render(<Inspector />)
    const zone = () => project().zones[0]!
    expect(screen.getByRole('heading', { name: 'Zone' })).toBeTruthy()
    expect(screen.getByText(/1 appareil dans cette zone/)).toBeTruthy()
    await user.clear(screen.getByLabelText('Nom de la zone'))
    await user.type(screen.getByLabelText('Nom de la zone'), 'Régie{Enter}')
    expect(zone().name).toBe('Régie')
    await user.click(screen.getByRole('radio', { name: 'Vert' }))
    expect(zone().color).toBe('#3DBE6E')
    await user.click(screen.getByLabelText('Page séparée dans le PDF'))
    expect(zone().ownPdfPage).toBe(true)
  })

  it('indique la zone d’un appareil', () => {
    const s = projectStore.getState()
    s.setSelection({ deviceIds: ['cam1'], linkIds: [] })
    s.zoneAroundSelection()
    s.setSelection({ deviceIds: ['cam1'], linkIds: [] })
    render(<Inspector />)
    expect(screen.getByText('Zone : Zone 1')).toBeTruthy()
  })

  it('demande d’ajouter un VLAN avant de choisir le mode Accès sur un projet sans VLAN', async () => {
    const user = userEvent.setup()
    const p = sampleProject()
    p.vlans = []
    p.devices[0]!.portState = {}
    projectStore.getState().loadProject(p, null)
    projectStore.getState().setSelection({ deviceIds: [], linkIds: ['l1'] })
    render(<Inspector />)
    await user.selectOptions(screen.getByLabelText('Mode VLAN'), 'access')
    expect(projectStore.getState().toast).toBe('Ajoutez d’abord un VLAN au projet (onglet VLAN, à gauche).')
    expect(project().devices[0]!.portState).toEqual({})
  })

  it('choisit le côté des prises et montre le VLAN de chaque port', async () => {
    const user = userEvent.setup()
    projectStore.getState().setSelection({ deviceIds: ['cam1'], linkIds: [] })
    render(<Inspector />)
    await user.selectOptions(screen.getByLabelText('Côté des prises'), 'left')
    expect(project().devices[1]!.portSide).toBe('left')
    act(() => projectStore.getState().setSelection({ deviceIds: ['sw1'], linkIds: [] }))
    expect(screen.queryByLabelText('Côté des prises')).toBeNull()
    const row = screen.getByText('CAM-1 · ETH').closest('tr')!
    expect(within(row).getByText('A · 40')).toBeTruthy()
  })

  it('montre où est réglé le VLAN d’un câble qui passe par un panneau de brassage', async () => {
    const user = userEvent.setup()
    const s = projectStore.getState()
    const pp = s.addDevice('patch-panel-24', { x: 0, y: 100 })
    s.removeElements([], ['l1'])
    s.connect({ deviceId: 'sw1', portId: '1' }, { deviceId: pp, portId: 'A1' })
    const l2 = s.connect({ deviceId: pp, portId: 'R1' }, { deviceId: 'cam1', portId: 'ETH' })!
    s.setSelection({ deviceIds: [], linkIds: [l2] })
    render(<Inspector />)
    // Le port 1 du switch garde son réglage (accès 40) : le câble en aval le montre.
    expect(screen.getByTestId('link-vlan-via').textContent).toBe('Réglé sur SW-1 · 1 : ce câble passe par un panneau de brassage.')
    expect((screen.getByLabelText('VLAN d’accès') as HTMLSelectElement).value).toBe('40')
    await user.selectOptions(screen.getByLabelText('Mode VLAN'), 'trunk')
    expect(project().devices.find((d) => d.id === 'sw1')!.portState['1']).toEqual({ mode: 'trunk', nativeVlan: 40, taggedVlans: 'all' })
  })
})
