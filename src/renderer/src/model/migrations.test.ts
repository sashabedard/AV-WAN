import { afterEach, describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION, MIGRATIONS, migrate } from './migrations'

afterEach(() => {
  delete MIGRATIONS[0]
})

describe('migrate', () => {
  it("applique les migrations jusqu'à la version courante", () => {
    MIGRATIONS[0] = (d) => ({ ...d, schemaVersion: 1, migre: true })
    expect(migrate({ schemaVersion: 0 })).toEqual({ schemaVersion: CURRENT_SCHEMA_VERSION, migre: true })
  })

  it('échoue clairement si une migration manque', () => {
    expect(() => migrate({ schemaVersion: 0 })).toThrow('Aucune migration depuis la version 0')
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
    expect(migrate(doc)).toEqual({
      schemaVersion: 2,
      devices: [
        { id: 'f', templateId: 'dmx-fixture', dmx: { footprint: 1 } },
        { id: 'g', templateId: 'generic' },
        { id: 'h', templateId: 'dmx-fixture', dmx: { footprint: 16 } }
      ]
    })
  })

  it('un document sans liste d’appareils passe quand même', () => {
    expect(migrate({ schemaVersion: 1 })).toEqual({ schemaVersion: 2 })
  })
})
