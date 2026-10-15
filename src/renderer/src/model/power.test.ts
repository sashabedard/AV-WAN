// src/renderer/src/model/power.test.ts
import { describe, expect, it } from 'vitest'
import type { Device, Link, PortDef, Project } from './types'
import { createDevice, createProject } from './project'
import { devicePowerW, feedingPsu, loadLevel, mainsVoltage, poeFeeder, psuLoad, resolvePsu } from './power'

const dc = (id: string): PortDef => ({ id, label: id.replace(/-/g, ' '), connector: 'dc' })
const dev = (id: string, name: string, extra: Partial<Device>): Device => ({ id, templateId: 'generic', name, position: { x: 0, y: 0 }, portSide: 'auto', ports: [], portState: {}, ...extra })
const link = (id: string, a: [string, string], b: [string, string], medium: Link['medium'] = 'dc'): Link => ({ id, cableId: id, a: { deviceId: a[0], portId: a[1] }, b: { deviceId: b[0], portId: b[1] }, medium })

// Une alim 24 V 15 A (360 W) qui nourrit deux bandes de 144 W et un LiDAR sans puissance.
function bench(): Project {
  const strip = { type: 'cob' as const, volts: 24, wPerM: 14.4, lengthM: 10 }
  return {
    ...createProject(new Date(2026, 9, 14)),
    devices: [
      dev('psu', 'PSU-1', { ports: [dc('DC-OUT-1'), dc('DC-OUT-2'), dc('DC-OUT-3'), dc('DC-OUT-4')], psu: { volts: 24, amps: 15 } }),
      dev('led1', 'LED-1', { ports: [dc('DC-IN')], ledStrip: strip }),
      dev('led2', 'LED-2', { ports: [dc('DC-IN')], ledStrip: strip }),
      dev('ldr', 'LDR-1', { ports: [dc('DC-IN')] })
    ],
    links: [
      link('l1', ['psu', 'DC-OUT-1'], ['led1', 'DC-IN']),
      link('l2', ['led2', 'DC-IN'], ['psu', 'DC-OUT-2']),
      link('l3', ['psu', 'DC-OUT-3'], ['ldr', 'DC-IN']),
      link('l4', ['psu', 'DC-OUT-4'], ['fantome', 'DC-IN'])
    ]
  }
}

describe('resolvePsu', () => {
  it('calcule la valeur manquante (P = V × I)', () => {
    expect(resolvePsu({ volts: 24, amps: 15 })).toEqual({ volts: 24, amps: 15, watts: 360, computed: 'watts' })
    expect(resolvePsu({ volts: 24, watts: 350 })).toEqual({ volts: 24, amps: 14.6, watts: 350, computed: 'amps' })
    expect(resolvePsu({ amps: 15, watts: 360 })).toEqual({ volts: 24, amps: 15, watts: 360, computed: 'volts' })
  })

  it('signale V × I ≠ P au-delà de 1 %', () => {
    expect(resolvePsu({ volts: 24, amps: 15, watts: 350 })).toEqual({ volts: 24, amps: 15, watts: 350, product: 360 })
    expect(resolvePsu({ volts: 24, amps: 14.6, watts: 350 }).product).toBeUndefined()
  })

  it('une seule valeur, ou rien : rien à calculer', () => {
    expect(resolvePsu({ volts: 24 })).toEqual({ volts: 24 })
    expect(resolvePsu(undefined)).toEqual({})
  })
})

describe('devicePowerW', () => {
  it('bande : calculée ; alimentation : nominale ; sinon le champ', () => {
    const p = bench()
    expect(devicePowerW(p.devices[1]!)).toBe(144)
    expect(devicePowerW(p.devices[0]!)).toBe(360)
    expect(devicePowerW(dev('mh', 'MH-1', { powerW: 470 }))).toBe(470)
    expect(devicePowerW(p.devices[3]!)).toBeUndefined()
    expect(devicePowerW(dev('l', 'LED-9', { ledStrip: { type: 'cob', volts: 24, wPerM: 10 } }))).toBeUndefined()
  })
})

describe('psuLoad', () => {
  it('somme les appareils branchés sur ses sorties DC, ignore un câble vers un appareil disparu', () => {
    const load = psuLoad(bench(), 'psu')
    expect(load.capacityW).toBe(360)
    expect(load.loadW).toBe(288)
    expect(load.ratio).toBe(0.8)
    expect(load.fed.map((d) => d.name)).toEqual(['LED-1', 'LED-2', 'LDR-1'])
    expect(load.missing.map((d) => d.name)).toEqual(['LDR-1'])
  })

  it('capacité inconnue : pas de ratio', () => {
    const p = bench()
    const q = { ...p, devices: p.devices.map((d) => (d.id === 'psu' ? { ...d, psu: { volts: 24 } } : d)) }
    const load = psuLoad(q, 'psu')
    expect(load.capacityW).toBeUndefined()
    expect(load.ratio).toBeUndefined()
    expect(load.loadW).toBe(288)
  })
})

describe('loadLevel', () => {
  it('80 % pile reste dans la marge', () => {
    expect(loadLevel(0.8)).toBe('ok')
    expect(loadLevel(0.81)).toBe('margin')
    expect(loadLevel(1)).toBe('margin')
    expect(loadLevel(1.01)).toBe('over')
  })
})

describe('feedingPsu et poeFeeder', () => {
  it('trouve l’alimentation d’une bande, et le switch d’un appareil PoE', () => {
    expect(feedingPsu(bench(), 'led2')?.name).toBe('PSU-1')
    expect(feedingPsu(bench(), 'psu')).toBeUndefined()
    let p = createProject()
    const sw = createDevice(p, 'switch', { x: 0, y: 0 }, { id: 'sw' })
    p = { ...p, devices: [sw] }
    const cam = createDevice(p, 'ip-camera', { x: 0, y: 0 }, { id: 'cam' })
    p = { ...p, devices: [sw, cam], links: [link('e1', ['sw', '1'], ['cam', 'ETH'], 'cat6')] }
    expect(poeFeeder(p, 'cam')?.id).toBe('sw')
    expect(poeFeeder(p, 'sw')).toBeUndefined()
  })
})

describe('mainsVoltage', () => {
  it('120 V par défaut', () => {
    const p = createProject()
    expect(mainsVoltage(p)).toBe(120)
    expect(mainsVoltage({ ...p, settings: { ...p.settings, mainsVoltage: 230 } })).toBe(230)
  })
})
