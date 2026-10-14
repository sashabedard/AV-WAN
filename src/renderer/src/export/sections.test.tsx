// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { DeviceSheetsPage, PortMapsPage, VlanSheetsPage } from './sections'
import { createExampleProject } from '../samples/exampleProject'
import { createProject } from '../model/project'

afterEach(cleanup)
const p = createExampleProject(new Date(2026, 9, 13))

describe('sections du PDF', () => {
  it('fiches par appareil : un bloc par appareil, une ligne par branchement', () => {
    const { container } = render(<DeviceSheetsPage project={p} />)
    expect(container.querySelectorAll('.ds')).toHaveLength(17)
    expect(screen.getByText('ETH › SW-2 · port 1 · PoE+ actif (25 W) · VLAN 40 NDI · C-010 Cat6 12 m')).toBeTruthy()
    expect(screen.getAllByText(/IP : 10\.40\.0\.21 statique/)).toHaveLength(1)
    const meta = (name: string) => [...container.querySelectorAll('.ds')].find((a) => a.querySelector('.ds__name')?.textContent === name)!.querySelector('.ds__meta')!.textContent
    expect(meta('FIX-1')).not.toMatch(/IP :/)
    expect(meta('LED-1')).not.toMatch(/IP :/)
    expect(meta('CAM-1')).toMatch(/IP :/)
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
