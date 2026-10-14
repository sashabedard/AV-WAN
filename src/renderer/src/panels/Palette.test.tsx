// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Palette } from './Palette'
import { uiStore } from '../store/uiStore'
import { libraryStore } from '../store/libraryStore'
import { projectStore } from '../store/projectStore'
import { blankDraft, templateFromDraft } from '../model/customTemplate'
import { sampleProject } from '../model/__fixtures__/sample'

afterEach(() => {
  cleanup()
  uiStore.getState().setPendingTemplate(null)
  uiStore.getState().setPendingZone(false)
  libraryStore.setState({ templates: [] })
  uiStore.getState().openComponentEditor(null)
  projectStore.getState().newProject()
  vi.restoreAllMocks()
})

describe('Palette', () => {
  it('liste les catégories et les gabarits', () => {
    render(<Palette />)
    expect(screen.getByRole('heading', { name: 'Éclairage' })).toBeTruthy()
    expect(screen.getByTestId('palette-ptz-ndi').textContent).toContain('Caméra PTZ NDI')
  })

  it('un clic prépare un placement et un second clic l’annule', async () => {
    const user = userEvent.setup()
    render(<Palette />)
    await user.click(screen.getByTestId('palette-dante-avio'))
    expect(uiStore.getState().pendingTemplateId).toBe('dante-avio')
    await user.click(screen.getByTestId('palette-dante-avio'))
    expect(uiStore.getState().pendingTemplateId).toBeNull()
  })

  it('montre une icône par catégorie et par gabarit, et le code à droite', () => {
    const { container } = render(<Palette />)
    const item = screen.getByTestId('palette-ptz-ndi')
    expect(item.querySelector('svg.icon')).toBeTruthy()
    expect(item.lastElementChild?.textContent).toBe('CAM')
    expect(container.querySelectorAll('.palette__cat svg.icon')).toHaveLength(8)
  })

  it('filtre le catalogue par la même recherche que ⌘K', async () => {
    const user = userEvent.setup()
    render(<Palette />)
    await user.type(screen.getByRole('searchbox', { name: 'Filtrer les appareils' }), 'ptz')
    expect(screen.queryByRole('heading', { name: 'Éclairage' })).toBeNull()
    expect(screen.getByTestId('palette-ptz-ndi')).toBeTruthy()
    expect(screen.queryByTestId('palette-dante-avio')).toBeNull()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('heading', { name: 'Éclairage' })).toBeTruthy()
  })

  it('l’outil Zone s’arme d’un clic et s’exclut avec un gabarit', async () => {
    const user = userEvent.setup()
    render(<Palette />)
    const tool = screen.getByRole('button', { name: /^Zone/ })
    await user.click(tool)
    expect(uiStore.getState().pendingZone).toBe(true)
    expect(tool.getAttribute('aria-pressed')).toBe('true')
    await user.click(screen.getByTestId('palette-dante-avio'))
    expect(uiStore.getState().pendingZone).toBe(false)
    expect(uiStore.getState().pendingTemplateId).toBe('dante-avio')
  })
})

const balise = templateFromDraft({ ...blankDraft(), name: 'Balise Wi-Fi', code: 'BAL' }, 'custom-balise0001')
const capteur = templateFromDraft({ ...blankDraft(), name: 'Capteur LiDAR', code: 'LID' }, 'custom-capteur001')

function projectUsing(t: typeof capteur) {
  const base = sampleProject()
  return { ...base, templates: [t], devices: [...base.devices, { ...base.devices[0]!, id: 'lid1', name: 'LID-1', templateId: t.id }] }
}

describe('Palette : Mes composantes et Ce projet', () => {
  it('+ ouvre la boîte « Nouvelle composante » ; une invite quand la bibliothèque est vide', async () => {
    const user = userEvent.setup()
    render(<Palette />)
    expect(screen.getByText('Créez vos propres appareils avec +.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Nouvelle composante' }))
    expect(uiStore.getState().componentEditor).toEqual({ mode: 'new' })
  })

  it('une composante de la bibliothèque se place, et ⋯ propose Modifier, Dupliquer, Supprimer', async () => {
    const user = userEvent.setup()
    const save = vi.fn(async () => undefined)
    const remove = vi.fn(async () => undefined)
    libraryStore.setState({ templates: [balise], save, remove })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<Palette />)
    const mine = screen.getByRole('region', { name: 'Mes composantes' })
    await user.click(within(mine).getByTestId('palette-custom-balise0001'))
    expect(uiStore.getState().pendingTemplateId).toBe('custom-balise0001')
    await user.click(screen.getByRole('button', { name: 'Actions pour Balise Wi-Fi' }))
    await user.click(screen.getByRole('menuitem', { name: 'Dupliquer' }))
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Balise Wi-Fi (copie)' }))
    await user.click(screen.getByRole('button', { name: 'Actions pour Balise Wi-Fi' }))
    await user.click(screen.getByRole('menuitem', { name: 'Supprimer' }))
    expect(remove).toHaveBeenCalledWith('custom-balise0001')
    await user.click(screen.getByRole('button', { name: 'Actions pour Balise Wi-Fi' }))
    await user.click(screen.getByRole('menuitem', { name: 'Modifier' }))
    expect(uiStore.getState().componentEditor).toEqual({ mode: 'edit', templateId: 'custom-balise0001' })
  })

  it('« Ce projet » montre les composantes du fichier absentes de la bibliothèque', async () => {
    const user = userEvent.setup()
    const save = vi.fn(async () => undefined)
    libraryStore.setState({ templates: [], save })
    projectStore.getState().loadProject(projectUsing(capteur), null)
    render(<Palette />)
    const here = screen.getByRole('region', { name: 'Ce projet' })
    expect(within(here).getByTestId('palette-custom-capteur001')).toBeTruthy()
    await user.click(within(here).getByRole('button', { name: 'Ajouter Capteur LiDAR à ma bibliothèque' }))
    expect(save).toHaveBeenCalledWith(capteur)
  })

  it('une composante retirée de la bibliothèque reste plaçable depuis « Ce projet »', async () => {
    const user = userEvent.setup()
    libraryStore.setState({ templates: [capteur] })
    projectStore.getState().loadProject(projectUsing(capteur), null)
    render(<Palette />)
    expect(screen.queryByRole('region', { name: 'Ce projet' })).toBeNull()
    act(() => libraryStore.setState({ templates: [] }))
    const here = screen.getByRole('region', { name: 'Ce projet' })
    await user.click(within(here).getByTestId('palette-custom-capteur001'))
    expect(uiStore.getState().pendingTemplateId).toBe('custom-capteur001')
    expect(projectStore.getState().history.present.devices.some((d) => d.templateId === 'custom-capteur001')).toBe(true)
  })

  it('le filtre trouve aussi mes composantes', async () => {
    const user = userEvent.setup()
    libraryStore.setState({ templates: [balise] })
    render(<Palette />)
    await user.type(screen.getByLabelText('Filtrer les appareils'), 'balise')
    expect(within(screen.getByRole('list', { name: 'Résultats du filtre' })).getByTestId('palette-custom-balise0001')).toBeTruthy()
  })
})
