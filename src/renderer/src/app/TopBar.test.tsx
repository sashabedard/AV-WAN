// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TopBar } from './TopBar'
import { Toast } from './Toast'
import { projectStore } from '../store/projectStore'
import { uiStore } from '../store/uiStore'
import { sampleProject } from '../model/__fixtures__/sample'

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
