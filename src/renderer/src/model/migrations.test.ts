import { afterEach, describe, expect, it } from 'vitest'
import { messages } from '../../../shared/i18n/messages'
import { LED_STRIP_TYPES } from './led'
import { CURRENT_SCHEMA_VERSION, MIGRATIONS, migrate, migrateDeviceV4 } from './migrations'
import { ProjectSchema } from './schema'
import { sampleProject } from './__fixtures__/sample'

afterEach(() => {
  delete MIGRATIONS[0]
})

describe('migrate', () => {
  it("applique les migrations jusqu'à la version courante", () => {
    MIGRATIONS[0] = (d) => ({ ...d, schemaVersion: 1, migre: true })
    expect(migrate({ schemaVersion: 0 }, messages('fr'))).toEqual({ schemaVersion: CURRENT_SCHEMA_VERSION, migre: true })
  })

  it('échoue clairement si une migration manque', () => {
    expect(() => migrate({ schemaVersion: 0 }, messages('fr'))).toThrow('Aucune migration depuis la version 0')
  })
})

describe('migration 1 → 2', () => {
  it('l’« Appareil DMX » devient patchable (1 canal), le reste ne change pas', () => {
    const doc = {
      schemaVersion: 1,
      devices: [
        { id: 'f', templateId: 'dmx-fixture' },
        { id: 'g', templateId: 'generic' },
        { id: 'h', templateId: 'dmx-fixture', dmx: { footprint: 16 } }
      ]
    }
    expect(migrate(doc, messages('fr'))).toEqual({
      schemaVersion: 4,
      devices: [
        { id: 'f', templateId: 'dmx-fixture', dmx: { footprint: 1 } },
        { id: 'g', templateId: 'generic' },
        { id: 'h', templateId: 'dmx-fixture', dmx: { footprint: 16 } }
      ]
    })
  })

  it('un document sans liste d’appareils passe quand même', () => {
    expect(migrate({ schemaVersion: 1 }, messages('fr'))).toEqual({ schemaVersion: 4 })
  })

  it('1 → 2 : une ancienne bande reçoit sa prise DC et le type WS2812B, sans longueur', () => {
    const doc = { schemaVersion: 1, devices: [{ id: 'led', templateId: 'led-strip', ports: [{ id: 'IN', label: 'IN', connector: 'pixel' }] }] }
    expect(migrate(doc, messages('fr'))).toEqual({
      schemaVersion: 4,
      devices: [
        {
          id: 'led',
          templateId: 'led-strip',
          ports: [{ id: 'IN', label: 'IN', connector: 'pixel' }, { id: 'DC-IN', label: 'DC IN', connector: 'dc' }],
          ledStrip: { type: 'ws2812b', volts: 5, wPerM: LED_STRIP_TYPES.ws2812b.wPerM, pxPerM: 60 }
        }
      ]
    })
  })
})

describe('migration 2 → 3', () => {
  it('2 → 3 : seul le numéro de version change', () => {
    expect(migrate({ schemaVersion: 2, devices: [] }, messages('fr'))).toEqual({ schemaVersion: 4, devices: [] })
  })
})

describe('migration 3 → 4', () => {
  const ip = (address: string) => ({ address, mode: 'static' as const })

  it('migrateDeviceV4 déplace portState.ip vers ips', () => {
    const d = migrateDeviceV4({ ports: [{ id: 'eth0', label: 'eth0', connector: 'rj45' }], portState: { eth0: { ip: ip('10.0.0.5') } } }) as Record<string, any>
    expect(d['portState'].eth0).toEqual({ ips: [ip('10.0.0.5')] })
  })

  it("l'IP de l'appareil passe en tête du premier port réseau", () => {
    const d = migrateDeviceV4({
      ports: [{ id: 'USB-1', label: 'USB 1', connector: 'usb' }, { id: 'LAN', label: 'LAN', connector: 'rj45' }],
      portState: { LAN: { ip: ip('10.40.0.22') } },
      ip: ip('10.40.0.21')
    }) as Record<string, any>
    expect(d['portState'].LAN.ips).toEqual([ip('10.40.0.21'), ip('10.40.0.22')])
    expect('ip' in d).toBe(false)
  })

  it('sans port réseau, un port NET est créé', () => {
    const d = migrateDeviceV4({ ports: [{ id: 'DMX-IN', label: 'DMX IN', connector: 'dmx' }], portState: {}, ip: ip('10.50.0.30') }) as Record<string, any>
    expect(d['ports'].at(-1)).toEqual({ id: 'NET', label: 'NET', connector: 'rj45' })
    expect(d['portState'].NET.ips).toEqual([ip('10.50.0.30')])
    expect('ip' in d).toBe(false)
  })

  it('une IP vide (clic DHCP/Statique en 1.4) ne crée pas de port NET', () => {
    for (const mode of ['dhcp', 'static'] as const) {
      const d = migrateDeviceV4({ ports: [{ id: 'DMX-IN', label: 'DMX IN', connector: 'dmx' }], portState: {}, ip: { address: '', mode } }) as Record<string, any>
      expect(d['ports']).toEqual([{ id: 'DMX-IN', label: 'DMX IN', connector: 'dmx' }])
      expect(d['portState']).toEqual({})
      expect('ip' in d).toBe(false)
    }
  })

  it('une IP vide garde son mode sur le port réseau existant (aucune perte)', () => {
    const d = migrateDeviceV4({ ports: [{ id: 'ETH', label: 'ETH', connector: 'rj45' }], portState: {}, ip: { address: '', mode: 'dhcp' } }) as Record<string, any>
    expect(d['portState'].ETH.ips).toEqual([{ address: '', mode: 'dhcp' }])
  })

  it('un port « NET » déjà pris : le port créé prend un id libre', () => {
    const d = migrateDeviceV4({
      ports: [{ id: 'NET', label: 'NET', connector: 'dmx' }, { id: 'NET-2', label: 'x', connector: 'usb' }],
      portState: {},
      ip: ip('10.0.0.7')
    }) as Record<string, any>
    expect(d['ports'].map((p: { id: string }) => p.id)).toEqual(['NET', 'NET-2', 'NET-3'])
    expect(d['portState']['NET-3'].ips).toEqual([ip('10.0.0.7')])
    expect(d['portState']['NET']).toBeUndefined()
  })

  it('un document v3 complet passe en v4', () => {
    const v4 = sampleProject()
    const v3 = {
      ...v4,
      schemaVersion: 3,
      devices: v4.devices.map((d) => (d.id === 'cam1' ? { ...d, portState: {}, ip: ip('10.40.0.21') } : d))
    }
    const out = migrate(v3, messages('fr'))
    expect(out.schemaVersion).toBe(4)
    expect(ProjectSchema.parse(out)).toEqual(v4)
  })
})
