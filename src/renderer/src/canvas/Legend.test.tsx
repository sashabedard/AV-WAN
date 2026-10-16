// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Legend } from './Legend'
import { projectStore } from '../store/projectStore'
import { act } from 'react'
import { mediumKindLabels } from './cordStyle'
import { messages } from '../../../shared/i18n/messages'
import { uiStore } from '../store/uiStore'
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

  it('cliquer un VLAN le met en évidence, cliquer de nouveau l’enlève', async () => {
    const user = userEvent.setup()
    render(<Legend />)
    const ndi = screen.getByRole('button', { name: /40 · NDI/ })
    await user.click(ndi)
    expect(uiStore.getState().focusVlan).toBe(40)
    expect(ndi.getAttribute('aria-pressed')).toBe('true')
    await user.click(ndi)
    expect(uiStore.getState().focusVlan).toBeNull()
  })

  it('affiche la légende en anglais', async () => {
    act(() => uiStore.getState().setLang('en'))
    try {
      const user = userEvent.setup()
      render(<Legend />)
      expect(screen.getByText('Trunk (rings = VLAN)')).toBeTruthy()
      expect(screen.getByText('No VLAN')).toBeTruthy()
      const modes = screen.getByRole('group', { name: 'Color mode' })
      await user.click(within(modes).getByRole('button', { name: 'Type' }))
      expect(screen.getByText('Singlemode fiber')).toBeTruthy()
      expect(mediumKindLabels(messages('en')).copper).toBe('Copper')
    } finally {
      act(() => uiStore.getState().setLang('fr'))
    }
  })
})
