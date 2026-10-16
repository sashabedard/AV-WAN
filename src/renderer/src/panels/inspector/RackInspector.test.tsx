// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Inspector } from '../Inspector'
import { projectStore } from '../../store/projectStore'
import { uiStore } from '../../store/uiStore'
import { rackSample } from '../../racks/__fixtures__/rackSample'

const devices = () => projectStore.getState().history.present.devices
const cam = () => devices().find((d) => d.name === 'CAM-1')!
const mac = () => devices().find((d) => d.id === 'mac')!

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  projectStore.getState().loadProject(rackSample(), null)
})
afterEach(() => {
  act(() => uiStore.getState().setLang('fr'))
  cleanup()
  vi.restoreAllMocks()
})

const type = (label: string, value: string) => {
  const input = screen.getByLabelText(label)
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}

describe('section Baie d’un appareil', () => {
  it('choisir la baie place un appareil au premier U libre (U2)', () => {
    projectStore.getState().setSelection({ deviceIds: [cam().id], linkIds: [] })
    render(<Inspector />)
    fireEvent.change(screen.getByLabelText('Baie de l’appareil'), { target: { value: 'r1' } })
    expect(cam().rack).toEqual({ rackId: 'r1', u: 2, heightU: 1 })
  })

  it('taper un U du bas déplace l’appareil ; « Retirer de la baie » le renvoie dans la liste', () => {
    projectStore.getState().setSelection({ deviceIds: ['mac'], linkIds: [] })
    render(<Inspector />)
    type('U du bas de l’appareil', '5')
    expect(mac().rack).toEqual({ rackId: 'r1', u: 5, heightU: 2 })
    fireEvent.click(screen.getByRole('button', { name: 'Retirer de la baie' }))
    expect(mac().rack).toBeUndefined()
  })

  it('une hauteur qui déborde est refusée : toast, valeur inchangée', () => {
    projectStore.getState().setSelection({ deviceIds: ['mac'], linkIds: [] })
    render(<Inspector />)
    type('Hauteur de l’appareil en U', '12')
    expect(mac().rack!.heightU).toBe(2)
    expect(projectStore.getState().toast).toMatch(/U libres/)
  })

  it('un nombre invalide affiche le toast d’entier', () => {
    projectStore.getState().setSelection({ deviceIds: ['mac'], linkIds: [] })
    render(<Inspector />)
    type('U du bas de l’appareil', 'abc')
    expect(projectStore.getState().toast).toMatch(/nombre entier de 1 à 12/)
  })

  it('sans baie dans le projet, la section n’existe pas', () => {
    projectStore.getState().loadProject({ ...rackSample(), racks: [], devices: rackSample().devices.map(({ rack: _r, ...d }) => d) }, null)
    projectStore.getState().setSelection({ deviceIds: ['mac'], linkIds: [] })
    render(<Inspector />)
    expect(screen.queryByLabelText('Baie de l’appareil')).toBeNull()
  })

  it('en anglais : libellés anglais', () => {
    act(() => uiStore.getState().setLang('en'))
    projectStore.getState().setSelection({ deviceIds: ['mac'], linkIds: [] })
    render(<Inspector />)
    expect(screen.getByLabelText('Device bottom U')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Remove from rack' })).toBeTruthy()
  })
})

describe('fiche d’une baie', () => {
  const rack = () => projectStore.getState().history.present.racks![0]!

  it('une baie sélectionnée affiche sa fiche ; renommer et changer la hauteur', () => {
    projectStore.getState().setSelection({ deviceIds: [], linkIds: [], rackIds: ['r1'] })
    render(<Inspector />)
    expect(screen.getByLabelText('Nom de la baie')).toBeTruthy()
    type('Nom de la baie', 'BAIE-A')
    expect(rack().name).toBe('BAIE-A')
    fireEvent.click(screen.getByRole('button', { name: '24U' }))
    expect(rack().heightU).toBe(24)
  })

  it('une hauteur trop courte pour ses appareils est refusée avec un toast', () => {
    projectStore.getState().setSelection({ deviceIds: [], linkIds: [], rackIds: ['r1'] })
    render(<Inspector />)
    fireEvent.click(screen.getByRole('button', { name: '6U' }))
    expect(rack().heightU).toBe(6)
    type('Hauteur de la baie en U', '2')
    expect(rack().heightU).toBe(6)
    expect(projectStore.getState().toast).toMatch(/trop courte/)
  })

  it('« Supprimer la baie » remet ses appareils hors baie', () => {
    projectStore.getState().setSelection({ deviceIds: [], linkIds: [], rackIds: ['r1'] })
    render(<Inspector />)
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer la baie' }))
    expect(projectStore.getState().history.present.racks).toEqual([])
    expect(mac().rack).toBeUndefined()
  })

  it('en anglais : fiche en anglais', () => {
    act(() => uiStore.getState().setLang('en'))
    projectStore.getState().setSelection({ deviceIds: [], linkIds: [], rackIds: ['r1'] })
    render(<Inspector />)
    expect(screen.getByLabelText('Rack name')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Delete rack' })).toBeTruthy()
  })
})
