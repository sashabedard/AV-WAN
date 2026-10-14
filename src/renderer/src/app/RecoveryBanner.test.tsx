// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AvwanApi, RecoveryEntry } from '../../../shared/api'
import { RecoveryBanner } from './RecoveryBanner'
import { projectStore } from '../store/projectStore'
import { uiStore } from '../store/uiStore'
import { serializeProject } from '../model/file'
import { sampleProject } from '../model/__fixtures__/sample'

const recent = (minutes: number): string => new Date(Date.now() - minutes * 60_000).toISOString()
const entries: RecoveryEntry[] = [
  { key: 'f-0000000000000001', path: '/x/salle-b.avwan', title: 'Salle B', savedAt: recent(3) },
  { key: 'u-abcdef', path: null, title: 'Régie', savedAt: recent(10) },
  { key: 'u-ghijkl', path: null, title: '', savedAt: recent(20) },
  { key: 'u-mnopqr', path: null, title: 'Quatrième', savedAt: recent(30) }
]
let recovery: AvwanApi['recovery']

beforeEach(() => {
  recovery = {
    write: vi.fn(),
    list: vi.fn(async () => entries),
    discard: vi.fn(async () => undefined),
    restore: vi.fn(async (key: string) => ({ key, path: '/x/salle-b.avwan', text: serializeProject(sampleProject()) })),
    findNewer: vi.fn(async () => null)
  }
  window.avwan = { recovery } as unknown as AvwanApi
  projectStore.getState().newProject()
  uiStore.getState().setWelcome(true)
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('RecoveryBanner', () => {
  it('montre au plus 3 copies : nom du fichier, sinon titre, sinon « Sans titre »', async () => {
    render(<RecoveryBanner />)
    const region = await screen.findByRole('region', { name: 'Travail non enregistré' })
    expect(region.textContent).toContain('salle-b.avwan')
    expect(region.textContent).toContain('il y a 3 min')
    expect(region.textContent).toContain('Régie')
    expect(region.textContent).toContain('Sans titre')
    expect(region.textContent).not.toContain('Quatrième')
  })

  it('Restaurer recharge la copie et ferme l’accueil', async () => {
    const user = userEvent.setup()
    render(<RecoveryBanner />)
    await user.click(await screen.findByRole('button', { name: 'Restaurer salle-b.avwan' }))
    await waitFor(() => expect(uiStore.getState().welcome).toBe(false))
    expect(recovery.restore).toHaveBeenCalledWith('f-0000000000000001')
    expect(projectStore.getState().filePath).toBe('/x/salle-b.avwan')
  })

  it('Ignorer efface la copie et retire la ligne', async () => {
    const user = userEvent.setup()
    render(<RecoveryBanner />)
    await user.click(await screen.findByRole('button', { name: 'Ignorer Régie' }))
    expect(recovery.discard).toHaveBeenCalledWith('u-abcdef')
    expect(screen.queryByRole('button', { name: 'Ignorer Régie' })).toBeNull()
  })

  it('n’affiche rien si la liste échoue ou est vide', async () => {
    vi.mocked(recovery.list).mockRejectedValueOnce(new Error('boom'))
    const { container } = render(<RecoveryBanner />)
    await waitFor(() => expect(recovery.list).toHaveBeenCalled())
    expect(container.innerHTML).toBe('')
  })
})
