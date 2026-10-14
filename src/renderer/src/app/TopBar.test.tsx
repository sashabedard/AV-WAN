// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { TopBar } from './TopBar'
import { Toast } from './Toast'
import { projectStore } from '../store/projectStore'
import { sampleProject } from '../model/__fixtures__/sample'

beforeEach(() => projectStore.getState().loadProject(sampleProject(), '/x/lumen.avwan'))
afterEach(cleanup)

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
})

describe('Toast', () => {
  it('affiche le message courant', () => {
    render(<Toast />)
    act(() => projectStore.getState().showToast('Branchement impossible.'))
    expect(screen.getByRole('status').textContent).toBe('Branchement impossible.')
  })
})
