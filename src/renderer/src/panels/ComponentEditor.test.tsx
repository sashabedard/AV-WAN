// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComponentEditor } from './ComponentEditor'
import { libraryStore } from '../store/libraryStore'
import { uiStore } from '../store/uiStore'
import { CUSTOM_ID, blankDraft, templateFromDraft } from '../model/customTemplate'

const save = vi.fn(async () => undefined)
const replace = vi.fn(async () => undefined)
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>'

beforeEach(() => {
  libraryStore.setState({ templates: [], save, replace })
  uiStore.getState().openComponentEditor({ mode: 'new' })
})
afterEach(() => {
  cleanup()
  uiStore.getState().openComponentEditor(null)
  vi.clearAllMocks()
})

async function fillValid(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByLabelText('Nom'), 'Capteur LiDAR')
  await user.type(screen.getByLabelText('Code'), 'lid')
}

describe('ComponentEditor', () => {
  it('Enregistrer reste désactivé tant que la composante n’est pas valide, et dit pourquoi', async () => {
    const user = userEvent.setup()
    render(<ComponentEditor />)
    expect(screen.getByRole('dialog', { name: 'Nouvelle composante' })).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Enregistrer' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Donnez un nom à la composante.')).toBeTruthy()
    await fillValid(user)
    expect((screen.getByLabelText('Code') as HTMLInputElement).value).toBe('LID')
    expect((screen.getByRole('button', { name: 'Enregistrer' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('ajoute des ports en lot ; le PoE ne vaut que pour le RJ45', async () => {
    const user = userEvent.setup()
    render(<ComponentEditor />)
    await user.clear(screen.getByLabelText('Nombre de ports'))
    await user.type(screen.getByLabelText('Nombre de ports'), '4')
    await user.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect((screen.getByLabelText('Nom du port 4') as HTMLInputElement).value).toBe('ETH4')
    const poe = screen.getByLabelText('PoE du port 1') as HTMLSelectElement
    await user.selectOptions(poe, 'in-at')
    expect(poe.value).toBe('in-at')
    await user.selectOptions(screen.getByLabelText('Connecteur du port 1'), 'hdmi')
    expect(poe.disabled).toBe(true)
    expect(poe.value).toBe('none')
    await user.click(screen.getByRole('button', { name: 'Retirer le port 4' }))
    expect(screen.queryByLabelText('Nom du port 4')).toBeNull()
  })

  it('« Ressemble à… » pré-remplit la catégorie et les ports', async () => {
    const user = userEvent.setup()
    render(<ComponentEditor />)
    await user.selectOptions(screen.getByLabelText('Ressemble à…'), 'dante-avio')
    expect((screen.getByLabelText('Catégorie') as HTMLSelectElement).value).toBe('audio')
    expect((screen.getByLabelText('Nom du port 1') as HTMLInputElement).value).toBe('ETH')
    expect((screen.getByLabelText('PoE du port 1') as HTMLSelectElement).value).toBe('in-af')
    expect((screen.getByLabelText('Code') as HTMLInputElement).value).toBe('DNT')
  })

  it('refuse une icône qui n’est ni SVG ni PNG, et accepte un SVG', async () => {
    const { container } = render(<ComponentEditor />)
    const input = screen.getByLabelText('Fichier d’icône')
    fireEvent.change(input, { target: { files: [new File(['bonjour'], 'notes.txt', { type: 'text/plain' })] } })
    expect((await screen.findByRole('alert')).textContent).toBe('Ce fichier n’est ni un SVG ni un PNG.')
    fireEvent.change(input, { target: { files: [new File([SVG], 'capteur.svg', { type: 'image/svg+xml' })] } })
    await vi.waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(container.querySelector('.ce__preview .icon--mask')).toBeTruthy()
  })

  it('Entrée dans « Nombre de ports » ajoute les ports sans enregistrer', async () => {
    const user = userEvent.setup()
    render(<ComponentEditor />)
    await fillValid(user)
    await user.clear(screen.getByLabelText('Nombre de ports'))
    await user.type(screen.getByLabelText('Nombre de ports'), '3{Enter}')
    expect(screen.getByLabelText('Nom du port 3')).toBeTruthy()
    expect(save).not.toHaveBeenCalled()
    expect(uiStore.getState().componentEditor).not.toBeNull()
  })

  it('Enregistrer ajoute la composante à la bibliothèque et ferme la boîte', async () => {
    const user = userEvent.setup()
    render(<ComponentEditor />)
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Ajouter' }))
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ id: expect.stringMatching(CUSTOM_ID), name: 'Capteur LiDAR', code: 'LID', isCustom: true, ports: [{ id: 'ETH1', label: 'ETH1', connector: 'rj45', speedMbps: 1000 }] }))
    expect(uiStore.getState().componentEditor).toBeNull()
  })

  it('Modifier enregistre une nouvelle version et retire l’ancienne', async () => {
    const user = userEvent.setup()
    const old = templateFromDraft({ ...blankDraft(), name: 'Balise', code: 'BAL' }, 'custom-ancienne00')
    libraryStore.setState({ templates: [old] })
    uiStore.getState().openComponentEditor({ mode: 'edit', templateId: old.id })
    render(<ComponentEditor />)
    const dialog = screen.getByRole('dialog', { name: 'Modifier la composante' })
    expect(within(dialog).queryByLabelText('Ressemble à…')).toBeNull()
    expect((screen.getByLabelText('Nom') as HTMLInputElement).value).toBe('Balise')
    await user.type(screen.getByLabelText('Nom'), ' Wi-Fi')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(replace).toHaveBeenCalledWith('custom-ancienne00', expect.objectContaining({ name: 'Balise Wi-Fi', id: expect.not.stringMatching(/^custom-ancienne00$/) }))
  })

  it('Échap ferme sans rien enregistrer', async () => {
    const user = userEvent.setup()
    render(<ComponentEditor />)
    await user.keyboard('{Escape}')
    expect(uiStore.getState().componentEditor).toBeNull()
    expect(save).not.toHaveBeenCalled()
  })

  it('crée une composante patchable de 16 canaux, 470 W', async () => {
    const user = userEvent.setup()
    render(<ComponentEditor />)
    await user.type(screen.getByLabelText('Nom'), 'Lyre maison')
    await user.type(screen.getByLabelText('Code'), 'MH')
    await user.click(screen.getByLabelText('Appareil à patcher (DMX)'))
    await user.clear(screen.getByLabelText('Canaux'))
    await user.type(screen.getByLabelText('Canaux'), '16')
    await user.type(screen.getByLabelText('Puissance (W)'), '470')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ dmx: { footprint: 16 }, powerW: 470 }))
  })
})
