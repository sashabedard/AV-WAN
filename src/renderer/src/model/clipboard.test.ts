// src/renderer/src/model/clipboard.test.ts
import { describe, expect, it } from 'vitest'
import { copyFragment, nextCopyName, parseFragment, pasteFragment, serializeFragment } from './clipboard'
import { sampleProject } from './__fixtures__/sample'
import { blankDraft, templateFromDraft, withTemplate } from './customTemplate'
import { createDevice, createProject } from './project'
import type { Device, Project } from './types'
import { patchIndex } from './dmx'
import { autoAddress } from './daisyChain'

const ids = (): (() => string) => {
  let n = 0
  return () => `n${++n}`
}

describe('copyFragment', () => {
  it('copie les appareils choisis et seulement les câbles entre eux', () => {
    const p = sampleProject()
    expect(copyFragment(p, ['cam1'])).toEqual({ devices: [p.devices[1]], links: [], templates: [] })
    expect(copyFragment(p, ['sw1', 'cam1'])!.links.map((l) => l.id)).toEqual(['l1'])
    expect(copyFragment(p, [])).toBeNull()
  })
})

describe('nextCopyName', () => {
  it('prend le numéro libre suivant, ou ajoute -2', () => {
    const p = sampleProject()
    expect(nextCopyName(p, 'CAM-1')).toBe('CAM-2')
    expect(nextCopyName({ ...p, devices: [...p.devices, { ...p.devices[1]!, id: 'x', name: 'CAM-2' }] }, 'CAM-1')).toBe('CAM-3')
    expect(nextCopyName(p, 'Régie')).toBe('Régie-2')
  })
})

describe('pasteFragment', () => {
  it('colle avec de nouveaux identifiants, noms, câbles et une IP vidée', () => {
    const p = sampleProject()
    const f = copyFragment(p, ['sw1', 'cam1'])!
    const r = pasteFragment(p, f, { x: 24, y: 24 }, ids())
    expect(r.deviceIds).toEqual(['n1', 'n2'])
    expect(r.linkIds).toEqual(['n3'])
    const [sw, cam] = r.project.devices.slice(2)
    expect(sw).toMatchObject({ id: 'n1', name: 'SW-2', position: { x: 24, y: 24 }, portState: { '1': { mode: 'access', nativeVlan: 40 } } })
    expect(cam).toMatchObject({ id: 'n2', name: 'CAM-2', position: { x: 24, y: 224 }, ip: { address: '', mode: 'static' } })
    expect(r.project.links[1]).toMatchObject({ id: 'n3', cableId: 'C-002', a: { deviceId: 'n1', portId: '1' }, b: { deviceId: 'n2', portId: 'ETH' } })
  })

  it('n’emporte ni la zone ni le nom d’hôte', () => {
    const p = sampleProject()
    p.devices[1] = { ...p.devices[1]!, zoneId: 'z1', hostname: 'cam' }
    const [cam] = pasteFragment(p, copyFragment(p, ['cam1'])!, { x: 0, y: 0 }, ids()).project.devices.slice(2)
    expect(cam!.zoneId).toBeUndefined()
    expect(cam!.hostname).toBeUndefined()
  })
})

describe('parseFragment', () => {
  it('relit un fragment sérialisé et refuse tout le reste', () => {
    const p = sampleProject()
    const f = copyFragment(p, ['sw1', 'cam1'])!
    expect(parseFragment(serializeFragment(f))).toEqual({ ...f, dmxChannels: [] })
    expect(parseFragment('{pas du json')).toBeNull()
    expect(parseFragment(JSON.stringify({ devices: [], links: [] }))).toBeNull()
    expect(parseFragment(JSON.stringify({ avwanFragment: 1, devices: 'non', links: [] }))).toBeNull()
  })
})

describe('composantes perso dans le presse-papiers', () => {
  const lidar = templateFromDraft({ ...blankDraft(), name: 'Capteur LiDAR', code: 'LID', ports: [{ label: 'ETH', connector: 'rj45', poe: 'none' }] }, 'custom-lidar00001', 'fr')

  function sourceWithLidar() {
    const p = withTemplate(sampleProject(), lidar)
    const device = createDevice(p, lidar.id, { x: 0, y: 0 }, { lang: 'fr', id: 'lid1' })
    return { ...p, devices: [...p.devices, device] }
  }

  it('la copie emporte la composante, et le collage l’ajoute au projet qui ne l’a pas', () => {
    const fragment = copyFragment(sourceWithLidar(), ['lid1'])!
    expect(fragment.templates).toEqual([lidar])
    const target = { ...sampleProject(), templates: [] }
    const { project } = pasteFragment(target, parseFragment(serializeFragment(fragment))!, { x: 40, y: 40 })
    expect(project.templates).toEqual([lidar])
    expect(project.devices.at(-1)!.templateId).toBe(lidar.id)
  })

  it('ne duplique pas une composante déjà présente', () => {
    const source = sourceWithLidar()
    const { project } = pasteFragment(source, copyFragment(source, ['lid1'])!, { x: 40, y: 40 })
    expect(project.templates).toEqual([lidar])
  })

  it('relit un fragment sans composantes (copié par une version précédente)', () => {
    const old = JSON.stringify({ avwanFragment: 1, devices: [], links: [] })
    expect(parseFragment(old)).toEqual({ devices: [], links: [], templates: [], dmxChannels: [] })
  })
})

function patched(): Project {
  let p = createProject(new Date(2026, 9, 14), 'fr')
  const add = (id: string, templateId: string, extra: Partial<Device>): void => {
    p = { ...p, devices: [...p.devices, { ...createDevice(p, templateId, { x: 0, y: 0 }, { lang: 'fr', id }), ...extra }] }
  }
  add('ode', 'dmx-node', { name: 'ODE-1', portState: { 'DMX-1': { universe: 1 } } })
  add('f1', 'dmx-fixture', { dmx: { footprint: 16, address: 1, mode: 'Standard' } })
  add('f9', 'dmx-fixture', { dmx: { footprint: 16, address: 40 } }) // sans univers
  p = { ...p, links: [{ id: 'l1', cableId: 'C-001', a: { deviceId: 'ode', portId: 'DMX-1' }, b: { deviceId: 'f1', portId: 'DMX-IN' }, medium: 'dmx' }] }
  return p
}
let n = 0
const freshIds = (): string => `c${++n}`

describe('patch et presse-papiers', () => {
  it('fige l’univers déduit dans la copie', () => {
    const frag = copyFragment(patched(), ['f1'])!
    expect(frag.devices[0]!.dmx).toEqual({ footprint: 16, address: 1, mode: 'Standard', universe: 1 })
  })

  it('dupliquer trois fois place les copies à la suite dans le même univers', () => {
    let p = patched()
    const frag = copyFragment(p, ['f1'])!
    const addresses: Array<number | undefined> = []
    for (let i = 1; i <= 3; i++) {
      const r = pasteFragment(p, frag, { x: 24 * i, y: 24 * i }, freshIds)
      p = r.project
      addresses.push(p.devices.find((d) => d.id === r.deviceIds[0])!.dmx?.address)
    }
    expect(addresses).toEqual([17, 33, 49])
  })

  it('colle huit copies d’un coup : 1, 17, 33, … sans toucher l’index du projet cible', () => {
    const target = createProject(new Date(2026, 9, 14), 'fr')
    const before = patchIndex(target)
    const fixtures = Array.from({ length: 8 }, (_, i): Device => ({
      ...createDevice(target, 'dmx-fixture', { x: 0, y: 0 }, { lang: 'fr', id: `f${i}` }),
      name: `FIX-${i + 1}`,
      dmx: { footprint: 16, universe: 1, address: 1 }
    }))
    const r = pasteFragment(target, { devices: fixtures, links: [] }, { x: 0, y: 0 }, freshIds)
    expect(r.project.devices.map((d) => d.dmx?.address)).toEqual([1, 17, 33, 49, 65, 81, 97, 113])
    expect(patchIndex(target)).toBe(before)
    expect(before.ranges).toEqual([])
  })

  it('colle dans un autre projet : garde l’univers et prend la 1re plage libre', () => {
    const frag = copyFragment(patched(), ['f1'])!
    const r = pasteFragment(createProject(undefined, 'fr'), frag, { x: 0, y: 0 }, freshIds)
    expect(r.project.devices[0]!.dmx).toEqual({ footprint: 16, address: 1, mode: 'Standard', universe: 1 })
  })

  it('copie un nœud et sa chaîne avec leurs câbles : les copies restent automatiques', () => {
    let p = patched()
    p = {
      ...p,
      devices: [...p.devices.filter((d) => d.id !== 'f1'), { ...p.devices.find((d) => d.id === 'f1')!, dmx: { footprint: 16 } }, { ...createDevice(p, 'dmx-fixture', { x: 0, y: 0 }, { lang: 'fr', id: 'f2' }), dmx: { footprint: 16 } }],
      links: [...p.links, { id: 'l2', cableId: 'C-002', a: { deviceId: 'f1', portId: 'DMX-OUT' }, b: { deviceId: 'f2', portId: 'DMX-IN' }, medium: 'dmx' }]
    }
    const frag = copyFragment(p, ['ode', 'f1', 'f2'])!
    expect(frag.devices.filter((d) => d.id !== 'ode').every((d) => d.dmx?.universe === undefined)).toBe(true)
    const r = pasteFragment(p, frag, { x: 40, y: 40 }, freshIds)
    const [node, a, b] = r.deviceIds.map((id) => r.project.devices.find((d) => d.id === id)!)
    expect(node!.name).not.toBe('ODE-1')
    const q = autoAddress(r.project)
    const get = (id: string) => q.devices.find((d) => d.id === id)!.dmx!
    expect(get(a!.id)).toEqual({ footprint: 16, address: 1 })
    expect(get(b!.id)).toEqual({ footprint: 16, address: 17 })
  })

  it('copie partielle (nœud + c sans b) : c n’a plus de câble vers sa source, il garde univers figé et prochaine adresse libre', () => {
    let p = patched()
    p = {
      ...p,
      devices: [...p.devices.filter((d) => d.id !== 'f1'), { ...p.devices.find((d) => d.id === 'f1')!, dmx: { footprint: 16 } }, { ...createDevice(p, 'dmx-fixture', { x: 0, y: 0 }, { lang: 'fr', id: 'f2' }), dmx: { footprint: 21 } }],
      links: [...p.links, { id: 'l2', cableId: 'C-002', a: { deviceId: 'f1', portId: 'DMX-OUT' }, b: { deviceId: 'f2', portId: 'DMX-IN' }, medium: 'dmx' }]
    }
    const r = pasteFragment(p, copyFragment(p, ['ode', 'f2'])!, { x: 40, y: 40 }, freshIds)
    const c = r.project.devices.find((d) => d.id === r.deviceIds[1])!
    expect(c.dmx?.universe).toBe(1)
    expect(c.dmx?.address).toBeDefined()
  })

  it('la copie d’un appareil fixé n’est plus fixée', () => {
    const p = patched()
    const f1 = p.devices.find((d) => d.id === 'f1')!
    const pinnedP = { ...p, devices: p.devices.map((d) => (d.id === 'f1' ? { ...f1, dmx: { ...f1.dmx!, addressPinned: true as const } } : d)) }
    const r = pasteFragment(pinnedP, copyFragment(pinnedP, ['f1'])!, { x: 24, y: 24 }, freshIds)
    expect(r.project.devices.find((d) => d.id === r.deviceIds[0])!.dmx?.addressPinned).toBeUndefined()
  })

  it('sans univers, la copie perd son adresse', () => {
    const p = patched()
    const r = pasteFragment(p, copyFragment(p, ['f9'])!, { x: 24, y: 24 }, freshIds)
    expect(r.project.devices.find((d) => d.id === r.deviceIds[0])!.dmx).toEqual({ footprint: 16 })
  })

  it('l’original garde son univers déduit (rien n’est écrit dans le projet source)', () => {
    const p = patched()
    copyFragment(p, ['f1'])
    expect(p.devices.find((d) => d.id === 'f1')!.dmx?.universe).toBeUndefined()
  })
})

describe('presse-papier : listes de canaux DMX', () => {
  const WASH = { templateId: 'dmx-fixture', model: 'Wash', mode: '9CH' }
  function withWash(params: string[]): Project {
    const p = createProject(new Date(2026, 9, 15), 'fr')
    const w = { ...createDevice(p, 'dmx-fixture', { x: 0, y: 0 }, { lang: 'fr', id: 'w' }), model: 'Wash', dmx: { footprint: 9, mode: '9CH' } }
    const cam = createDevice({ ...p, devices: [w] }, 'ptz-ndi', { x: 0, y: 0 }, { lang: 'fr', id: 'cam' })
    return { ...p, devices: [w, cam], dmxChannels: [{ ...WASH, params }, { templateId: 'autre', params: ['X'] }] }
  }

  it('la copie emporte seulement les listes des appareils copiés', () => {
    const f = copyFragment(withWash(['Red']), ['w'])!
    expect(f.dmxChannels).toEqual([{ ...WASH, params: ['Red'] }])
    expect(copyFragment(withWash(['Red']), ['cam'])!.dmxChannels).toBeUndefined()
    expect(parseFragment(serializeFragment(f))?.dmxChannels).toEqual([{ ...WASH, params: ['Red'] }])
  })

  it('le collage ajoute les listes absentes ; celles du projet cible gagnent', () => {
    const f = copyFragment(withWash(['Theirs']), ['w'])!
    const empty = createProject(new Date(2026, 9, 15), 'fr')
    expect(pasteFragment(empty, f, { x: 10, y: 10 }).project.dmxChannels).toEqual([{ ...WASH, params: ['Theirs'] }])
    const mine = { ...empty, dmxChannels: [{ ...WASH, params: ['Mine'] }] }
    expect(pasteFragment(mine, f, { x: 10, y: 10 }).project.dmxChannels).toEqual([{ ...WASH, params: ['Mine'] }])
  })
})

describe('pasteFragment et baie', () => {
  it("la copie d'un appareil placé n'a pas de placement", () => {
    const p = sampleProject()
    p.devices[1] = { ...p.devices[1]!, rack: { rackId: 'r1', u: 1, heightU: 1 } }
    const r = pasteFragment(p, copyFragment(p, ['cam1'])!, { x: 10, y: 10 }, ids())
    expect(r.project.devices.find((d) => d.id === r.deviceIds[0])!.rack).toBeUndefined()
    expect(r.project.devices.find((d) => d.id === 'cam1')!.rack).toBeDefined()
  })
})
