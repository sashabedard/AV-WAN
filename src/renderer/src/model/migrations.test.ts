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
