// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportDialog } from './ExportDialog'
import { projectStore } from '../store/projectStore'
import { uiStore } from '../store/uiStore'
import { createExampleProject } from '../samples/exampleProject'

const ALL = ['schema', 'appareils', 'ports', 'branchement', 'vlans', 'ip', 'patch', 'canaux', 'puissance', 'nomenclature']

beforeEach(() => {
  projectStore.getState().loadProject(createExampleProject(new Date(2026, 9, 13), 'fr'), null)
  uiStore.setState({ exportOpen: true, lastPdfChoice: null })
})
afterEach(cleanup)

describe('ExportDialog', () => {
  it('coche toutes les sections et les pages de zone, puis exporte', async () => {
    const user = userEvent.setup()
    const onExport = vi.fn()
    render(<ExportDialog onExport={onExport} />)
    expect(screen.getByRole('dialog', { name: 'Exporter le PDF' })).toBeTruthy()
    expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(11)
    expect(screen.getByRole('checkbox', { name: 'Pages de zone agrandies (2)' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Exporter le PDF…' }))
    expect(onExport).toHaveBeenCalledWith({ sections: ALL, format: 'na', zonePages: true, lang: 'fr' })
    expect(uiStore.getState().exportOpen).toBe(false)
  })

  it('sans schéma, coupe les pages de zone ; sans aucune section, refuse d’exporter', async () => {
    const user = userEvent.setup()
    render(<ExportDialog onExport={vi.fn()} />)
    await user.click(screen.getByRole('checkbox', { name: /Schéma/ }))
    expect((screen.getByRole('checkbox', { name: /Pages de zone/ }) as HTMLInputElement).disabled).toBe(true)
    for (const box of screen.getAllByRole('checkbox', { checked: true })) await user.click(box)
    expect((screen.getByRole('button', { name: 'Exporter le PDF…' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('enregistre le format choisi dans le projet, sans entrée d’historique', async () => {
    const user = userEvent.setup()
    const onExport = vi.fn()
    render(<ExportDialog onExport={onExport} />)
    await user.click(within(screen.getByRole('group', { name: 'Format des pages' })).getByRole('button', { name: 'A3 + A4' }))
    await user.click(screen.getByRole('button', { name: 'Exporter le PDF…' }))
    expect(onExport).toHaveBeenCalledWith(expect.objectContaining({ format: 'iso' }))
    expect(projectStore.getState().history.present.settings.pageFormat).toBe('iso')
    expect(projectStore.getState().history.past).toHaveLength(0)
  })

  it('se souvient des sections choisies pour le prochain export', async () => {
    const user = userEvent.setup()
    render(<ExportDialog onExport={vi.fn()} />)
    await user.click(screen.getByRole('checkbox', { name: /Nomenclature/ }))
    await user.click(screen.getByRole('button', { name: 'Exporter le PDF…' }))
    expect(uiStore.getState().lastPdfChoice).toEqual({ sections: ALL.filter((s) => s !== 'nomenclature'), zonePages: true })
  })

  it('exporte aussi les listes en CSV ou en Excel', async () => {
    const user = userEvent.setup()
    const onCsv = vi.fn()
    const onXlsx = vi.fn()
    render(<ExportDialog onExport={vi.fn()} onCsv={onCsv} onXlsx={onXlsx} />)
    await user.click(screen.getByRole('button', { name: 'CSV…' }))
    expect(onCsv).toHaveBeenCalledTimes(1)
    expect(uiStore.getState().exportOpen).toBe(false)
    uiStore.getState().setExportOpen(true)
    await user.click(await screen.findByRole('button', { name: 'Excel…' }))
    expect(onXlsx).toHaveBeenCalledTimes(1)
  })

  it('se ferme avec Échap sans rien exporter', async () => {
    const user = userEvent.setup()
    const onExport = vi.fn()
    render(<ExportDialog onExport={onExport} />)
    await user.keyboard('{Escape}')
    expect(uiStore.getState().exportOpen).toBe(false)
    expect(onExport).not.toHaveBeenCalled()
  })
})

describe('langue des documents', () => {
  it('choisit la langue des documents, la retient et l’envoie avec le PDF', async () => {
    const user = userEvent.setup()
    const onExport = vi.fn()
    localStorage.clear()
    render(<ExportDialog onExport={onExport} />)
    const group = screen.getByRole('group', { name: 'Langue des documents' })
    expect(within(group).getByRole('button', { name: 'FR', pressed: true })).toBeTruthy()
    await user.click(group.querySelector('button[aria-pressed="false"]')!)
    await user.click(screen.getByRole('button', { name: /Exporter le PDF/ }))
    expect(onExport).toHaveBeenCalledWith(expect.objectContaining({ lang: 'en' }))
    expect(localStorage.getItem('avwan.docLang')).toBe('en')
  })

  it('envoie la langue des documents avec le CSV et l’Excel', async () => {
    const user = userEvent.setup()
    const onCsv = vi.fn()
    const onXlsx = vi.fn()
    localStorage.setItem('avwan.docLang', 'en')
    render(<ExportDialog onExport={vi.fn()} onCsv={onCsv} onXlsx={onXlsx} />)
    await user.click(screen.getByRole('button', { name: 'CSV…' }))
    expect(onCsv).toHaveBeenCalledWith('en')
    uiStore.getState().setExportOpen(true)
    await user.click(await screen.findByRole('button', { name: 'Excel…' }))
    expect(onXlsx).toHaveBeenCalledWith('en')
  })
  it('sans baie : les deux sections de baie sont grisées avec une note, et rien de baie n’est exporté', async () => {
    const user = userEvent.setup()
    const onExport = vi.fn()
    render(<ExportDialog onExport={onExport} />)
    expect((screen.getByRole('checkbox', { name: /Élévations de baie$/ }) as HTMLInputElement).disabled).toBe(true)
    expect((screen.getByRole('checkbox', { name: /Élévations de baie avec câbles/ }) as HTMLInputElement).disabled).toBe(true)
    expect(screen.getByText(/Aucune baie dans le projet/)).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Exporter le PDF…' }))
    expect(onExport.mock.calls[0]![0].sections).not.toContain('baies')
  })

  it('avec une baie : « propre » cochée, « avec câbles » décochée, et on peut cocher les deux', async () => {
    const user = userEvent.setup()
    const onExport = vi.fn()
    projectStore.getState().addRack()
    render(<ExportDialog onExport={onExport} />)
    const clean = screen.getByRole('checkbox', { name: /Élévations de baie$/ }) as HTMLInputElement
    const cabled = screen.getByRole('checkbox', { name: /Élévations de baie avec câbles/ }) as HTMLInputElement
    expect(clean.checked).toBe(true)
    expect(cabled.checked).toBe(false)
    expect(screen.queryByText(/Aucune baie dans le projet/)).toBeNull()
    await user.click(cabled)
    await user.click(screen.getByRole('button', { name: 'Exporter le PDF…' }))
    expect(onExport.mock.calls[0]![0].sections.slice(-2)).toEqual(['baies', 'baies-cables'])
  })
})
