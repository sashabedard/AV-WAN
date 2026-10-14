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

  it("bascule l'IP d'un appareil en DHCP", async () => {
    const user = userEvent.setup()
    projectStore.getState().setSelection({ deviceIds: ['cam1'], linkIds: [] })
    render(<Inspector />)
    await user.click(screen.getByRole('button', { name: 'DHCP' }))
    expect(project().devices[1]!.ip).toEqual({ address: '10.40.0.21', mode: 'dhcp' })
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
})
