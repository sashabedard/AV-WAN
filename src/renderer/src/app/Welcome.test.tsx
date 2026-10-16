// src/renderer/src/app/Welcome.test.tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AvwanApi } from '../../../shared/api'
import { Welcome } from './Welcome'
import { isDirty, projectStore } from '../store/projectStore'
import { uiStore } from '../store/uiStore'
import { EXAMPLE_TITLE } from '../samples/exampleProject'
import { serializeProject } from '../model/file'
import { sampleProject } from '../model/__fixtures__/sample'

const open = vi.fn()
beforeEach(() => {
  open.mockResolvedValue({ path: '/x/lumen.avwan', text: serializeProject(sampleProject()) })
  window.avwan = { initialLang: 'fr', recent: { list: vi.fn().mockResolvedValue(['/x/lumen.avwan']), open, remember: vi.fn().mockResolvedValue(undefined) } } as unknown as AvwanApi
  projectStore.getState().newProject()
  uiStore.getState().setWelcome(true)
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('écran d’accueil', () => {
  it('ouvre le projet exemple, non modifié, et se ferme', async () => {
    const user = userEvent.setup()
    render(<Welcome />)
    await user.click(screen.getByRole('button', { name: /Projet exemple/ }))
    expect(projectStore.getState().history.present.meta.title).toBe(EXAMPLE_TITLE)
    expect(isDirty(projectStore.getState())).toBe(false)
    expect(uiStore.getState().welcome).toBe(false)
  })

  it('« Nouveau projet » a le focus ; Échap ferme aussi', async () => {
    const user = userEvent.setup()
    render(<Welcome />)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Nouveau projet' }))
    await user.keyboard('{Escape}')
    expect(uiStore.getState().welcome).toBe(false)
  })

  it('Échap après passage en EN : repart d’un projet vierge en anglais', async () => {
    const user = userEvent.setup()
    render(<Welcome />)
    expect(projectStore.getState().history.present.meta.title).toBe('Nouveau projet')
    act(() => uiStore.getState().setLang('en'))
    await user.keyboard('{Escape}')
    expect(projectStore.getState().history.present.meta.title).toBe('New project')
    expect(uiStore.getState().welcome).toBe(false)
    act(() => uiStore.getState().setLang('fr'))
  })

  it('rouvre un fichier récent', async () => {
    const user = userEvent.setup()
    render(<Welcome />)
    await user.click(await screen.findByRole('button', { name: 'lumen.avwan' }))
    expect(open).toHaveBeenCalledWith('/x/lumen.avwan')
    await waitFor(() => expect(projectStore.getState().history.present.meta.title).toBe('Installation Lumen'))
  })

  it('porte l’accroche et le clin d’œil', () => {
    render(<Welcome />)
    expect(screen.getByText('Planifier. Brancher. Documenter.')).toBeTruthy()
    expect(screen.getByText('Que le réseau soit avec toi.')).toBeTruthy()
  })
})

describe('écran d’accueil en anglais', () => {
  it('s’affiche en anglais quand l’interface est en anglais', () => {
    act(() => uiStore.getState().setLang('en'))
    try {
      render(<Welcome />)
      const dialog = screen.getByRole('dialog', { name: 'Welcome' })
      expect(within(dialog).getByRole('button', { name: 'New project' })).toBeTruthy()
      expect(within(dialog).getByRole('button', { name: /Example project/ })).toBeTruthy()
    } finally {
      act(() => uiStore.getState().setLang('fr'))
    }
  })
})
