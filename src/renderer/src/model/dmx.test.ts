import { describe, expect, it } from 'vitest'
import type { Device, Link, Project } from './types'
import { createDevice, createProject } from './project'
import { isUniverseOutput, issueTexts, nextFreeAddress, patchIndex, patchIssues, patchLine, resolveUniverse, sourceLabel } from './dmx'

// Petit banc : des appareils créés depuis le catalogue, branchés en DMX.
function rig() {
  let p: Project = createProject(new Date(2026, 9, 14))
  return {
    add(id: string, templateId: string, extra: Partial<Device> = {}): void {
      const d = createDevice(p, templateId, { x: 0, y: 0 }, { id })
      p = { ...p, devices: [...p.devices, { ...d, ...extra }] }
    },
    link(a: [string, string], b: [string, string], medium: Link['medium'] = 'dmx'): void {
      const n = p.links.length + 1
      p = { ...p, links: [...p.links, { id: `l${n}`, cableId: `C-${n}`, a: { deviceId: a[0], portId: a[1] }, b: { deviceId: b[0], portId: b[1] }, medium }] }
    },
    get p(): Project {
      return p
    }
  }
}
const node = (name: string, u1?: number, u2?: number): Partial<Device> => ({
  name,
  portState: { ...(u1 !== undefined ? { 'DMX-1': { universe: u1 } } : {}), ...(u2 !== undefined ? { 'DMX-2': { universe: u2 } } : {}) }
})
const fix = (address?: number, footprint = 16, universe?: number): Partial<Device> => ({
  dmx: { footprint, ...(address !== undefined ? { address } : {}), ...(universe !== undefined ? { universe } : {}) }
})

describe('resolveUniverse', () => {
  it('suit la chaîne DMX jusqu’à la sortie du nœud', () => {
    const r = rig()
    r.add('ode', 'dmx-node', node('ODE-1', 1, 2))
    r.add('f1', 'dmx-fixture', fix(1))
    r.add('f2', 'dmx-fixture', fix(17))
    r.link(['ode', 'DMX-2'], ['f1', 'DMX-IN'])
    r.link(['f1', 'DMX-OUT'], ['f2', 'DMX-IN'])
    const u = resolveUniverse(r.p, 'f2')
    expect(u?.universe).toBe(2)
    expect(u && sourceLabel(r.p, u.source)).toBe('ODE-1 › DMX 2')
  })

  it('préfère l’univers tapé', () => {
    const r = rig()
    r.add('ode', 'dmx-node', node('ODE-1', 1))
    r.add('f1', 'dmx-fixture', fix(1, 16, 7))
    r.link(['ode', 'DMX-1'], ['f1', 'DMX-IN'])
    expect(resolveUniverse(r.p, 'f1')).toEqual({ universe: 7, source: { kind: 'typed' } })
    expect(sourceLabel(r.p, { kind: 'typed' })).toBe('tapé')
  })

  it('garde l’univers 0 (Art-Net)', () => {
    const r = rig()
    r.add('ode', 'dmx-node', node('ODE-1', 0))
    r.add('f1', 'dmx-fixture', fix(1))
    r.link(['ode', 'DMX-1'], ['f1', 'DMX-IN'])
    expect(resolveUniverse(r.p, 'f1')?.universe).toBe(0)
  })

  it('ne trouve rien sans câble, ni sur une sortie sans univers', () => {
    const r = rig()
    r.add('ode', 'dmx-node', node('ODE-1'))
    r.add('f1', 'dmx-fixture', fix(1))
    r.add('f2', 'dmx-fixture', fix(1))
    r.link(['ode', 'DMX-1'], ['f1', 'DMX-IN'])
    expect(resolveUniverse(r.p, 'f1')).toBeUndefined()
    expect(resolveUniverse(r.p, 'f2')).toBeUndefined()
  })

  it('se termine sur une boucle de câbles', () => {
    const r = rig()
    r.add('f1', 'dmx-fixture', fix(1))
    r.add('f2', 'dmx-fixture', fix(17))
    r.link(['f1', 'DMX-OUT'], ['f2', 'DMX-IN'])
    r.link(['f2', 'DMX-OUT'], ['f1', 'DMX-IN'])
    expect(resolveUniverse(r.p, 'f1')).toBeUndefined()
  })

  it('prend la source la plus proche', () => {
    const r = rig()
    r.add('a', 'dmx-node', node('ODE-A', 1))
    r.add('b', 'dmx-node', node('ODE-B', 5))
    r.add('f1', 'dmx-fixture', fix(1))
    r.add('f2', 'dmx-fixture', fix(17))
    r.link(['a', 'DMX-1'], ['f1', 'DMX-IN'])
    r.link(['f1', 'DMX-OUT'], ['f2', 'DMX-IN'])
    r.link(['f2', 'DMX-OUT'], ['b', 'DMX-1'])
    expect(resolveUniverse(r.p, 'f1')?.universe).toBe(1)
    expect(resolveUniverse(r.p, 'f2')?.universe).toBe(5)
  })

  it('ne suit pas un câble réseau', () => {
    const r = rig()
    r.add('ode', 'dmx-node', node('ODE-1', 1))
    r.add('f1', 'generic', { dmx: { footprint: 1, address: 1 } })
    r.link(['ode', 'ETH'], ['f1', 'ETH'], 'cat6')
    expect(resolveUniverse(r.p, 'f1')).toBeUndefined()
  })
})

describe('isUniverseOutput', () => {
  it('sorties DMX d’un nœud et sorties pixel d’un contrôleur, pas l’entrée d’un appareil ni d’une bande', () => {
    const r = rig()
    r.add('ode', 'dmx-node')
    r.add('f1', 'dmx-fixture')
    r.add('pix', 'pixel-controller')
    r.add('led', 'led-strip')
    const d = (id: string): Device => r.p.devices.find((x) => x.id === id)!
    const port = (id: string, portId: string) => d(id).ports.find((x) => x.id === portId)!
    expect(isUniverseOutput(r.p, d('ode'), port('ode', 'DMX-1'))).toBe(true)
    expect(isUniverseOutput(r.p, d('ode'), port('ode', 'ETH'))).toBe(false)
    expect(isUniverseOutput(r.p, d('f1'), port('f1', 'DMX-IN'))).toBe(false)
    expect(isUniverseOutput(r.p, d('pix'), port('pix', 'OUT1'))).toBe(true)
    expect(isUniverseOutput(r.p, d('led'), port('led', 'IN'))).toBe(false)
  })
})

describe('chevauchements, dépassement, adresse suivante libre', () => {
  function universe1() {
    const r = rig()
    r.add('f1', 'dmx-fixture', fix(1, 16, 1))
    r.add('f2', 'dmx-fixture', fix(10, 16, 1))
    r.add('f3', 'dmx-fixture', fix(505, 16, 1))
    r.add('f4', 'dmx-fixture', fix(1, 16, 2))
    return r
  }

  it('repère les plages qui se touchent dans le même univers seulement', () => {
    const index = patchIndex(universe1().p)
    expect(issueTexts(patchIssues(index, 'f1'))).toEqual(['Chevauche FIX-2 (10–25)'])
    expect(issueTexts(patchIssues(index, 'f4'))).toEqual([])
  })

  it('repère une plage qui dépasse 512', () => {
    expect(issueTexts(patchIssues(patchIndex(universe1().p), 'f3'))).toEqual(['Dépasse 512'])
  })

  it('trouve la première plage libre assez grande', () => {
    const r = rig()
    r.add('f1', 'dmx-fixture', fix(1, 16, 1))
    r.add('f2', 'dmx-fixture', fix(33, 16, 1))
    const index = patchIndex(r.p)
    expect(nextFreeAddress(index, 1, 16)).toBe(17)
    expect(nextFreeAddress(index, 1, 17)).toBe(49)
    expect(nextFreeAddress(index, 1, 16, 'f1')).toBe(1)
    expect(nextFreeAddress(index, 9, 16)).toBe(1)
    expect(nextFreeAddress(index, 0, 16)).toBe(1)
  })

  it('rend undefined quand l’univers est plein', () => {
    const r = rig()
    r.add('f1', 'dmx-fixture', fix(1, 496, 1))
    const index = patchIndex(r.p)
    expect(nextFreeAddress(index, 1, 16)).toBe(497)
    expect(nextFreeAddress(index, 1, 17)).toBeUndefined()
  })

  it('compte l’univers 0 comme les autres', () => {
    const r = rig()
    r.add('f1', 'dmx-fixture', fix(1, 16, 0))
    r.add('f2', 'dmx-fixture', fix(8, 16, 0))
    const index = patchIndex(r.p)
    expect(nextFreeAddress(index, 0, 16)).toBe(24)
    expect(issueTexts(patchIssues(index, 'f2'))).toEqual(['Chevauche FIX-1 (1–16)'])
  })
})

describe('patchLine', () => {
  it('U2 · 33, Adr. 33 sans univers, rien sans adresse', () => {
    const r = rig()
    r.add('f1', 'dmx-fixture', fix(33, 16, 2))
    r.add('f2', 'dmx-fixture', fix(33))
    r.add('f3', 'dmx-fixture', fix(undefined, 16, 0))
    r.add('f4', 'dmx-fixture', fix(1, 16, 0))
    const index = patchIndex(r.p)
    expect(patchLine(index.entries.get('f1'))).toBe('U2 · 33')
    expect(patchLine(index.entries.get('f2'))).toBe('Adr. 33')
    expect(patchLine(index.entries.get('f3'))).toBe('')
    expect(patchLine(index.entries.get('f4'))).toBe('U0 · 1')
  })
})

describe('bandes pixel', () => {
  function pixels() {
    const r = rig()
    r.add('pix', 'pixel-controller', { name: 'PIX-1', portState: { OUT1: { universe: 10 } } })
    r.add('led', 'led-strip', { name: 'LED-1', ledStrip: { type: 'sk6812-rgbw', volts: 24, wPerM: 14.4, lengthM: 5, pxPerM: 60 } })
    r.add('f1', 'dmx-fixture', fix(500, 16, 11))
    r.link(['pix', 'OUT1'], ['led', 'IN'], 'pixel')
    return r
  }

  it('occupe les univers 10 à 12, sans couper un pixel', () => {
    const index = patchIndex(pixels().p)
    expect(index.strips.get('led')?.spans).toEqual([
      { universe: 10, pixels: 128, channels: 512 },
      { universe: 11, pixels: 128, channels: 512 },
      { universe: 12, pixels: 44, channels: 176 }
    ])
    expect(sourceLabel(pixels().p, { kind: 'port', ref: index.strips.get('led')!.source })).toBe('PIX-1 › OUT1')
  })

  it('un appareil patché dans un univers de la bande la chevauche', () => {
    const index = patchIndex(pixels().p)
    expect(issueTexts(patchIssues(index, 'f1'))).toEqual(['Chevauche LED-1 (1–512)', 'Dépasse 512'])
    expect(nextFreeAddress(index, 12, 16)).toBe(177)
  })

  it('rien sans univers de départ sur la sortie', () => {
    const r = pixels()
    const q = { ...r.p, devices: r.p.devices.map((d) => (d.id === 'pix' ? { ...d, portState: {} } : d)) }
    expect(patchIndex(q).strips.size).toBe(0)
  })
})
