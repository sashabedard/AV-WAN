import { describe, expect, it } from 'vitest'
import { createProjectStore, isDirty, linksOnRemovedPorts } from './projectStore'
import { copyFragment } from '../model/clipboard'
import { vlanPreset } from '../catalog/vlanPresets'
import { sampleProject } from '../model/__fixtures__/sample'

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
    s.getState().addVlan(vlanPreset(30))
    s.getState().updateVlan(30, { name: 'Dante principal' })
    expect(s.getState().history.present.vlans.map((v) => v.name)).toEqual(['Dante principal', 'NDI'])
    s.getState().undo()
    expect(s.getState().history.present.vlans.map((v) => v.name)).toEqual(['Dante A', 'NDI'])
  })

  it('renumérote, ou explique pourquoi c’est refusé', () => {
    const s = store()
    expect(s.getState().changeVlanId(40, 41)).toBe(true)
    expect(s.getState().history.present.devices[0]!.portState['1']!.nativeVlan).toBe(41)
    s.getState().addVlan(vlanPreset(10))
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
