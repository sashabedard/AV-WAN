// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { PrintDocument } from './PrintDocument'
import { createExampleProject } from '../samples/exampleProject'
import { createProject } from '../model/project'

afterEach(cleanup)

describe('PrintDocument', () => {
  it('imprime la liste de branchement et se déclare prêt sans schéma', async () => {
    const onReady = vi.fn()
    render(<PrintDocument project={createExampleProject(new Date(2026, 9, 13))} options={{ sections: ['branchement'], format: 'na', zonePages: false }} onReady={onReady} />)
    expect(screen.getByRole('heading', { name: 'Liste de branchement' })).toBeTruthy()
    expect(screen.getAllByRole('row')).toHaveLength(19)
    expect(document.querySelector('.print style')!.textContent).toContain('@page sheet { size: 8.5in 11in; }')
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
  })

  it('dit que la liste est vide pour un projet neuf', () => {
    render(<PrintDocument project={createProject()} options={{ sections: ['branchement'], format: 'iso', zonePages: false }} onReady={() => undefined} />)
    expect(screen.getByText('Aucun câble dans le projet.')).toBeTruthy()
    expect(document.querySelector('.print style')!.textContent).toContain('@page sheet { size: 210mm 297mm; }')
  })
})
