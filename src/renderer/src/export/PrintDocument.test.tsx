// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { PrintDocument } from './PrintDocument'
import { createExampleProject } from '../samples/exampleProject'
import { createProject } from '../model/project'
import { LangOverrideProvider } from '../i18n/useT'
import { rackSample } from '../racks/__fixtures__/rackSample'
import type { Device, Link, Project } from '../model/types'

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

describe('PrintDocument — élévations de baie', () => {
  const stubFlowGlobals = () => {
    vi.stubGlobal('ResizeObserver', class { observe(): void {} unobserve(): void {} disconnect(): void {} })
    vi.stubGlobal('DOMMatrixReadOnly', class { m22 = 1 })
  }
  const pages = () => [...document.querySelectorAll('.pg--diagram')]

  it('une page par baie et par variante cochée, baie par baie', () => {
    stubFlowGlobals()
    const p = rackSample()
    const project: Project = { ...p, racks: [...p.racks!, { id: 'r2', name: 'BAIE-2', heightU: 6 }] }
    render(<PrintDocument project={project} options={{ sections: ['baies', 'baies-cables'], format: 'na', zonePages: false, lang: 'fr' }} onReady={() => undefined} />)
    expect(pages()).toHaveLength(4)
    expect(pages().map((el) => el.querySelector('.pg__foot')!.textContent)).toEqual([
      expect.stringContaining('Élévation · BAIE-1 · Régie · 12U'),
      expect.stringContaining('Élévation · BAIE-1 · Régie · 12U'),
      expect.stringContaining('Élévation · BAIE-2 · 6U'),
      expect.stringContaining('Élévation · BAIE-2 · 6U')
    ])
  })

  it('seulement « propre » : une page par baie ; aucune baie : aucune page', () => {
    stubFlowGlobals()
    render(<PrintDocument project={rackSample()} options={{ sections: ['baies'], format: 'na', zonePages: false, lang: 'fr' }} onReady={() => undefined} />)
    expect(pages()).toHaveLength(1)
    cleanup()
    render(<PrintDocument project={createProject(undefined, 'fr')} options={{ sections: ['baies', 'baies-cables'], format: 'na', zonePages: false, lang: 'fr' }} onReady={() => undefined} />)
    expect(pages()).toHaveLength(0)
  })

  it('en anglais : titre de page en anglais', () => {
    stubFlowGlobals()
    render(
      <LangOverrideProvider lang="en">
        <PrintDocument project={rackSample()} options={{ sections: ['baies'], format: 'na', zonePages: false, lang: 'en' }} onReady={() => undefined} />
      </LangOverrideProvider>
    )
    expect(pages()[0]!.querySelector('.pg__foot')!.textContent).toContain('Elevation · BAIE-1')
  })

  it('plus de 40 câbles dans la baie : l’élévation câblée devient propre avec un bandeau', () => {
    stubFlowGlobals()
    const base = rackSample()
    const devices: Device[] = Array.from({ length: 14 }, (_, i) => ({
      id: `d${i}`,
      templateId: 'show-mac',
      name: `D-${i}`,
      position: { x: 0, y: 0 },
      portSide: 'auto',
      ports: Array.from({ length: 6 }, (_k, k) => ({ id: `P${k}`, label: `P${k}`, connector: 'rj45' as const, speedMbps: 1000 })),
      portState: {},
      rack: { rackId: 'r1', u: i + 1, heightU: 1 }
    }))
    const links: Link[] = []
    for (let i = 0; i < 14; i += 2) for (let k = 0; k < 6; k++) links.push({ id: `l${i}-${k}`, cableId: `C-${i}-${k}`, a: { deviceId: `d${i}`, portId: `P${k}` }, b: { deviceId: `d${i + 1}`, portId: `P${k}` }, medium: 'cat6' })
    const project: Project = { ...base, racks: [{ id: 'r1', name: 'BAIE-1', heightU: 24 }], devices, links }
    render(<PrintDocument project={project} options={{ sections: ['baies-cables'], format: 'na', zonePages: false, lang: 'fr' }} onReady={() => undefined} />)
    expect(screen.getByText('Trop de câbles pour cette échelle — voir la liste de branchement.')).toBeTruthy()
    expect(document.querySelectorAll('.react-flow__edge').length).toBe(0)
  })
})
