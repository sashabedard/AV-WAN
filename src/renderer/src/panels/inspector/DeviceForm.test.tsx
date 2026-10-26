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
  projectStore.getState().setSelection({ deviceIds: ['cam1'], linkIds: [] })
})
afterEach(() => {
  act(() => uiStore.getState().setLang('fr'))
  cleanup()
  vi.restoreAllMocks()
})

describe('DeviceForm en deux langues', () => {
  it('garde le brouillon d’un champ quand la langue change pendant la saisie', async () => {
    const user = userEvent.setup()
    render(<Inspector />)
    const name = screen.getByRole('textbox', { name: 'Nom' })
    await user.clear(name)
    await user.type(name, 'CAM-99')
    act(() => uiStore.getState().setLang('en'))
    const renamed = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement
    expect(renamed.value).toBe('CAM-99')
    // Rien n'est validé tant que la personne n'a pas confirmé.
    expect(projectStore.getState().history.present.devices.some((d) => d.name === 'CAM-99')).toBe(false)
    // Le champ garde le focus : Entrée valide ensuite le brouillon.
    await user.keyboard('{Enter}')
    expect(projectStore.getState().history.present.devices.some((d) => d.name === 'CAM-99')).toBe(true)
  })

  it('affiche les libellés en anglais', () => {
    act(() => uiStore.getState().setLang('en'))
    render(<Inspector />)
    expect(screen.getByRole('heading', { name: 'Ports' })).toBeTruthy()
    expect(screen.getByText('Connected to')).toBeTruthy()
    expect(screen.getByText(/^Zone: /)).toBeTruthy()
  })

  it('en anglais, « 1,200 » dans la puissance vaut 1200 W', async () => {
    const user = userEvent.setup()
    act(() => uiStore.getState().setLang('en'))
    render(<Inspector />)
    const power = screen.getByRole('textbox', { name: 'Power (W)' })
    await user.clear(power)
    await user.type(power, '1,200{Enter}')
    expect(projectStore.getState().history.present.devices.find((d) => d.id === 'cam1')!.powerW).toBe(1200)
  })
})
