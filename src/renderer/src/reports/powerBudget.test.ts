// src/renderer/src/reports/powerBudget.test.ts
import { describe, expect, it } from 'vitest'
import { createDevice, createProject } from '../model/project'
import { powerShowProject as show } from './__fixtures__/powerShow'
import { powerBudget, powerTable } from './powerBudget'
import type { Device, Link, PortDef, Project } from '../model/types'

const dc = (id: string): PortDef => ({ id, label: id.replace(/-/g, ' '), connector: 'dc' })
const dcLink = (id: string, a: [string, string], b: [string, string]): Link => ({ id, cableId: id, a: { deviceId: a[0], portId: a[1] }, b: { deviceId: b[0], portId: b[1] }, medium: 'dc' })
const raw = (id: string, name: string, extra: Partial<Device>): Device => ({ id, templateId: 'generic', name, position: { x: 0, y: 0 }, portSide: 'auto', ports: [], portState: {}, ...extra })

// Une alimentation 24 V sans capacité (le gabarit `psu` tel quel) qui nourrit trois bandes de 96 W.
function unratedPsu(): Project {
  const strip = { type: 'cob' as const, volts: 24, wPerM: 9.6, lengthM: 10 }
  const leds = [1, 2, 3].map((n) => raw(`led${n}`, `LED-${n}`, { templateId: 'led-strip', ports: [dc('DC-IN')], ledStrip: strip }))
  return {
    ...createProject(new Date(2026, 9, 14)),
    devices: [raw('psu', 'PSU-1', { ports: [1, 2, 3].map((n) => dc(`DC-OUT-${n}`)), psu: { volts: 24 } }), ...leds],
    links: [1, 2, 3].map((n) => dcLink(`l${n}`, ['psu', `DC-OUT-${n}`], [`led${n}`, 'DC-IN']))
  }
}

describe('powerBudget', () => {
  it('compte chaque watt une fois : alimentation nominale, bandes via l’alim, caméra via son switch', () => {
    const b = powerBudget(show())
    expect(b.zones.map((z) => [z.zone, z.subtotalW])).toEqual([
      ['Scène', 830],
      ['Salle', 0]
    ])
    expect(b.totalW).toBe(830)
    expect(b.amps).toBe(6.9)
    expect(b.voltage).toBe(120)
    expect(b.missing).toEqual(['SW-1'])
  })

  it('décrit les lignes d’une zone, triées par nom', () => {
    const scene = powerBudget(show()).zones[0]!
    expect(scene.rows).toEqual([
      { device: 'LED-1', type: 'Bande LED COB mono', watts: 144, fedBy: 'PSU-1', remark: '' },
      { device: 'LED-2', type: 'Bande LED COB mono', watts: 144, fedBy: 'PSU-1', remark: '' },
      { device: 'MH-1', type: 'Lyre spot', watts: 470, fedBy: '', mainsW: 470, remark: '' },
      { device: 'PSU-1', type: 'Appareil générique', watts: 360, fedBy: '', mainsW: 360, remark: 'charge 288 W / 360 W (80 %)' }
    ])
    const salle = powerBudget(show()).zones[1]!
    expect(salle.rows).toEqual([{ device: 'CAM-1', type: 'Caméra IP', watts: 7, fedBy: 'SW-1', remark: 'via PoE · SW-1' }])
  })

  it('résume les alimentations', () => {
    expect(powerBudget(show()).psus).toEqual([{ name: 'PSU-1', volts: 24, capacityW: 360, loadW: 288, ratio: 0.8, fed: ['LED-1', 'LED-2'], remark: '' }])
  })

  it('230 V : moins d’ampères', () => {
    const p = show()
    expect(powerBudget({ ...p, settings: { ...p.settings, mainsVoltage: 230 } }).amps).toBe(3.6)
  })

  it('alimentation sans capacité : une ligne qui compte sa charge connue, pas « sans puissance »', () => {
    const b = powerBudget(unratedPsu())
    expect(b.totalW).toBe(288)
    expect(b.zones[0]!.rows.find((r) => r.device === 'PSU-1')).toEqual({ device: 'PSU-1', type: 'Appareil générique', fedBy: '', mainsW: 288, remark: 'charge 288 W, capacité inconnue' })
    expect(b.missing).not.toContain('PSU-1')
    expect(powerTable(unratedPsu()).rows.some((r) => r[1] === 'Sans puissance renseignée')).toBe(false)
  })

  it('bandes alimentées par le contrôleur de pixels : comptées via son alimentation, une seule fois', () => {
    const px = (id: string): PortDef => ({ id, label: id, connector: 'pixel' })
    const strip = { type: 'sk6812-rgbw' as const, volts: 24, wPerM: 18, lengthM: 10, pxPerM: 60 }
    const p: Project = {
      ...createProject(new Date(2026, 9, 14)),
      devices: [
        raw('psu', 'PSU-1', { ports: [dc('DC-OUT-1')], psu: { volts: 24, watts: 300 } }),
        raw('pix', 'PIX-1', { ports: [dc('DC-IN'), px('OUT1'), px('OUT2')] }),
        raw('led1', 'LED-1', { templateId: 'led-strip', ports: [px('IN'), dc('DC-IN')], ledStrip: strip }),
        raw('led2', 'LED-2', { templateId: 'led-strip', ports: [px('IN'), dc('DC-IN')], ledStrip: strip })
      ],
      links: [
        dcLink('d1', ['psu', 'DC-OUT-1'], ['pix', 'DC-IN']),
        { ...dcLink('p1', ['pix', 'OUT1'], ['led1', 'IN']), medium: 'pixel' },
        { ...dcLink('p2', ['pix', 'OUT2'], ['led2', 'IN']), medium: 'pixel' }
      ]
    }
    const b = powerBudget(p)
    expect(b.totalW).toBe(300)
    const rows = b.zones[0]!.rows
    expect(rows.filter((r) => r.device.startsWith('LED')).map((r) => [r.device, r.fedBy, r.mainsW])).toEqual([
      ['LED-1', 'PSU-1', undefined],
      ['LED-2', 'PSU-1', undefined]
    ])
    expect(rows.find((r) => r.device === 'PSU-1')?.remark).toBe('charge 360 W / 300 W (120 %) · Surcharge')
    expect(b.psus[0]).toMatchObject({ name: 'PSU-1', loadW: 360, ratio: 1.2, fed: ['PIX-1', 'LED-1', 'LED-2'], remark: 'Surcharge' })
  })

  it('regroupe par zone (son id), pas par nom : zones homonymes et zone nommée « Hors zone » restent séparées', () => {
    const p = show()
    const zone = (id: string, name: string) => ({ id, name, color: '#888888', rect: { x: 40, y: 0, w: 10, h: 10 }, ownPdfPage: false })
    const q: Project = {
      ...p,
      zones: [...p.zones, zone('z3', 'Scène'), zone('z4', 'Hors zone')],
      devices: [...p.devices.map((d) => (d.id === 'mh' ? { ...d, zoneId: 'z3' } : d.id === 'cam' ? { ...d, zoneId: 'z4' } : d)), raw('x', 'X-1', { powerW: 50 })]
    }
    expect(powerBudget(q).zones.map((z) => [z.zone, z.zoneId, z.subtotalW])).toEqual([
      ['Scène', 'z1', 360],
      ['Scène', 'z3', 470],
      ['Hors zone', 'z4', 0],
      ['Hors zone', undefined, 50]
    ])
    expect(powerBudget(q).totalW).toBe(880)
  })

  it('type d’une bande : son type de bande, sauf modèle tapé', () => {
    const p = show()
    const q = { ...p, devices: p.devices.map((d) => (d.id === 'led2' ? { ...d, model: 'Ruban de scène' } : d)) }
    expect(powerBudget(q).zones[0]!.rows.slice(0, 2).map((r) => r.type)).toEqual(['Bande LED COB mono', 'Ruban de scène'])
  })

  it('un panneau de brassage n’est pas un appareil « sans puissance »', () => {
    const p = show()
    const panel = { ...createDevice(p, 'patch-panel-24', { x: 0, y: 0 }, { id: 'pp' }), name: 'PP-1' }
    const b = powerBudget({ ...p, devices: [...p.devices, panel] })
    expect(b.missing).toEqual(['SW-1'])
    expect(b.zones.flatMap((z) => z.rows).some((r) => r.device === 'PP-1')).toBe(false)
  })

  it('capacité qui s’arrondit à 0 : comptée comme inconnue, jamais Infinity ni NaN', () => {
    const p = unratedPsu()
    const b = powerBudget({ ...p, devices: p.devices.map((d) => (d.id === 'psu' ? { ...d, psu: { volts: 5, amps: 0.005 } } : d)) })
    expect(b.totalW).toBe(288)
    expect(b.psus[0]).toEqual({ name: 'PSU-1', volts: 5, loadW: 288, fed: ['LED-1', 'LED-2', 'LED-3'], remark: 'capacité inconnue' })
    expect(b.zones[0]!.rows.find((r) => r.device === 'PSU-1')?.remark).toBe('charge 288 W, capacité inconnue')
  })

  it('projet vide : zéro partout, jamais NaN', () => {
    const b = powerBudget(createProject())
    expect([b.totalW, b.amps, b.zones.length, b.psus.length, b.missing.length]).toEqual([0, 0, 0, 0, 0])
  })
})

describe('powerTable', () => {
  it('à plat, sous-totaux et total en nombres sommables', () => {
    const t = powerTable(show())
    expect([t.id, t.title]).toEqual(['bilan-puissance', 'Bilan de puissance'])
    expect(t.columns.map((c) => c.label)).toEqual(['Zone', 'Appareil', 'Type', 'Puissance (W)', 'Alimenté par', 'Compté au secteur (W)', 'Remarque'])
    expect(t.rows).toContainEqual(['Scène', 'Sous-total', '', null, '', 830, ''])
    expect(t.rows).toContainEqual(['', 'Total', '', null, '', 830, '6,9 A à 120 V'])
    expect(t.rows.at(-1)).toEqual(['', 'Sans puissance renseignée', '', null, '', null, 'SW-1'])
    for (const r of t.rows) expect(r).toHaveLength(t.columns.length)
  })
})
