// src/renderer/src/app/Welcome.test.tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
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
  window.avwan = { recent: { list: vi.fn().mockResolvedValue(['/x/lumen.avwan']), open } } as unknown as AvwanApi
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
