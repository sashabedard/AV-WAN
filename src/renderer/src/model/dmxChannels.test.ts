// src/renderer/src/model/dmxChannels.test.ts
import { describe, expect, it } from 'vitest'
import { createDevice, createProject } from './project'
import type { Device, StoredTemplate, DmxChannelList, Project } from './types'
import {
  catalogParams, channelKey, embedUsedLists, fillParams, keyId, mergeProjectLists, normalizeParams, ownNewKeys, parseSettingsLists, pastedNames,
  pruneChannelLists, removeList, removeProjectList, resolveChannels, sameParams, serializeSettingsLists, setProjectList, sharedCount, upsertList
} from './dmxChannels'

const LYRE: StoredTemplate = {
  id: 'custom-lyre000001', category: 'eclairage', name: 'Lyre', code: 'MH', icon: { kind: 'builtin', name: 'fixture' },
  ports: [{ id: 'DMX-IN', label: 'DMX IN', connector: 'dmx' }],
  dmx: { footprint: 3, modes: [{ name: '3CH', channels: 3, params: ['Dimmer', 'Pan', 'Tilt'] }, { name: '2CH', channels: 2 }] },
  isCustom: true
}

function project(): Project {
  let p: Project = { ...createProject(new Date(2026, 9, 15), 'fr'), templates: [LYRE] }
  const add = (id: string, templateId: string, extra: Partial<Device> = {}): void => {
    p = { ...p, devices: [...p.devices, { ...createDevice(p, templateId, { x: 0, y: 0 }, { lang: 'fr', id }), ...extra }] }
  }
  add('a', LYRE.id) // 1er mode : 3CH
  add('b', LYRE.id)
  add('c', LYRE.id, { dmx: { footprint: 2, mode: '2CH' } })
  add('w', 'dmx-fixture', { model: 'Wash', dmx: { footprint: 9, mode: '9CH' } })
  add('cam', 'ptz-ndi')
  return p
}
const dev = (p: Project, id: string): Device => p.devices.find((d) => d.id === id)!
const key = (p: Project, id: string) => channelKey(dev(p, id))!
const WASH = { templateId: 'dmx-fixture', model: 'Wash', mode: '9CH' }

describe('clé d’une liste', () => {
  it('gabarit, modèle tapé et mode ; rien sans patch DMX', () => {
    const p = project()
    expect(key(p, 'a')).toEqual({ templateId: LYRE.id, model: '', mode: '3CH' })
    expect(key(p, 'w')).toEqual(WASH)
    expect(channelKey(dev(p, 'cam'))).toBeNull()
    expect(keyId(key(p, 'a'))).toBe(keyId(key(p, 'b')))
    expect(sharedCount(p, key(p, 'a'))).toBe(2)
  })
})

describe('normalisation', () => {
  it('rogne, coupe à 60 caractères, retire les vides de fin, garde les trous', () => {
    expect(normalizeParams(['  Red ', '', 'Blue', '', '  '])).toEqual(['Red', '', 'Blue'])
    expect(normalizeParams(['x'.repeat(70)])[0]).toHaveLength(60)
    expect(sameParams(['Red', ''], ['Red'])).toBe(true)
    expect(sameParams(['Red'], ['Green'])).toBe(false)
  })
})

describe('lecture : projet, puis réglages, puis catalogue', () => {
  it('suit l’ordre et dit d’où vient la liste', () => {
    let p = project()
    const k = key(p, 'a')
    expect(catalogParams(p, k)).toEqual(['Dimmer', 'Pan', 'Tilt'])
    expect(resolveChannels(p, [], k)).toEqual({ params: ['Dimmer', 'Pan', 'Tilt'], source: 'catalog' })
    const settings: DmxChannelList[] = [{ templateId: LYRE.id, mode: '3CH', params: ['Intensité'] }]
    expect(resolveChannels(p, settings, k)).toEqual({ params: ['Intensité'], source: 'settings' })
    p = setProjectList(p, k, ['Dim', 'P', 'T'])
    expect(resolveChannels(p, settings, k)).toEqual({ params: ['Dim', 'P', 'T'], source: 'project' })
    expect(resolveChannels(p, settings, key(p, 'c'))).toBeNull() // 2CH : pas de params au catalogue
  })
})

describe('entrées du projet et des réglages', () => {
  it('écrit, ne change rien pour la même liste, garde une liste vide, retire', () => {
    const p = project()
    const k = key(p, 'w')
    const q = setProjectList(p, k, ['Red', 'Green '])
    expect(q.dmxChannels).toEqual([{ templateId: 'dmx-fixture', model: 'Wash', mode: '9CH', params: ['Red', 'Green'] }])
    expect(setProjectList(q, k, ['Red', 'Green'])).toBe(q)
    const empty = setProjectList(q, k, ['', ''])
    expect(empty.dmxChannels).toEqual([{ templateId: 'dmx-fixture', model: 'Wash', mode: '9CH', params: [] }])
    const gone = removeProjectList(q, k)
    expect(gone.dmxChannels).toBeUndefined()
    expect(removeProjectList(gone, k)).toBe(gone)
  })

  it('réglages : la même liste rend la même référence', () => {
    const lists = upsertList([], WASH, ['Red'])
    expect(upsertList(lists, WASH, ['Red'])).toBe(lists)
    expect(removeList(lists, { ...WASH, mode: '13CH' })).toBe(lists)
    expect(removeList(lists, WASH)).toEqual([])
  })

  it('collage d’appareils : le projet cible gagne, les clés absentes arrivent', () => {
    const p = setProjectList(project(), WASH, ['Mine'])
    const incoming: DmxChannelList[] = [
      { ...WASH, params: ['Theirs'] },
      { templateId: LYRE.id, mode: '2CH', params: ['A', 'B'] }
    ]
    const q = mergeProjectLists(p, incoming)
    expect(resolveChannels(q, [], WASH)?.params).toEqual(['Mine'])
    expect(resolveChannels(q, [], key(q, 'c'))?.params).toEqual(['A', 'B'])
    expect(mergeProjectLists(q, [])).toBe(q)
  })
})

describe('le projet garde une copie de chaque liste qu’il affiche', () => {
  const SPOT = { templateId: 'dmx-fixture', model: 'Spot', mode: '9CH' }
  const settings: DmxChannelList[] = [{ ...SPOT, params: ['Pan', 'Tilt'] }]
  const empty = (): Project => ({ ...createProject(new Date(2026, 9, 15), 'fr'), templates: [LYRE] })
  const add = (p: Project, id: string, templateId: string, extra: Partial<Device> = {}): Project => ({
    ...p,
    devices: [...p.devices, { ...createDevice(p, templateId, { x: 0, y: 0 }, { lang: 'fr', id }), ...extra }]
  })

  it('nouvel appareil : la liste des réglages, sinon celle du catalogue, est copiée', () => {
    const p = empty()
    const q = add(add(p, 's', 'dmx-fixture', { model: 'Spot', dmx: { footprint: 9, mode: '9CH' } }), 'a', LYRE.id)
    expect(ownNewKeys(p, q, settings).dmxChannels).toEqual([
      { ...SPOT, params: ['Pan', 'Tilt'] },
      { templateId: LYRE.id, mode: '3CH', params: ['Dimmer', 'Pan', 'Tilt'] }
    ])
  })

  it('aucune liste nulle part : rien n’est ajouté', () => {
    const p = empty()
    const q = add(p, 'c', LYRE.id, { dmx: { footprint: 2, mode: '2CH' } })
    expect(ownNewKeys(p, q, settings)).toBe(q)
  })

  it('clé déjà utilisée avant : rien ne change', () => {
    const p = project() // a et b lisent le catalogue, sans entrée (projet d’avant cette fonction)
    const q = add(p, 'a2', LYRE.id)
    expect(ownNewKeys(p, q, settings)).toBe(q)
  })

  it('entrée déjà dans le projet (collage) : gardée telle quelle', () => {
    const p = empty()
    const q = setProjectList(add(p, 'a', LYRE.id), { templateId: LYRE.id, model: '', mode: '3CH' }, ['Mine'])
    expect(ownNewKeys(p, q, settings)).toBe(q)
  })

  it('changer le modèle ou le mode : la liste de la nouvelle clé est copiée', () => {
    const p = project()
    const q = { ...p, devices: p.devices.map((d) => (d.id === 'w' ? { ...d, model: 'Spot' } : d)) }
    expect(ownNewKeys(p, q, settings).dmxChannels).toEqual([{ ...SPOT, params: ['Pan', 'Tilt'] }])
    const lyre = empty()
    const one = add(lyre, 'c', LYRE.id, { dmx: { footprint: 2, mode: '2CH' } })
    const three = { ...one, devices: one.devices.map((d) => ({ ...d, dmx: { footprint: 3, mode: '3CH' } })) }
    expect(ownNewKeys(one, three, []).dmxChannels).toEqual([{ templateId: LYRE.id, mode: '3CH', params: ['Dimmer', 'Pan', 'Tilt'] }])
  })

  it('même tableau d’appareils, ou appareils seulement déplacés : même référence', () => {
    const p = project()
    const meta = { ...p, meta: { ...p.meta, title: 'Autre' } }
    expect(ownNewKeys(p, meta, settings)).toBe(meta)
    const moved = { ...p, devices: p.devices.map((d) => ({ ...d, position: { x: 5, y: 5 } })) }
    expect(ownNewKeys(p, moved, settings)).toBe(moved)
  })
})

describe('fichier complet', () => {
  it('embarque les listes des réglages utilisées, jamais celles du catalogue seul', () => {
    const p = project()
    const settings: DmxChannelList[] = [{ ...WASH, params: ['Red'] }, { templateId: 'inutile', params: ['X'] }]
    const q = embedUsedLists(p, settings)
    expect(q.dmxChannels).toEqual([{ ...WASH, params: ['Red'] }])
    expect(embedUsedLists(p, [])).toBe(p)
    expect(embedUsedLists(q, settings)).toBe(q) // déjà là
  })

  it('n’écrit pas les listes qui ne servent à aucun appareil', () => {
    const p = setProjectList(setProjectList(project(), WASH, ['Red']), { templateId: 'parti', model: '', mode: '' }, ['X'])
    expect(pruneChannelLists(p).dmxChannels).toEqual([{ ...WASH, params: ['Red'] }])
    const lone = setProjectList(project(), { templateId: 'parti', model: '', mode: '' }, ['X'])
    expect(pruneChannelLists(lone).dmxChannels).toBeUndefined()
    const clean = project()
    expect(pruneChannelLists(clean)).toBe(clean)
  })
})

describe('collage de plusieurs lignes', () => {
  it('une ligne : collage normal (null)', () => {
    expect(pastedNames('Red')).toBeNull()
    expect(pastedNames('Red\n')).toBeNull()
  })

  it('une ligne par canal ; fins Windows, ligne vide finale ; tableau : dernière cellule non vide', () => {
    expect(pastedNames('Red\nGreen\nBlue\n')).toEqual(['Red', 'Green', 'Blue'])
    expect(pastedNames('Red\r\nGreen\r\n')).toEqual(['Red', 'Green'])
    expect(pastedNames('1\tPan\n2\tPan fine\t\n')).toEqual(['Pan', 'Pan fine'])
    expect(pastedNames(' Red \n\nBlue')).toEqual(['Red', '', 'Blue'])
  })

  it('remplit à partir d’un canal, s’arrête au dernier et compte le reste', () => {
    expect(fillParams(['A'], 1, ['B', 'C', 'D'], 3)).toEqual({ params: ['A', 'B', 'C'], ignored: 1 })
    expect(fillParams([], 2, ['C'], 9)).toEqual({ params: ['', '', 'C'], ignored: 0 })
    // Noms au-delà du nombre de canaux : gardés tels quels.
    expect(fillParams(['A', 'B', 'C', 'D'], 0, ['Z'], 2)).toEqual({ params: ['Z', 'B', 'C', 'D'], ignored: 0 })
  })
})

describe('fichier des réglages', () => {
  it('lit les entrées valides, ignore le reste ; la dernière d’une clé gagne', () => {
    expect(parseSettingsLists(null)).toEqual([])
    expect(parseSettingsLists('pas du json')).toEqual([])
    expect(parseSettingsLists('[1, 2]')).toEqual([])
    const text = JSON.stringify({
      lists: [
        { ...WASH, params: ['Old'] },
        { templateId: 3, params: [] },
        { templateId: 'x', params: ['y'.repeat(61)] },
        { ...WASH, params: ['New'] }
      ]
    })
    expect(parseSettingsLists(text)).toEqual([{ ...WASH, params: ['New'] }])
  })

  it('aller-retour', () => {
    const lists = upsertList([], WASH, ['Red', '', 'Blue'])
    expect(parseSettingsLists(serializeSettingsLists(lists))).toEqual(lists)
    expect(serializeSettingsLists(lists).endsWith('\n')).toBe(true)
  })
})

describe('mode DMX français et langue de l’interface', () => {
  it('« Étendu (EXT) » résout la même liste en français et en anglais', async () => {
    const { uiStore } = await import('../store/uiStore')
    let p = createProject(new Date(2026, 9, 15), 'fr')
    p = { ...p, devices: [{ ...createDevice(p, 'martin-mac-aura-xb', { x: 0, y: 0 }, { lang: 'fr', id: 'aura' }), dmx: { footprint: 25, mode: 'Étendu (EXT)' } }] }
    const k = channelKey(p.devices[0]!)!
    uiStore.getState().setLang('fr')
    const fr = resolveChannels(p, [], k)
    uiStore.getState().setLang('en')
    const en = resolveChannels(p, [], k)
    uiStore.getState().setLang('fr')
    expect(fr?.source).toBe('catalog')
    expect(fr?.params.length).toBe(25)
    expect(en).toEqual(fr)
    expect(k.mode).toBe('Étendu (EXT)')
  })
})
