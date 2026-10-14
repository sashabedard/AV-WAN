// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Legend } from './Legend'
import { projectStore } from '../store/projectStore'
import { sampleProject } from '../model/__fixtures__/sample'

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  projectStore.getState().loadProject(sampleProject(), null)
})
afterEach(cleanup)

describe('Legend', () => {
  it('liste les VLAN du projet, puis bascule en mode Type et Port sans historique', async () => {
    const user = userEvent.setup()
    render(<Legend />)
    expect(screen.getByText('40 · NDI')).toBeTruthy()
    const modes = screen.getByRole('group', { name: 'Mode de couleur' })
    await user.click(within(modes).getByRole('button', { name: 'Type' }))
    expect(projectStore.getState().history.present.settings.colorMode).toBe('type')
    expect(screen.getByText('Fibre monomode')).toBeTruthy()
    await user.click(within(modes).getByRole('button', { name: 'Port' }))
    expect(screen.getByText(/ports et étiquettes toujours affichés/)).toBeTruthy()
    expect(projectStore.getState().history.past).toHaveLength(0)
  })
})
