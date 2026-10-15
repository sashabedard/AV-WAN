import { describe, expect, it } from 'vitest'
import type { Category, DeviceTemplate } from '../../model/types'
import { DeviceTemplateSchema } from '../../model/schema'
import { SENSOR_MODELS } from './capteurs'

// Une ligne par famille ; les tâches suivantes ajoutent la leur.
const FAMILIES: ReadonlyArray<[string, Category, readonly DeviceTemplate[]]> = [['capteurs', 'capteur', SENSOR_MODELS]]

describe.each(FAMILIES)('modèles %s', (_name, category, models) => {
  it('sont valides, de leur catégorie, avec marque, modèle et code', () => {
    expect(models.length).toBeGreaterThan(0)
    for (const t of models) {
      expect(DeviceTemplateSchema.safeParse(t).success, t.id).toBe(true)
      expect(t.category, t.id).toBe(category)
      expect(t.vendor?.trim(), t.id).toBeTruthy()
      expect(t.model?.trim(), t.id).toBeTruthy()
      expect(t.code, t.id).toMatch(/^[A-Z0-9]{1,4}$/)
      expect(t.id, t.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('ont des prises aux identifiants uniques', () => {
    for (const t of models) expect(new Set(t.ports.map((p) => p.id)).size, t.id).toBe(t.ports.length)
  })

  it('ont une puissance positive quand elle est connue', () => {
    for (const t of models) if (t.powerW !== undefined) expect(t.powerW, t.id).toBeGreaterThan(0)
    for (const t of models) for (const p of t.ports) if (p.poeDrawW !== undefined) expect(p.poeIn, `${t.id} ${p.id}`).toBeDefined()
  })

  it('patchables : des modes, et les canaux du premier', () => {
    for (const t of models) {
      if (!t.dmx) continue
      expect(t.dmx.modes?.length, t.id).toBeGreaterThan(0)
      expect(t.dmx.footprint, t.id).toBe(t.dmx.modes![0]!.channels)
    }
  })
})
