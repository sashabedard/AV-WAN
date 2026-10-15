import { describe, expect, it, vi } from 'vitest'
import type { MenuItemConstructorOptions } from 'electron'
import { menuTemplate, type FileMenuOptions, type HelpHandlers } from './menuTemplate'

const labels = (items: MenuItemConstructorOptions[]): string[] => items.map((i) => i.label ?? i.type ?? '')
function submenu(menu: MenuItemConstructorOptions[], label: string): MenuItemConstructorOptions[] {
  const m = menu.find((i) => i.label === label)
  if (!m || !Array.isArray(m.submenu)) throw new Error(`Menu ${label} introuvable`)
  return m.submenu
}
const click = (item: MenuItemConstructorOptions | undefined): void => (item?.click as (() => void) | undefined)?.()
const handlers = (): HelpHandlers => ({ about: vi.fn(), checkUpdates: vi.fn(), releases: vi.fn() })
const file = (): FileMenuOptions => ({ autoSave: true, toggleAutoSave: vi.fn() })

describe('menuTemplate', () => {
  it('Fichier › Enregistrement automatique est une case qui reflète et bascule le réglage', () => {
    const toggleAutoSave = vi.fn()
    const menu = menuTemplate(true, vi.fn(), handlers(), { autoSave: false, toggleAutoSave })
    const item = submenu(menu, 'Fichier').find((i) => i.label === 'Enregistrement automatique')
    expect(item).toMatchObject({ type: 'checkbox', checked: false })
    ;(item?.click as unknown as (it: { checked: boolean }) => void)({ checked: true })
    expect(toggleAutoSave).toHaveBeenCalledWith(true)
  })

  it('Fichier › Revenir à la version d’ouverture… suit la case et envoie son action', () => {
    const send = vi.fn()
    const fichier = submenu(menuTemplate(true, send, handlers(), file()), 'Fichier')
    const i = fichier.findIndex((it) => it.label === 'Enregistrement automatique')
    expect(fichier[i + 1]?.label).toBe('Revenir à la version d’ouverture…')
    click(fichier[i + 1])
    expect(send).toHaveBeenCalledWith('revertToOpened')
  })

  it('macOS : le menu de l’app en tête, et Aide sans « À propos »', () => {
    const help = handlers()
    const menu = menuTemplate(true, vi.fn(), help, file())
    expect(labels(menu)).toEqual(['AV·WAN', 'Fichier', 'Édition', 'Affichage', 'Aide'])
    const aide = submenu(menu, 'Aide')
    expect(labels(aide)).toEqual(['Rechercher les mises à jour…', 'Téléchargements et notes de version…'])
    click(aide[0])
    click(aide[1])
    expect(help.checkUpdates).toHaveBeenCalledOnce()
    expect(help.releases).toHaveBeenCalledOnce()
  })

  it('Windows : « À propos » dans Aide, et « Quitter » à la fin de Fichier', () => {
    const help = handlers()
    const menu = menuTemplate(false, vi.fn(), help, file())
    expect(labels(menu)).toEqual(['Fichier', 'Édition', 'Affichage', 'Aide'])
    const aide = submenu(menu, 'Aide')
    expect(labels(aide)).toEqual(['À propos d’AV·WAN', 'separator', 'Rechercher les mises à jour…', 'Téléchargements et notes de version…'])
    click(aide[0])
    expect(help.about).toHaveBeenCalledOnce()
    expect(labels(submenu(menu, 'Fichier')).at(-1)).toBe('Quitter')
  })

  it('les entrées envoient leur action au renderer', () => {
    const send = vi.fn()
    const menu = menuTemplate(true, send, handlers(), file())
    click(submenu(menu, 'Fichier').find((i) => i.label === 'Nouveau projet'))
    click(submenu(menu, 'Affichage').find((i) => i.label === 'Épingler cette vue'))
    expect(send.mock.calls).toEqual([['new'], ['pinView']])
  })
})
