// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { PrintLegend } from './PrintLegend'
import { createExampleProject } from '../samples/exampleProject'

afterEach(cleanup)
const p = createExampleProject(new Date(2026, 9, 13), 'fr')

describe('PrintLegend', () => {
  it('en mode VLAN, donne chaque VLAN, le trunk et l’absence de VLAN, puis les traits', () => {
    render(<PrintLegend project={p} />)
    expect(screen.getByText('Couleur : VLAN')).toBeTruthy()
    expect(screen.getByText('40 · NDI')).toBeTruthy()
    expect(screen.getByText('Trunk (bagues = VLAN)')).toBeTruthy()
    for (const label of ['Cuivre', 'Fibre', 'DAC', 'Wi-Fi', 'Liens simples', 'PoE actif']) expect(screen.getByText(label)).toBeTruthy()
  })

  it('suit le mode de couleur du projet (décision 4)', () => {
    render(<PrintLegend project={{ ...p, settings: { ...p.settings, colorMode: 'type' } }} />)
    expect(screen.getByText('Couleur : type de câble')).toBeTruthy()
    expect(screen.getByText('Fibre multimode')).toBeTruthy()
    expect(screen.queryByText('40 · NDI')).toBeNull()
  })
})
