// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { PrintDocument } from './PrintDocument'
import { createExampleProject } from '../samples/exampleProject'
import { createProject } from '../model/project'
import { LangOverrideProvider } from '../i18n/useT'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('PrintDocument', () => {
  it('imprime la liste de branchement et se déclare prêt sans schéma', async () => {
    const onReady = vi.fn()
    render(<PrintDocument project={createExampleProject(new Date(2026, 9, 13), 'fr')} options={{ sections: ['branchement'], format: 'na', zonePages: false, lang: 'fr' }} onReady={onReady} />)
    expect(screen.getByRole('heading', { name: 'Liste de branchement' })).toBeTruthy()
    expect(screen.getAllByRole('row')).toHaveLength(24)
    expect(document.querySelector('.print style')!.textContent).toContain('@page sheet { size: 8.5in 11in; }')
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
  })

  it('dit que la liste est vide pour un projet neuf', () => {
    render(<PrintDocument project={createProject(undefined, 'fr')} options={{ sections: ['branchement'], format: 'iso', zonePages: false, lang: 'fr' }} onReady={() => undefined} />)
    expect(screen.getByText('Aucun câble dans le projet.')).toBeTruthy()
    expect(document.querySelector('.print style')!.textContent).toContain('@page sheet { size: 210mm 297mm; }')
  })

  it('imprime les sections dans l’ordre de la spec, quel que soit l’ordre demandé', () => {
    render(
      <PrintDocument
        project={createExampleProject(new Date(2026, 9, 13), 'fr')}
        options={{ sections: ['nomenclature', 'appareils', 'ip', 'vlans', 'ports', 'branchement'], format: 'na', zonePages: true, lang: 'fr' }}
        onReady={() => undefined}
      />
    )
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Fiches par appareil',
      'Carte des ports · SW-1',
      'Carte des ports · SW-2',
      'Liste de branchement',
      'Fiches VLAN',
      'Plan d’adressage IP',
      'Nomenclature'
    ])
  })

  it('imprime en anglais quand la langue des documents est l’anglais', () => {
    // jsdom n'a pas ResizeObserver, que React Flow exige pour le schéma.
    vi.stubGlobal('ResizeObserver', class { observe(): void {} unobserve(): void {} disconnect(): void {} })
    const project = createExampleProject(new Date(2026, 9, 13), 'en')
    render(
      <LangOverrideProvider lang="en">
        <PrintDocument project={project} options={{ sections: ['schema', 'appareils', 'ports', 'puissance', 'branchement'], format: 'na', zonePages: true, lang: 'en' }} onReady={() => undefined} />
      </LangOverrideProvider>
    )
    expect(screen.getAllByText('Overview').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Zone: Control room/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Design').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Trunk (rings = VLAN)').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Device sheets' })).toBeTruthy()
    expect(document.querySelector('.print style')!.textContent).toContain('"Rev. ')
    expect(screen.queryByText(/Aucun|Fiches|Statut/)).toBeNull()
  })
})
