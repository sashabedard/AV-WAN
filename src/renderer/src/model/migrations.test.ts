import { afterEach, describe, expect, it } from 'vitest'
import { messages } from '../../../shared/i18n/messages'
import { LED_STRIP_TYPES } from './led'
import { CURRENT_SCHEMA_VERSION, MIGRATIONS, migrate } from './migrations'

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
      schemaVersion: 3,
      devices: [
        { id: 'f', templateId: 'dmx-fixture', dmx: { footprint: 1 } },
        { id: 'g', templateId: 'generic' },
        { id: 'h', templateId: 'dmx-fixture', dmx: { footprint: 16 } }
      ]
    })
  })

  it('un document sans liste d’appareils passe quand même', () => {
    expect(migrate({ schemaVersion: 1 }, messages('fr'))).toEqual({ schemaVersion: 3 })
  })

  it('1 → 2 : une ancienne bande reçoit sa prise DC et le type WS2812B, sans longueur', () => {
    const doc = { schemaVersion: 1, devices: [{ id: 'led', templateId: 'led-strip', ports: [{ id: 'IN', label: 'IN', connector: 'pixel' }] }] }
    expect(migrate(doc, messages('fr'))).toEqual({
      schemaVersion: 3,
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
    expect(migrate({ schemaVersion: 2, devices: [] }, messages('fr'))).toEqual({ schemaVersion: 3, devices: [] })
  })
})
