// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TopBar } from './TopBar'
import { Toast } from './Toast'
import { projectStore } from '../store/projectStore'
import { uiStore } from '../store/uiStore'
import { sampleProject } from '../model/__fixtures__/sample'
import type { AvwanApi } from '../../../shared/api'

beforeEach(() => projectStore.getState().loadProject(sampleProject(), '/x/lumen.avwan'))
afterEach(() => {
  cleanup()
  delete document.documentElement.dataset['theme']
  localStorage.clear()
})

describe('TopBar', () => {
  it('affiche le mot-symbole, le nom du fichier et le témoin de modification', () => {
    render(<TopBar />)
    expect(screen.getByLabelText('AV·WAN').textContent).toBe('AV·WAN')
    expect(screen.getByTestId('file-name').textContent).toBe('lumen.avwan')
    act(() => projectStore.getState().updateMeta({ title: 'Autre' }))
    expect(screen.getByTestId('file-name').textContent).toBe('●lumen.avwan')
  })

  it('signale la lecture seule', () => {
    act(() => projectStore.getState().loadProject(sampleProject(), null, { readOnly: true }))
    render(<TopBar />)
    expect(screen.getByText('Lecture seule')).toBeTruthy()
    expect(screen.getByTestId('file-name').textContent).toBe('Sans titre')
  })

  it('fait tourner le thème : système, clair, sombre, système', async () => {
    const user = userEvent.setup()
    render(<TopBar />)
    const button = screen.getByRole('button', { name: 'Thème : système' })
    await user.click(button)
    expect(document.documentElement.dataset['theme']).toBe('light')
    expect(localStorage.getItem('avwan.theme')).toBe('light')
    await user.click(screen.getByRole('button', { name: 'Thème : clair' }))
    expect(document.documentElement.dataset['theme']).toBe('dark')
    await user.click(screen.getByRole('button', { name: 'Thème : sombre' }))
    expect(document.documentElement.dataset['theme']).toBeUndefined()
    expect(localStorage.getItem('avwan.theme')).toBe('system')
  })
})

describe('TopBar sans barre de titre native', () => {
  let fullscreen: ((on: boolean) => void) | null = null
  const chrome = { setTitleBarColors: vi.fn(), showMenu: vi.fn(), onFullscreen: vi.fn() }

  function useApi(platform: string): void {
    chrome.onFullscreen.mockImplementation((cb: (on: boolean) => void) => {
      fullscreen = cb
      return () => {
        fullscreen = null
      }
    })
    window.avwan = { platform, window: chrome } as unknown as AvwanApi
    // jsdom n'a pas matchMedia : le crochet suit le thème du système par là.
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as unknown as typeof window.matchMedia
  }

  afterEach(() => {
    delete (window as { avwan?: AvwanApi }).avwan
    delete document.documentElement.dataset['platform']
    delete document.documentElement.dataset['fullscreen']
    vi.clearAllMocks()
  })

  it('Windows : un bouton ☰ ouvre le menu de l’app sous lui-même', async () => {
    const user = userEvent.setup()
    useApi('win32')
    render(<TopBar />)
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    expect(chrome.showMenu).toHaveBeenCalledWith(expect.any(Number), expect.any(Number))
    expect(document.documentElement.dataset['platform']).toBe('win32')
  })

  it('Windows : les boutons natifs reçoivent les couleurs de la barre, et de nouveau au changement de thème', () => {
    useApi('win32')
    render(<TopBar />)
    expect(chrome.setTitleBarColors).toHaveBeenCalledTimes(1)
    expect(chrome.setTitleBarColors).toHaveBeenCalledWith({ color: expect.any(String), symbolColor: expect.any(String) })
    act(() => {
      document.documentElement.dataset['theme'] = 'light'
    })
    return vi.waitFor(() => expect(chrome.setTitleBarColors).toHaveBeenCalledTimes(2))
  })

  it('macOS : pas de ☰ ni de couleurs à envoyer ; le plein écran est suivi', () => {
    useApi('darwin')
    render(<TopBar />)
    expect(screen.queryByRole('button', { name: 'Menu' })).toBeNull()
    expect(chrome.setTitleBarColors).not.toHaveBeenCalled()
    expect(document.documentElement.dataset['platform']).toBe('darwin')
    act(() => fullscreen?.(true))
    expect(document.documentElement.dataset['fullscreen']).toBe('')
    act(() => fullscreen?.(false))
    expect(document.documentElement.dataset['fullscreen']).toBeUndefined()
  })
})

describe('Toast', () => {
  it('affiche le message courant', () => {
    render(<Toast />)
    act(() => projectStore.getState().showToast('Branchement impossible.'))
    expect(screen.getByRole('status').textContent).toBe('Branchement impossible.')
  })

  it('ouvre la boîte d’export', async () => {
    const user = userEvent.setup()
    uiStore.getState().setExportOpen(false)
    render(<TopBar />)
    await user.click(screen.getByRole('button', { name: 'Exporter' }))
    expect(uiStore.getState().exportOpen).toBe(true)
  })
})
