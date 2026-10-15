// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { ChannelsPage, DeviceSheetsPage, PatchPage, PortMapsPage, PowerPage, VlanSheetsPage } from './sections'
import { createExampleProject } from '../samples/exampleProject'
import { createDevice, createProject } from '../model/project'
import { powerShowProject } from '../reports/__fixtures__/powerShow'
import { patchShowProject } from '../reports/__fixtures__/patchShow'

afterEach(cleanup)
const p = createExampleProject(new Date(2026, 9, 13))

describe('sections du PDF', () => {
  it('fiches par appareil : un bloc par appareil, une ligne par branchement', () => {
    const { container } = render(<DeviceSheetsPage project={p} />)
    expect(container.querySelectorAll('.ds')).toHaveLength(22)
    expect(screen.getByText('ETH › SW-2 · port 1 · PoE+ actif (25 W) · VLAN 40 NDI · C-010 Cat6 12 m')).toBeTruthy()
    expect(screen.getAllByText(/IP : 10\.40\.0\.21 statique/)).toHaveLength(1)
    const meta = (name: string) => [...container.querySelectorAll('.ds')].find((a) => a.querySelector('.ds__name')?.textContent === name)!.querySelector('.ds__meta')!.textContent
    expect(meta('FIX-1')).not.toMatch(/IP :/)
    expect(meta('LED-1')).not.toMatch(/IP :/)
    expect(meta('CAM-1')).toMatch(/IP :/)
  })

  it('canaux DMX : un bloc par appareil nommé', () => {
    const lyre = createProject(new Date(2026, 9, 15))
    const fix = { ...createDevice(lyre, 'dmx-fixture', { x: 0, y: 0 }, { id: 'f' }), name: 'FIX-1', model: 'Wash', dmx: { footprint: 2, mode: '2CH', address: 5, universe: 1 } }
    const p = { ...lyre, devices: [fix], dmxChannels: [{ templateId: 'dmx-fixture', model: 'Wash', mode: '2CH', params: ['Red', 'Green'] }] }
    const { container } = render(<ChannelsPage project={p} />)
    expect(container.querySelectorAll('.cs__block')).toHaveLength(1)
    expect(screen.getByText('FIX-1 · U1 · 5–6')).toBeTruthy()
    expect(screen.getByText('Green')).toBeTruthy()
  })

  it('canaux DMX : dit quand rien n’est nommé', () => {
    render(<ChannelsPage project={createProject()} />)
    expect(screen.getByText('Aucun canal nommé. Les canaux se nomment dans l’inspecteur, section Patch DMX.')).toBeTruthy()
  })

  it('patch DMX : un tableau par univers, avec les remarques', () => {
    render(<PatchPage project={patchShowProject()} />)
    expect(screen.getByText('Univers 1 · ODE-1 › DMX 1')).toBeTruthy()
    expect(screen.getByText('Sans univers')).toBeTruthy()
    expect(screen.getAllByText('Chevauche PAR-1 (10–17)').length).toBeGreaterThan(0)
  })

  it('patch DMX : dit quand rien n’est patchable', () => {
    render(<PatchPage project={createProject()} />)
    expect(screen.getByText('Aucun appareil patchable dans le projet.')).toBeTruthy()
  })

  it('bilan de puissance : total, alimentations et appareils sans puissance', () => {
    render(<PowerPage project={powerShowProject()} />)
    expect(screen.getByText('Total : 830 W · 6,9 A à 120 V')).toBeTruthy()
    expect(screen.getByText('Alimentations')).toBeTruthy()
    expect(screen.getByText('1 appareil sans puissance renseignée : SW-1')).toBeTruthy()
  })

  it('bilan de puissance : dit quand rien n’est renseigné', () => {
    render(<PowerPage project={createProject()} />)
    expect(screen.getByText('Aucune puissance renseignée dans le projet.')).toBeTruthy()
  })

  it('carte des ports : une page par switch, avec sa façade et son tableau', () => {
    const { container } = render(<PortMapsPage project={p} />)
    expect(screen.getAllByRole('heading').map((h) => h.textContent)).toEqual(['Carte des ports · SW-1', 'Carte des ports · SW-2'])
    expect(screen.getByRole('img', { name: 'Façade de SW-2' })).toBeTruthy()
    const tables = container.querySelectorAll('table')
    expect(within(tables[1] as HTMLElement).getAllByRole('row')).toHaveLength(11)
    expect(screen.getByText(/PoE 123 \/ 150 W/)).toBeTruthy()
  })

  it('fiches VLAN : réseau, réglages UniFi et membres', () => {
    render(<VlanSheetsPage project={p} />)
    expect(screen.getByText('VLAN 40 · NDI')).toBeTruthy()
    expect(screen.getAllByText('IGMP Snooping').length).toBeGreaterThan(0)
    expect(screen.getByText(/Membres \(6\) : CAM-1, CAM-2, GW-1, PC-1, SW-1, SW-2/)).toBeTruthy()
  })

  it('dit qu’une section est vide au lieu de la retirer (décision 5)', () => {
    const empty = { ...createProject(), vlans: [] }
    render(
      <>
        <DeviceSheetsPage project={empty} />
        <PortMapsPage project={empty} />
        <VlanSheetsPage project={empty} />
      </>
    )
    expect(screen.getByText('Aucun appareil hors switch dans le projet.')).toBeTruthy()
    expect(screen.getByText('Aucun switch dans le projet.')).toBeTruthy()
    expect(screen.getByText('Aucun VLAN dans le projet.')).toBeTruthy()
  })
})
