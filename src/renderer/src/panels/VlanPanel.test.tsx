// src/renderer/src/panels/VlanPanel.test.tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sidebar } from './Sidebar'
import { projectStore } from '../store/projectStore'
import { uiStore } from '../store/uiStore'
import { sampleProject } from '../model/__fixtures__/sample'

const project = () => projectStore.getState().history.present

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  projectStore.getState().loadProject(sampleProject(), null)
  uiStore.getState().setSidebarTab('vlans')
  uiStore.getState().setInspectVlan(null)
})
afterEach(() => {
  cleanup()
  uiStore.getState().setSidebarTab('devices')
})

describe('panneau VLAN', () => {
  it('bascule entre les onglets Appareils et VLAN', async () => {
    const user = userEvent.setup()
    render(<Sidebar />)
    await user.click(screen.getByRole('tab', { name: /Appareils/ }))
    expect(screen.getByRole('navigation', { name: 'Palette d’appareils' })).toBeTruthy()
    await user.click(screen.getByRole('tab', { name: /VLAN/ }))
    expect(screen.getByRole('list', { name: 'VLAN du projet' })).toBeTruthy()
  })

  it('liste les VLAN avec leur nombre d’appareils, et ouvre une fiche', async () => {
    const user = userEvent.setup()
    projectStore.getState().setSelection({ deviceIds: ['cam1'], linkIds: [] })
    render(<Sidebar />)
    const row = screen.getByRole('button', { name: /40 NDI/ })
    expect(within(row).getByLabelText('2 appareils')).toBeTruthy()
    await user.click(row)
    expect(uiStore.getState().inspectVlanId).toBe(40)
    expect(projectStore.getState().selection).toEqual({ deviceIds: [], linkIds: [] })
  })

  it('ajoute un preset ou un VLAN vide, et ouvre sa fiche', async () => {
    const user = userEvent.setup()
    render(<Sidebar />)
    await user.click(screen.getByRole('button', { name: 'Ajouter un VLAN' }))
    await user.click(screen.getByRole('button', { name: '30 · Dante A' }))
    expect(project().vlans.map((v) => v.id)).toEqual([30, 40])
    expect(uiStore.getState().inspectVlanId).toBe(30)
    await user.click(screen.getByRole('button', { name: 'Ajouter un VLAN' }))
    await user.click(screen.getByRole('button', { name: 'VLAN vide' }))
    expect(project().vlans.map((v) => v.id)).toEqual([30, 40, 100])
  })
})
