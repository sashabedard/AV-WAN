// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Inspector } from '../Inspector'
import { projectStore } from '../../store/projectStore'
import { uiStore } from '../../store/uiStore'
import { sampleProject } from '../../model/__fixtures__/sample'

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  projectStore.getState().loadProject(sampleProject(), null)
  projectStore.getState().setSelection({ deviceIds: [], linkIds: ['l1'] })
})
afterEach(() => {
  act(() => uiStore.getState().setLang('fr'))
  cleanup()
  vi.restoreAllMocks()
})

describe('LinkForm en deux langues', () => {
  it('affiche les libellés en français', () => {
    render(<Inspector />)
    expect(screen.getByRole('heading', { name: 'Câble' })).toBeTruthy()
    expect(screen.getByLabelText('Mode VLAN')).toBeTruthy()
  })

  it('affiche les libellés en anglais', () => {
    act(() => uiStore.getState().setLang('en'))
    render(<Inspector />)
    expect(screen.getByRole('heading', { name: 'Cable' })).toBeTruthy()
    expect(screen.getByLabelText('Cable ID')).toBeTruthy()
    expect(screen.getByLabelText('VLAN mode')).toBeTruthy()
    expect(screen.getByLabelText('Length in meters')).toBeTruthy()
    expect(screen.getByTestId('link-poe').textContent).toMatch(/active · 25 W$/)
  })

  it('longueur en EN : « 1,200 » vaut 1200 m, un texte invalide est refusé avec un message', async () => {
    act(() => uiStore.getState().setLang('en'))
    render(<Inspector />)
    const input = screen.getByLabelText('Length in meters') as HTMLInputElement
    await userEvent.clear(input)
    await userEvent.type(input, '1,200{Enter}')
    expect(projectStore.getState().history.present.links.find((l) => l.id === 'l1')!.lengthM).toBe(1200)
    await userEvent.clear(input)
    await userEvent.type(input, 'abc{Enter}')
    expect(projectStore.getState().history.present.links.find((l) => l.id === 'l1')!.lengthM).toBe(1200)
    expect(projectStore.getState().toast).toMatch(/Length/)
  })

  it('longueur en FR : « 12,5 » vaut 12,5 m', async () => {
    render(<Inspector />)
    const input = screen.getByLabelText('Longueur en mètres') as HTMLInputElement
    await userEvent.clear(input)
    await userEvent.type(input, '12,5{Enter}')
    expect(projectStore.getState().history.present.links.find((l) => l.id === 'l1')!.lengthM).toBe(12.5)
  })
})
