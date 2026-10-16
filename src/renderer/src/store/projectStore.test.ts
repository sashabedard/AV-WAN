import { afterEach, describe, expect, it } from 'vitest'
import { createDevice, createProject } from '../model/project'
import type { Device, Project } from '../model/types'
import { createProjectStore, isDirty, linksOnRemovedPorts } from './projectStore'
import { copyFragment } from '../model/clipboard'
import { vlanPreset } from '../catalog/vlanPresets'
import { sampleProject } from '../model/__fixtures__/sample'
import { blankDraft, templateFromDraft } from '../model/customTemplate'
import { dmxChannelsStore } from './dmxChannelsStore'
import { uiStore } from './uiStore'

const store = () => createProjectStore(sampleProject())

describe('projectStore', () => {
  it('change le format du PDF sans entrée d’historique, et ⌘Z ne le défait pas', () => {
    const s = store()
    s.getState().updateMeta({ title: 'Avant' })
    s.getState().setPageFormat('iso')
    expect(s.getState().history.past).toHaveLength(1)
    s.getState().undo()
    expect(s.getState().history.present.meta.title).toBe('Installation Lumen')
    expect(s.getState().history.present.settings.pageFormat).toBe('iso')
  })

  it('en lecture seule, change le format sans rendre le fichier « modifié »', () => {
    const s = store()
    s.getState().loadProject(sampleProject(), null, { readOnly: true })
    s.getState().setPageFormat('iso')
    expect(s.getState().history.present.settings.pageFormat).toBe('iso')
    expect(isDirty(s.getState())).toBe(false)
  })

  it('ajoute un appareil, puis annule', () => {
    const s = store()
    const id = s.getState().addDevice('dante-avio', { x: 10, y: 20 })
    expect(s.getState().history.present.devices.find((d) => d.id === id)?.name).toBe('DNT-1')
    s.getState().undo()
    expect(s.getState().history.present.devices).toHaveLength(2)
  })

  it('branche avec un ID de câble et un médium par défaut, et refuse un port occupé', () => {
    const s = store()
    const id = s.getState().addDevice('dante-avio', { x: 0, y: 0 })
    const linkId = s.getState().connect({ deviceId: id, portId: 'ETH' }, { deviceId: 'sw1', portId: '2' })
    const link = s.getState().history.present.links.find((l) => l.id === linkId)
    expect(link).toMatchObject({ cableId: 'C-002', medium: 'cat6' })
    expect(s.getState().connect({ deviceId: id, portId: 'ETH' }, { deviceId: 'sw1', portId: '3' })).toBeNull()
    expect(s.getState().toast).toContain('Branchement impossible')
  })

  it('change de numéro de document à chaque nouveau projet ou ouverture, pas à chaque modification', () => {
    const s = store()
    const first = s.getState().docId
    s.getState().updateMeta({ title: 'x' })
    expect(s.getState().docId).toBe(first)
    s.getState().loadProject(sampleProject(), null)
    expect(s.getState().docId).toBe(first + 1)
    s.getState().newProject()
    expect(s.getState().docId).toBe(first + 2)
  })

  it('un déplacement de plusieurs appareils est une seule entrée d’historique', () => {
    const s = store()
    s.getState().moveDevices([
      { id: 'sw1', position: { x: 100, y: 100 } },
      { id: 'cam1', position: { x: 100, y: 300 } }
    ])
    expect(s.getState().history.past).toHaveLength(1)
    s.getState().undo()
    expect(s.getState().history.present.devices[0]!.position).toEqual({ x: 0, y: 0 })
  })

  it('supprimer un appareil supprime ses câbles et vide la sélection', () => {
    const s = store()
    s.getState().setSelection({ deviceIds: ['cam1'], linkIds: [] })
    s.getState().removeElements(['cam1'], [])
    expect(s.getState().history.present.links).toHaveLength(0)
    expect(s.getState().selection).toEqual({ deviceIds: [], linkIds: [] })
  })

  it('passer de 8 à 4 ports retire le câble branché sur le port 6', () => {
    const s = store()
    s.getState().updateSwitchSpec('sw1', { portCount: 8, poe: 'at', poeBudgetW: 120, sfpPlus: 0, managed: true })
    const id = s.getState().addDevice('dante-avio', { x: 0, y: 0 })
    s.getState().connect({ deviceId: id, portId: 'ETH' }, { deviceId: 'sw1', portId: '6' })
    s.getState().setPortState('sw1', '6', { note: 'à retirer' })
    const four = { portCount: 4 as const, poe: 'at' as const, poeBudgetW: 60, sfpPlus: 0 as const, managed: true }
    expect(linksOnRemovedPorts(s.getState().history.present, 'sw1', four).map((l) => l.b.portId)).toEqual(['6'])
    s.getState().updateSwitchSpec('sw1', four)
    const p = s.getState().history.present
    expect(p.links.map((l) => l.id)).toEqual(['l1'])
    expect(p.devices[0]!.portState['6']).toBeUndefined()
    s.getState().undo()
    expect(s.getState().history.present.links).toHaveLength(2)
  })

  it('les câbles retirés sont exactement ceux annoncés par linksOnRemovedPorts, et il reste 4 ports', () => {
    const s = store()
    s.getState().updateSwitchSpec('sw1', { portCount: 8, poe: 'at', poeBudgetW: 120, sfpPlus: 0, managed: true })
    const a = s.getState().addDevice('dante-avio', { x: 0, y: 0 })
    const b = s.getState().addDevice('dante-avio', { x: 0, y: 100 })
    s.getState().connect({ deviceId: a, portId: 'ETH' }, { deviceId: 'sw1', portId: '6' })
    s.getState().connect({ deviceId: b, portId: 'ETH' }, { deviceId: 'sw1', portId: '8' })
    const four = { portCount: 4 as const, poe: 'at' as const, poeBudgetW: 60, sfpPlus: 0 as const, managed: true }
    const before = s.getState().history.present
    const announced = linksOnRemovedPorts(before, 'sw1', four).map((l) => l.id)
    expect(announced).toHaveLength(2)
    s.getState().updateSwitchSpec('sw1', four)
    const after = s.getState().history.present
    const remaining = new Set(after.links.map((l) => l.id))
    const missing = before.links.map((l) => l.id).filter((id) => !remaining.has(id))
    expect(missing.sort()).toEqual([...announced].sort())
    expect(after.devices.find((d) => d.id === 'sw1')!.ports).toHaveLength(4)
  })

  it('règle le VLAN d’un câble sur le port du switch', () => {
    const s = store()
    s.getState().setLinkVlan('l1', { kind: 'access', vlan: 10 })
    expect(s.getState().history.present.devices[0]!.portState['1']).toEqual({ mode: 'access', nativeVlan: 10 })
  })

  it("suit l'état « modifié » et l'annulation jusqu'à l'état enregistré", () => {
    const s = store()
    s.getState().markSaved('/tmp/a.avwan')
    expect(isDirty(s.getState())).toBe(false)
    s.getState().updateMeta({ title: 'Autre' })
    expect(isDirty(s.getState())).toBe(true)
    s.getState().undo()
    expect(isDirty(s.getState())).toBe(false)
  })

  it("ouvrir un projet réinitialise l'historique : on ne revient jamais au projet précédent", () => {
    const s = store()
    s.getState().updateMeta({ title: 'Avant' })
    s.getState().loadProject({ ...sampleProject(), meta: { ...sampleProject().meta, title: 'Ouvert' } }, '/tmp/b.avwan')
    s.getState().undo()
    expect(s.getState().history.present.meta.title).toBe('Ouvert')
    expect(s.getState().filePath).toBe('/tmp/b.avwan')
  })

  it('refuse toute modification en lecture seule', () => {
    const s = store()
    s.getState().loadProject(sampleProject(), null, { readOnly: true })
    s.getState().updateMeta({ title: 'Interdit' })
    expect(s.getState().history.present.meta.title).toBe('Installation Lumen')
    expect(s.getState().toast).toContain('lecture seule')
  })

  it('changer le mode de couleur ne crée aucune entrée d’historique, et ⌘Z ne le défait pas', () => {
    const s = store()
    s.getState().markSaved('/tmp/a.avwan')
    s.getState().updateMeta({ title: 'Modifié' })
    s.getState().setColorMode('type')
    expect(s.getState().history.past).toHaveLength(1)
    expect(isDirty(s.getState())).toBe(true)
    s.getState().undo()
    expect(s.getState().history.present.meta.title).toBe('Installation Lumen')
    expect(s.getState().history.present.settings.colorMode).toBe('type')
    s.getState().redo()
    expect(s.getState().history.present.settings.colorMode).toBe('type')
    const before = s.getState().history
    s.getState().setColorMode('type')
    expect(s.getState().history).toBe(before)
  })

  it('undo sans changement de mode garde l’instantané d’origine (l’état enregistré redevient propre)', () => {
    const s = store()
    s.getState().markSaved('/tmp/a.avwan')
    s.getState().updateMeta({ title: 'Autre' })
    s.getState().undo()
    expect(isDirty(s.getState())).toBe(false)
  })

  it('rebranche un bout en une entrée d’historique et retire le coude manuel', () => {
    const s = store()
    s.getState().updateLink('l1', { elbow: { dx: 20, dy: 0 } })
    expect(s.getState().reconnect('l1', 'a', { deviceId: 'sw1', portId: '3' })).toBe(true)
    const l = s.getState().history.present.links[0]!
    expect(l.a).toEqual({ deviceId: 'sw1', portId: '3' })
    expect(l.elbow).toBeUndefined()
    expect(s.getState().history.past).toHaveLength(2)
    s.getState().undo()
    expect(s.getState().history.present.links[0]!.a.portId).toBe('1')
  })

  it('refuse un port occupé ou incompatible, et la lecture seule', () => {
    const s = store()
    const id = s.getState().addDevice('dante-avio', { x: 0, y: 0 })
    s.getState().connect({ deviceId: id, portId: 'ETH' }, { deviceId: 'sw1', portId: '2' })
    expect(s.getState().reconnect('l1', 'a', { deviceId: 'sw1', portId: '2' })).toBe(false)
    expect(s.getState().toast).toContain('Rebranchement impossible')
    s.getState().loadProject(sampleProject(), null, { readOnly: true })
    expect(s.getState().reconnect('l1', 'a', { deviceId: 'sw1', portId: '3' })).toBe(false)
    expect(s.getState().history.present.links[0]!.a.portId).toBe('1')
    expect(s.getState().toast).toContain('lecture seule')
  })

  it('colle un fragment en une entrée d’historique et sélectionne les copies', () => {
    const s = store()
    const f = copyFragment(s.getState().history.present, ['cam1'])!
    const [id] = s.getState().pasteFragment(f, { x: 24, y: 24 })
    expect(s.getState().history.past).toHaveLength(1)
    expect(s.getState().selection).toEqual({ deviceIds: [id], linkIds: [] })
  })

  it('ne remplace pas la sélection par une sélection identique', () => {
    const s = store()
    s.getState().setSelection({ deviceIds: ['cam1'], linkIds: [] })
    const before = s.getState().selection
    s.getState().setSelection({ deviceIds: ['cam1'], linkIds: [] })
    expect(s.getState().selection).toBe(before)
  })
})

describe('zones dans le store', () => {
  it('⌘G crée une zone autour de la sélection et y range les appareils, en une entrée', () => {
    const s = store()
    s.getState().setSelection({ deviceIds: ['cam1'], linkIds: [] })
    const id = s.getState().zoneAroundSelection()!
    const p = s.getState().history.present
    expect(p.zones[0]).toMatchObject({ id, name: 'Zone 1', rect: { x: -24, y: 148, w: 224, h: 134 } })
    expect(p.devices[1]!.zoneId).toBe(id)
    expect(s.getState().history.past).toHaveLength(1)
  })

  it('⌘G sans sélection explique quoi faire', () => {
    const s = store()
    expect(s.getState().zoneAroundSelection()).toBeNull()
    expect(s.getState().toast).toContain('Sélectionnez')
  })

  it('déposer un appareil dans une zone l’y range, dans la même entrée que le déplacement', () => {
    const s = store()
    const z = s.getState().addZone({ x: 400, y: 400, w: 400, h: 300 })
    s.getState().moveDevices([{ id: 'cam1', position: { x: 500, y: 500 } }])
    expect(s.getState().history.present.devices[1]!.zoneId).toBe(z)
    expect(s.getState().history.past).toHaveLength(2)
  })

  it('déplacer une zone et un de ses membres sélectionné ne déplace pas le membre deux fois', () => {
    const s = store()
    s.getState().setSelection({ deviceIds: ['cam1'], linkIds: [] })
    const z = s.getState().zoneAroundSelection()!
    s.getState().moveSelection({ devices: [{ id: 'cam1', position: { x: 40, y: 200 } }], zones: [{ id: z, dx: 40, dy: 0 }] })
    expect(s.getState().history.present.devices[1]!.position).toEqual({ x: 40, y: 200 })
  })

  it('un membre sélectionné suit le décalage de sa zone, même si la position demandée diffère', () => {
    const s = store()
    s.getState().setSelection({ deviceIds: ['cam1'], linkIds: [] })
    const z = s.getState().zoneAroundSelection()!
    s.getState().moveSelection({ devices: [{ id: 'cam1', position: { x: 500, y: 500 } }], zones: [{ id: z, dx: 40, dy: 0 }] })
    expect(s.getState().history.present.devices[1]!.position).toEqual({ x: 40, y: 200 })
  })

  it('supprimer une zone garde ses appareils', () => {
    const s = store()
    s.getState().setSelection({ deviceIds: ['cam1'], linkIds: [] })
    const z = s.getState().zoneAroundSelection()!
    s.getState().removeElements([], [], [z])
    const p = s.getState().history.present
    expect(p.zones).toEqual([])
    expect(p.devices).toHaveLength(2)
    expect(p.devices[1]!.zoneId).toBeUndefined()
  })

  it('un déplacement dans un fichier du plan 1 ne crée aucun zoneId', () => {
    const s = store()
    s.getState().moveDevices([{ id: 'cam1', position: { x: 8, y: 208 } }])
    const cam = s.getState().history.present.devices[1]!
    expect(cam.position).toEqual({ x: 8, y: 208 })
    expect('zoneId' in cam).toBe(false)
  })

  it('refuse de créer une zone en lecture seule', () => {
    const s = store()
    s.getState().loadProject(sampleProject(), null, { readOnly: true })
    s.getState().addZone({ x: 0, y: 0, w: 100, h: 100 })
    expect(s.getState().history.present.zones).toEqual([])
    expect(s.getState().toast).toContain('lecture seule')
  })
})

describe('VLAN dans le store', () => {
  it('ajoute, modifie et annule', () => {
    const s = store()
    s.getState().addVlan(vlanPreset(30, 'fr'))
    s.getState().updateVlan(30, { name: 'Dante principal' })
    expect(s.getState().history.present.vlans.map((v) => v.name)).toEqual(['Dante principal', 'NDI'])
    s.getState().undo()
    expect(s.getState().history.present.vlans.map((v) => v.name)).toEqual(['Dante A', 'NDI'])
  })

  it('renumérote, ou explique pourquoi c’est refusé', () => {
    const s = store()
    expect(s.getState().changeVlanId(40, 41)).toBe(true)
    expect(s.getState().history.present.devices[0]!.portState['1']!.nativeVlan).toBe(41)
    s.getState().addVlan(vlanPreset(10, 'fr'))
    expect(s.getState().changeVlanId(41, 10)).toBe(false)
    expect(s.getState().toast).toBe('Le VLAN 10 existe déjà.')
    expect(s.getState().changeVlanId(41, 5000)).toBe(false)
    expect(s.getState().toast).toBe('Numéro de VLAN invalide : choisissez un nombre de 1 à 4094.')
  })

  it('une renumérotation est une seule annulation, qui rend l’ancien numéro aux ports', () => {
    const s = store()
    s.getState().changeVlanId(40, 41)
    expect(s.getState().history.past).toHaveLength(1)
    s.getState().undo()
    expect(s.getState().history.present.vlans[0]!.id).toBe(40)
    expect(s.getState().history.present.devices[0]!.portState['1']!.nativeVlan).toBe(40)
  })

  it('renumérote refuse en lecture seule, sans rien changer', () => {
    const s = store()
    s.getState().loadProject(sampleProject(), null, { readOnly: true })
    const before = s.getState().history.present
    expect(s.getState().changeVlanId(40, 41)).toBe(false)
    expect(s.getState().toast).toContain('lecture seule')
    expect(s.getState().history.present).toBe(before)
  })

  it('retire un VLAN ; refuse les modifications en lecture seule', () => {
    const s = store()
    s.getState().removeVlan(40)
    expect(s.getState().history.present.vlans).toEqual([])
    s.getState().loadProject(sampleProject(), null, { readOnly: true })
    s.getState().updateVlan(40, { name: 'Interdit' })
    expect(s.getState().history.present.vlans[0]!.name).toBe('NDI')
    expect(s.getState().toast).toContain('lecture seule')
  })

  it('un changement de mode de couleur sur un fichier en lecture seule n’est pas une modification', () => {
    const s = createProjectStore()
    s.getState().loadProject(sampleProject(), null, { readOnly: true })
    s.getState().setColorMode('type')
    expect(s.getState().history.present.settings.colorMode).toBe('type')
    expect(isDirty(s.getState())).toBe(false)
  })
})

describe('documents restaurés et sans titre', () => {
  it('un projet restauré est chargé comme modifié, relié à son fichier', () => {
    const store = createProjectStore()
    store.getState().loadProject(sampleProject(), '/x/a.avwan', { restored: true })
    expect(isDirty(store.getState())).toBe(true)
    expect(store.getState().filePath).toBe('/x/a.avwan')
  })

  it('chaque document reçoit un nouvel identifiant sans titre', () => {
    const store = createProjectStore()
    const first = store.getState().untitledId
    expect(first).toMatch(/^[A-Za-z0-9_-]{6,40}$/)
    store.getState().newProject()
    const second = store.getState().untitledId
    store.getState().loadProject(sampleProject(), null)
    expect(new Set([first, second, store.getState().untitledId]).size).toBe(3)
  })
})

describe('placer une composante perso', () => {
  it('l’embarque une seule fois et nomme les appareils avec son code', () => {
    const store = createProjectStore()
    const lidar = templateFromDraft({ ...blankDraft(), name: 'Capteur LiDAR', code: 'LID', ports: [{ label: 'ETH', connector: 'rj45', poe: 'in-af' }] }, 'custom-lidar00001', 'fr')
    store.getState().addDevice(lidar.id, { x: 0, y: 0 }, { template: lidar })
    store.getState().addDevice(lidar.id, { x: 200, y: 0 }, { template: lidar })
    const p = store.getState().history.present
    expect(p.templates).toEqual([lidar])
    expect(p.devices.map((d) => d.name)).toEqual(['LID-1', 'LID-2'])
    expect(p.devices[0]!.ports).toEqual([{ id: 'ETH', label: 'ETH', connector: 'rj45', speedMbps: 1000, poeIn: 'af' }])
  })

  it('règle la tension secteur, annulable', () => {
    const s = createProjectStore()
    s.getState().setMainsVoltage(230)
    expect(s.getState().history.present.settings.mainsVoltage).toBe(230)
    s.getState().undo()
    expect(s.getState().history.present.settings.mainsVoltage).toBeUndefined()
  })

  it('modifie le patch, la puissance, l’alimentation et la bande d’un appareil', () => {
    const s = createProjectStore()
    const id = s.getState().addDevice('dmx-fixture', { x: 0, y: 0 })
    s.getState().updateDevice(id, { dmx: { footprint: 16, address: 33 }, powerW: 470 })
    expect(s.getState().history.present.devices[0]).toMatchObject({ dmx: { footprint: 16, address: 33 }, powerW: 470 })
  })
})

describe('listes de canaux DMX', () => {
  const WASH = { templateId: 'dmx-fixture', model: 'Wash', mode: '9CH' }
  afterEach(() => dmxChannelsStore.setState({ lists: [] }))

  it('nommer les canaux est une étape annulable', () => {
    const store = createProjectStore(createProject(new Date(2026, 9, 15), 'fr'))
    store.getState().setChannelList(WASH, ['Red', 'Green'])
    expect(store.getState().history.present.dmxChannels).toEqual([{ ...WASH, params: ['Red', 'Green'] }])
    store.getState().undo()
    expect(store.getState().history.present.dmxChannels).toBeUndefined()
    store.getState().redo()
    store.getState().removeChannelList(WASH)
    expect(store.getState().history.present.dmxChannels).toBeUndefined()
  })

  it('lecture seule : rien ne change, le message s’affiche', () => {
    const store = createProjectStore(createProject(new Date(2026, 9, 15), 'fr'))
    store.setState({ readOnly: true })
    store.getState().setChannelList(WASH, ['Red'])
    expect(store.getState().history.present.dmxChannels).toBeUndefined()
    expect(store.getState().toast).toMatch(/lecture seule/)
  })

  it('placer un appareil copie la liste des réglages dans le projet ; ⌘Z retire l’appareil et la liste ensemble', () => {
    dmxChannelsStore.setState({ lists: [{ templateId: 'dmx-fixture', params: ['Red', 'Green'] }] })
    const store = createProjectStore(createProject(new Date(2026, 9, 15), 'fr'))
    store.getState().addDevice('dmx-fixture', { x: 0, y: 0 })
    expect(store.getState().history.present.dmxChannels).toEqual([{ templateId: 'dmx-fixture', params: ['Red', 'Green'] }])
    expect(store.getState().history.past).toHaveLength(1)
    store.getState().undo()
    expect(store.getState().history.present.devices).toEqual([])
    expect(store.getState().history.present.dmxChannels).toBeUndefined()
  })
})

describe('projectStore : toasts en anglais', () => {
  it('construit le message avec la langue de l’interface au moment de l’affichage', () => {
    uiStore.getState().setLang('en')
    try {
      const s = store()
      s.getState().zoneAroundSelection()
      expect(s.getState().toast).toBe('Select at least one device to create a zone around.')
    } finally {
      uiStore.getState().setLang('fr')
    }
  })
})

describe('projectStore : création dans la langue de l’interface (plan 6)', () => {
  it('addDevice écrit les étiquettes de ports du gabarit dans la langue de l’interface', () => {
    uiStore.getState().setLang('en')
    try {
      const s = store()
      const id = s.getState().addDevice('dante-pcie', { x: 0, y: 0 })!
      expect(s.getState().history.present.devices.find((d) => d.id === id)!.ports[0]!.label).toBe('Primary')
      expect(createProjectStore().getState().history.present.meta.title).toBe('New project')
    } finally {
      uiStore.getState().setLang('fr')
    }
  })
})

describe('projectStore : adresses DMX en chaîne (plan 7)', () => {
  function base(addresses: Array<number | undefined> = [undefined, undefined, undefined], c = 21): Project {
    let p = createProject(new Date(2026, 9, 14), 'fr')
    const add = (id: string, tpl: string, extra: Partial<Device>): void => {
      p = { ...p, devices: [...p.devices, { ...createDevice(p, tpl, { x: 0, y: 0 }, { lang: 'fr', id }), ...extra }] }
    }
    add('ode', 'dmx-node', { name: 'ODE-1', portState: { 'DMX-1': { universe: 1 } } })
    const fp = [16, 16, c]
    ;['a', 'b', 'c'].forEach((id, i) => add(id, 'dmx-fixture', { dmx: { footprint: fp[i]!, ...(addresses[i] !== undefined ? { address: addresses[i] } : {}) } }))
    const ref = (d: string, portId: string) => ({ deviceId: d, portId })
    const links = [
      ['ode', 'DMX-1', 'a', 'DMX-IN'],
      ['a', 'DMX-OUT', 'b', 'DMX-IN'],
      ['b', 'DMX-OUT', 'c', 'DMX-IN']
    ].map(([d1, p1, d2, p2], i) => ({ id: `l${i + 1}`, cableId: `C-${i + 1}`, a: ref(d1!, p1!), b: ref(d2!, p2!), medium: 'dmx' as const }))
    return { ...p, links }
  }
  const loaded = (p: Project = base()) => {
    const s = createProjectStore()
    s.getState().loadProject(p, null)
    return s
  }
  const addrs = (s: ReturnType<typeof loaded>): Record<string, number | undefined> =>
    Object.fromEntries(s.getState().history.present.devices.filter((d) => d.id.length === 1).map((d) => [d.id, d.dmx?.address]))

  it('recâbler : adresses suivies, un seul undo/redo', () => {
    const s = loaded()
    expect(addrs(s)).toEqual({ a: 1, b: 17, c: 33 })
    s.getState().removeElements([], ['l2', 'l3'])
    s.getState().connect({ deviceId: 'a', portId: 'DMX-OUT' }, { deviceId: 'c', portId: 'DMX-IN' })
    s.getState().connect({ deviceId: 'c', portId: 'DMX-OUT' }, { deviceId: 'b', portId: 'DMX-IN' })
    expect(addrs(s)).toEqual({ a: 1, c: 17, b: 38 })
    s.getState().undo()
    s.getState().undo()
    s.getState().undo()
    expect(addrs(s)).toEqual({ a: 1, b: 17, c: 33 })
    expect(s.getState().history.present.links).toHaveLength(3)
    s.getState().redo()
    s.getState().redo()
    s.getState().redo()
    expect(addrs(s)).toEqual({ a: 1, c: 17, b: 38 })
  })

  it('un seul undo remet câble et adresses d’une reconnexion', () => {
    const s = loaded()
    s.getState().removeElements([], ['l2', 'l3'])
    s.getState().connect({ deviceId: 'a', portId: 'DMX-OUT' }, { deviceId: 'c', portId: 'DMX-IN' })
    const before = addrs(s)
    expect(before.c).toBe(17)
    s.getState().undo()
    expect(s.getState().history.present.links.some((l) => l.b.deviceId === 'c' && l.a.deviceId === 'a')).toBe(false)
    expect(addrs(s)).toEqual({ a: 1, b: 17, c: 33 })
    s.getState().redo()
    expect(addrs(s)).toEqual(before)
  })

  it('changer le mode (16 → 21 canaux) décale la suite, annulé en une étape', () => {
    const s = loaded(base(undefined, 16))
    const past = s.getState().history.past.length
    s.getState().updateDevice('b', { dmx: { footprint: 21 } })
    expect(addrs(s)).toEqual({ a: 1, b: 17, c: 38 })
    expect(s.getState().history.past.length).toBe(past + 1)
    s.getState().undo()
    expect(addrs(s)).toEqual({ a: 1, b: 17, c: 33 })
  })

  it('supprimer b au milieu : c garde son adresse, rebrancher a → c la fait remonter', () => {
    const s = loaded()
    s.getState().removeElements(['b'], [])
    expect(addrs(s)).toEqual({ a: 1, c: 33 })
    s.getState().connect({ deviceId: 'a', portId: 'DMX-OUT' }, { deviceId: 'c', portId: 'DMX-IN' })
    expect(addrs(s)).toEqual({ a: 1, c: 17 })
  })

  it('ouvre un ancien projet sans bouger une adresse ni le rendre modifié', () => {
    const s = loaded(base([1, 17, 50]))
    expect(addrs(s)).toEqual({ a: 1, b: 17, c: 50 })
    expect(isDirty(s.getState())).toBe(false)
    expect(s.getState().history.present.devices.find((d) => d.id === 'c')!.dmx!.addressPinned).toBe(true)
    expect(s.getState().history.past).toHaveLength(0)
  })

  it('une copie de récupération reste modifiée', () => {
    const s = createProjectStore()
    s.getState().loadProject(base(), null, { restored: true })
    expect(isDirty(s.getState())).toBe(true)
  })

  it('un appareil ajouté puis câblé au bout de la chaîne prend l’adresse suivante', () => {
    const s = loaded(base(undefined, 16))
    const id = s.getState().addDevice('dmx-fixture', { x: 0, y: 0 })
    s.getState().updateDevice(id, { dmx: { footprint: 16 } })
    s.getState().connect({ deviceId: 'c', portId: 'DMX-OUT' }, { deviceId: id, portId: 'DMX-IN' })
    const d = s.getState().history.present.devices.find((x) => x.id === id)!
    expect(d.dmx?.addressPinned).toBeUndefined()
    expect(d.dmx?.address).toBe(49)
  })

  it('une modification sans rapport (zone) ne change aucune adresse ni la référence des appareils', () => {
    const s = loaded()
    const before = s.getState().history.present.devices
    const z = s.getState().addZone({ x: 0, y: 0, w: 100, h: 100 }, 'Scène')
    s.getState().updateZone(z, { name: 'Salle' })
    expect(s.getState().history.present.devices.map((d) => d.dmx?.address)).toEqual(before.map((d) => d.dmx?.address))
  })

  it('en lecture seule, rien n’est recalculé ni modifié', () => {
    const s = createProjectStore()
    s.getState().loadProject(base(), null, { readOnly: true })
    s.getState().updateDevice('a', { dmx: { footprint: 21 } })
    expect(addrs(s)).toEqual({ a: 1, b: 17, c: 33 })
    expect(isDirty(s.getState())).toBe(false)
  })
})
