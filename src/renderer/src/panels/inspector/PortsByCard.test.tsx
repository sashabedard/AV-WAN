// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PortsByCard } from './PortsByCard'
import { projectStore } from '../../store/projectStore'
import { uiStore } from '../../store/uiStore'
import { sampleProject } from '../../model/__fixtures__/sample'

const present = () => projectStore.getState().history.present
const cam = () => present().devices.find((d) => d.id === 'cam1')!
const show = (id = 'cam1') => render(<PortsByCard device={present().devices.find((d) => d.id === id)!} project={present()} />)

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  const p = sampleProject()
  p.devices[1]!.cards = [{ id: 'g', name: 'GPU 1' }]
  p.devices[1]!.ports.push({ id: 'DP-1', label: 'DP 1', connector: 'displayport', cardId: 'g' })
  projectStore.getState().loadProject(p, null)
})
afterEach(() => {
  act(() => uiStore.getState().setLang('fr'))
  cleanup()
  projectStore.getState().clearToast()
})

describe('PortsByCard', () => {
  it('affiche « Intégré » puis les cartes, chacune avec ses ports', () => {
    show()
    const names = screen.getAllByRole('textbox', { name: /^Nom de la carte/ }) as HTMLInputElement[]
    expect(names.map((n) => n.value)).toEqual(['', 'GPU 1'])
    expect(names[0]!.placeholder).toBe('Intégré')
    const gpu = screen.getByRole('group', { name: 'GPU 1' })
    expect((within(gpu).getByRole('textbox', { name: 'Libellé du port DP 1' }) as HTMLInputElement).value).toBe('DP 1')
    expect(within(gpu).queryByRole('textbox', { name: 'Libellé du port ETH' })).toBeNull()
  })

  it('le menu « + Ajouter une carte » liste les 6 préréglages et ajoute une carte', async () => {
    const user = userEvent.setup()
    show()
    const menu = screen.getByRole('combobox', { name: 'Ajouter une carte' })
    expect(within(menu).getAllByRole('option').slice(1).map((o) => o.textContent)).toEqual([
      'GPU 4× DisplayPort', 'GPU 4× HDMI', 'Carte capture 4× SDI', 'Carte réseau 2× RJ45', 'Carte réseau 2× SFP+', 'Vide…'
    ])
    await user.selectOptions(menu, 'nic-rj45')
    expect(cam().cards!.map((c) => c.name)).toEqual(['GPU 1', 'Carte réseau 1'])
  })

  it('✕ sur une carte la supprime ; + ajoute un port dans la carte ; ✕ sur un port le retire', async () => {
    const user = userEvent.setup()
    show()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ajouter un port à GPU 1' }), 'displayport')
    expect(cam().ports.filter((p) => p.cardId === 'g').map((p) => p.label)).toEqual(['DP 1', 'DP 2'])
    await user.click(screen.getByRole('button', { name: 'Supprimer le port HDMI' }))
    expect(cam().ports.map((p) => p.id)).not.toContain('HDMI')
    await user.click(screen.getByRole('button', { name: 'Supprimer la carte GPU 1' }))
    expect(cam().cards).toEqual([])
    expect(cam().ports.map((p) => p.id)).toEqual(['ETH'])
  })

  it('renommer un port et « Intégré »', async () => {
    const user = userEvent.setup()
    show()
    await user.type(screen.getByRole('textbox', { name: 'Libellé du port DP 1' }), '{Control>}a{/Control}Moniteur{Enter}')
    expect(cam().ports.find((p) => p.id === 'DP-1')!.label).toBe('Moniteur')
    await user.type(screen.getAllByRole('textbox', { name: /^Nom de la carte/ })[0]!, 'Carte mère{Enter}')
    expect(cam().onboardName).toBe('Carte mère')
  })

  it('aucune commande d’ajout ni de suppression pour un switch', () => {
    show('sw1')
    expect(screen.queryByRole('combobox', { name: 'Ajouter une carte' })).toBeNull()
    expect(screen.queryByRole('combobox', { name: /^Ajouter un port/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Supprimer le port/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Ajouter une IP à 1' })).toBeTruthy()
  })

  it('en anglais', () => {
    act(() => uiStore.getState().setLang('en'))
    show()
    expect((screen.getAllByRole('textbox', { name: /^Card name/ })[0] as HTMLInputElement).placeholder).toBe('Onboard')
    expect(screen.getByRole('combobox', { name: 'Add a card' })).toBeTruthy()
  })
})
