import { describe, expect, it } from 'vitest'
import type { Device, Link, Project } from './types'
import { createDevice, createProject } from './project'
import { autoAddress, autoAddressOnOpen, chainOf, daisyChains } from './daisyChain'
import { DmxPatchSchema } from './schema'

// Petit banc : des appareils créés depuis le catalogue, branchés en DMX.
function rig() {
  let p: Project = createProject(new Date(2026, 9, 14), 'fr')
  return {
    add(id: string, templateId: string, extra: Partial<Device> = {}): void {
      const d = createDevice(p, templateId, { x: 0, y: 0 }, { lang: 'fr', id })
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
const pinned = (address: number, footprint: number): Partial<Device> => ({ dmx: { footprint, address, addressPinned: true } })
const addr = (p: Project): Record<string, number | undefined> => Object.fromEntries(p.devices.filter((d) => d.dmx).map((d) => [d.id, d.dmx!.address]))

// ODE-1 DMX-1 (univers 1) → ids en chaîne, dans l'ordre donné.
function chain(ids: [string, Partial<Device>][], order: string[] = ids.map(([id]) => id)): Project {
  const r = rig()
  r.add('ode', 'dmx-node', node('ODE-1', 1))
  for (const [id, extra] of ids) r.add(id, 'dmx-fixture', extra)
  r.link(['ode', 'DMX-1'], [order[0]!, 'DMX-IN'])
  for (let i = 1; i < order.length; i++) r.link([order[i - 1]!, 'DMX-OUT'], [order[i]!, 'DMX-IN'])
  return r.p
}
const abc: [string, Partial<Device>][] = [['a', fix(undefined, 16)], ['b', fix(undefined, 16)], ['c', fix(undefined, 21)]]

describe('autoAddress', () => {
  it('adresse dans l’ordre du câble', () => {
    expect(addr(autoAddress(chain(abc)))).toEqual({ a: 1, b: 17, c: 33 })
  })

  it('suit un recâblage', () => {
    expect(addr(autoAddress(chain(abc, ['a', 'c', 'b'])))).toEqual({ a: 1, c: 17, b: 38 })
  })

  it('respecte une adresse fixée et repart après elle', () => {
    const p = chain([['a', fix(undefined, 16)], ['b', fix(undefined, 16)], ['c', pinned(101, 21)], ['d', fix(undefined, 16)]])
    expect(addr(autoAddress(p))).toEqual({ a: 1, b: 17, c: 101, d: 122 })
  })

  it('repart d’une adresse fixée plus basse', () => {
    const p = chain([['a', fix(undefined, 16)], ['b', fix(undefined, 16)], ['c', pinned(5, 21)], ['d', fix(undefined, 16)]])
    expect(addr(autoAddress(p)).d).toBe(26)
  })

  it('laisse sans adresse ce qui dépasserait 512', () => {
    const ids: [string, Partial<Device>][] = Array.from({ length: 33 }, (_, i) => [`f${i + 1}`, fix(undefined, 16)])
    const out = autoAddress(chain(ids))
    expect(out.devices.find((d) => d.id === 'f32')!.dmx!.address).toBe(497)
    expect(out.devices.find((d) => d.id === 'f33')!.dmx!.address).toBeUndefined()
  })

  it('deux prises d’un nœud : deux chaînes qui partent de 1', () => {
    const r = rig()
    r.add('ode', 'dmx-node', node('ODE-1', 1, 2))
    for (const id of ['a', 'b', 'c', 'd']) r.add(id, 'dmx-fixture', fix(undefined, 16))
    r.link(['ode', 'DMX-1'], ['a', 'DMX-IN'])
    r.link(['a', 'DMX-OUT'], ['b', 'DMX-IN'])
    r.link(['ode', 'DMX-2'], ['c', 'DMX-IN'])
    r.link(['c', 'DMX-OUT'], ['d', 'DMX-IN'])
    expect(addr(autoAddress(r.p))).toEqual({ a: 1, b: 17, c: 1, d: 17 })
    expect(daisyChains(r.p).map((c) => [c.source.portId, c.universe, c.deviceIds])).toEqual([
      ['DMX-1', 1, ['a', 'b']],
      ['DMX-2', 2, ['c', 'd']]
    ])
  })

  it('exclut un appareil à univers tapé mais garde son adresse', () => {
    const p = chain([['a', fix(undefined, 16)], ['b', fix(200, 16, 1)], ['c', fix(undefined, 16)]])
    expect(addr(autoAddress(p))).toEqual({ a: 1, b: 200, c: 17 })
  })

  it('ne touche à rien sans univers sur la prise', () => {
    const r = rig()
    r.add('ode', 'dmx-node', node('ODE-1'))
    r.add('a', 'dmx-fixture', fix(40))
    r.link(['ode', 'DMX-1'], ['a', 'DMX-IN'])
    expect(daisyChains(r.p)).toEqual([])
    expect(autoAddress(r.p)).toBe(r.p)
  })

  it('rend la même référence quand tout est à jour', () => {
    const p = chain(abc)
    const once = autoAddress(p)
    expect(once).not.toBe(p)
    expect(autoAddress(once)).toBe(once)
  })
})

describe('autoAddressOnOpen', () => {
  const flags = (p: Project): Record<string, boolean> => Object.fromEntries(p.devices.filter((d) => d.dmx).map((d) => [d.id, d.dmx!.addressPinned === true]))
  it('fige ce qui diffère du calcul, donne une adresse aux automatiques, et est idempotente', () => {
    const p = chain([['a', fix(1, 16)], ['b', fix(17, 16)], ['c', fix(50, 21)], ['d', fix(undefined, 16)]])
    const q = autoAddressOnOpen(p)
    expect(addr(q)).toEqual({ a: 1, b: 17, c: 50, d: 71 })
    expect(flags(q)).toEqual({ a: false, b: false, c: true, d: false })
    expect(autoAddressOnOpen(q)).toBe(q)
  })
})

describe('daisyChains', () => {
  it('se termine sur une boucle de câbles', () => {
    const r = rig()
    r.add('ode', 'dmx-node', node('ODE-1', 1))
    r.add('a', 'dmx-fixture', fix())
    r.add('b', 'dmx-fixture', fix())
    r.link(['ode', 'DMX-1'], ['a', 'DMX-IN'])
    r.link(['a', 'DMX-OUT'], ['b', 'DMX-IN'])
    r.link(['b', 'DMX-OUT'], ['a', 'DMX-IN'])
    expect(daisyChains(r.p)[0]!.deviceIds).toEqual(['a', 'b'])
    expect(addr(autoAddress(r.p))).toEqual({ a: 1, b: 17 })
  })

  it('est mémorisé par projet', () => {
    const p = chain(abc)
    expect(daisyChains(p)).toBe(daisyChains(p))
  })
})

describe('chainOf', () => {
  it('donne la chaîne d’un appareil et sa source', () => {
    const p = chain(abc)
    expect(chainOf(p, 'b')?.source).toEqual({ deviceId: 'ode', portId: 'DMX-1' })
    expect(chainOf(p, 'ode')).toBeUndefined()
  })
})

describe('DmxPatchSchema', () => {
  it('accepte addressPinned: true, refuse false', () => {
    expect(DmxPatchSchema.parse({ footprint: 16, address: 5, addressPinned: true }).addressPinned).toBe(true)
    expect(() => DmxPatchSchema.parse({ footprint: 16, address: 5, addressPinned: false })).toThrow()
  })
})
