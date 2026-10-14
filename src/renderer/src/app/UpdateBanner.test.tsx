// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AvwanApi } from '../../../shared/api'
import { UpdateBanner } from './UpdateBanner'

let announce: ((version: string) => void) | null = null
let updates: AvwanApi['updates']

beforeEach(() => {
  announce = null
  updates = { pending: vi.fn(async () => null), install: vi.fn() }
  window.avwan = {
    updates,
    onUpdateReady: (callback: (version: string) => void) => {
      announce = callback
      return () => {
        announce = null
      }
    }
  } as unknown as AvwanApi
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('UpdateBanner', () => {
  it('n’affiche rien tant qu’aucune version n’est prête', () => {
    const { container } = render(<UpdateBanner />)
    expect(container.innerHTML).toBe('')
  })

  it('annonce la version prête, et « Redémarrer maintenant » l’installe', async () => {
    const user = userEvent.setup()
    render(<UpdateBanner />)
    act(() => announce?.('1.1.0'))
    expect(screen.getByRole('status').textContent).toContain('AV·WAN 1.1.0 est prête.')
    await user.click(screen.getByRole('button', { name: 'Redémarrer maintenant' }))
    expect(updates.install).toHaveBeenCalledOnce()
  })

  it('✕ cache le bandeau (la mise à jour s’installera à la fermeture)', async () => {
    const user = userEvent.setup()
    render(<UpdateBanner />)
    act(() => announce?.('1.1.0'))
    await user.click(screen.getByRole('button', { name: 'Plus tard' }))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('montre aussi une version téléchargée avant l’ouverture de la fenêtre', async () => {
    vi.mocked(updates.pending).mockResolvedValue('1.2.0')
    render(<UpdateBanner />)
    expect((await screen.findByRole('status')).textContent).toContain('AV·WAN 1.2.0 est prête.')
  })
})
