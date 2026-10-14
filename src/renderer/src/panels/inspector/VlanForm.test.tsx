// src/renderer/src/panels/inspector/VlanForm.test.tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Inspector } from '../Inspector'
import { projectStore } from '../../store/projectStore'
import { uiStore } from '../../store/uiStore'
import { sampleProject } from '../../model/__fixtures__/sample'
import { vlanPreset } from '../../catalog/vlanPresets'

const vlan = (id: number) => projectStore.getState().history.present.vlans.find((v) => v.id === id)

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  projectStore.getState().loadProject(sampleProject(), null)
  uiStore.getState().setInspectVlan(40)
})
afterEach(() => {
  cleanup()
  uiStore.getState().setInspectVlan(null)
  vi.restoreAllMocks()
})

describe('fiche VLAN', () => {
  it('affiche la fiche quand rien n’est sélectionné sur le canvas', () => {
    render(<Inspector />)
    expect(screen.getByRole('heading', { name: 'VLAN 40' })).toBeTruthy()
    expect(screen.getByText('2 appareils · 1 câble')).toBeTruthy()
  })

  it('règle les options UniFi sous leurs noms exacts', async () => {
    const user = userEvent.setup()
    render(<Inspector />)
    await user.click(screen.getByRole('switch', { name: 'Fast Leave' }))
    expect(vlan(40)!.unifi.fastLeave).toBe(false)
    await user.selectOptions(screen.getByLabelText('Forward Unknown Multicast Traffic'), 'drop')
    expect(vlan(40)!.unifi.forwardUnknownMulticast).toBe('drop')
    await user.selectOptions(screen.getByLabelText('ProAV'), 'Dante Audio')
    expect(vlan(40)!.unifi.proAvProfile).toBe('Dante Audio')
    await user.click(screen.getByRole('switch', { name: 'IGMP Snooping' }))
    expect(vlan(40)!.unifi.igmpSnooping).toBe(false)
    expect(screen.queryByRole('switch', { name: 'Create New Querier Switch' })).toBeNull()
  })

  it('renumérote en suivant la fiche, et refuse un numéro déjà pris', async () => {
    const user = userEvent.setup()
    projectStore.getState().addVlan(vlanPreset(10))
    render(<Inspector />)
    const id = screen.getByLabelText('Numéro du VLAN')
    await user.clear(id)
    await user.type(id, '10{Enter}')
    expect(projectStore.getState().toast).toBe('Le VLAN 10 existe déjà.')
    await user.clear(screen.getByLabelText('Numéro du VLAN'))
    await user.type(screen.getByLabelText('Numéro du VLAN'), '41{Enter}')
    expect(vlan(41)).toBeTruthy()
    expect(uiStore.getState().inspectVlanId).toBe(41)
    expect(screen.getByRole('heading', { name: 'VLAN 41' })).toBeTruthy()
  })

  it('retire le VLAN après confirmation', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<Inspector />)
    await user.click(screen.getByRole('button', { name: 'Retirer ce VLAN' }))
    expect(confirm).toHaveBeenCalled()
    expect(vlan(40)).toBeUndefined()
    expect(uiStore.getState().inspectVlanId).toBeNull()
  })

  it('un numéro refusé revient à la valeur du projet', async () => {
    const user = userEvent.setup()
    projectStore.getState().addVlan(vlanPreset(10))
    render(<Inspector />)
    const id = screen.getByLabelText<HTMLInputElement>('Numéro du VLAN')
    await user.clear(id)
    await user.type(id, '10{Enter}')
    expect(projectStore.getState().toast).toBe('Le VLAN 10 existe déjà.')
    expect(id.value).toBe('40')
  })

  it('en lecture seule, un nom modifié est refusé et le champ revient', async () => {
    const user = userEvent.setup()
    projectStore.getState().loadProject(sampleProject(), null, { readOnly: true })
    uiStore.getState().setInspectVlan(40)
    render(<Inspector />)
    const name = screen.getByLabelText<HTMLInputElement>('Nom du VLAN')
    const original = name.value
    await user.clear(name)
    await user.type(name, 'Autre{Enter}')
    expect(projectStore.getState().toast).toBeTruthy()
    expect(name.value).toBe(original)
    expect(vlan(40)!.name).toBe(original)
  })

  it('une modification sans effet ne crée pas d’entrée d’historique', async () => {
    const user = userEvent.setup()
    render(<Inspector />)
    const before = projectStore.getState().history.past.length
    const short = screen.getByLabelText('Nom court')
    await user.clear(short)
    await user.type(short, 'ndi{Enter}')
    expect(projectStore.getState().history.past.length).toBe(before)
  })

  it('en lecture seule, retirer le VLAN laisse la fiche ouverte', async () => {
    const user = userEvent.setup()
    projectStore.getState().loadProject(sampleProject(), null, { readOnly: true })
    uiStore.getState().setInspectVlan(40)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<Inspector />)
    await user.click(screen.getByRole('button', { name: 'Retirer ce VLAN' }))
    expect(vlan(40)).toBeTruthy()
    expect(uiStore.getState().inspectVlanId).toBe(40)
  })
})
