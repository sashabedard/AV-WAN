import { describe, expect, it } from 'vitest'
import type { Category, DeviceTemplate } from '../../model/types'
import { DeviceTemplateSchema } from '../../model/schema'
import { SENSOR_MODELS } from './capteurs'
import { LIGHTING_MODELS } from './eclairage'
import { VIDEO_MODELS } from './video'
import { AUDIO_MODELS } from './audio'
import { createDevice, createProject } from '../../model/project'
import { isUniverseOutput } from '../../model/dmx'

// Une ligne par famille ; les tâches suivantes ajoutent la leur.
const FAMILIES: ReadonlyArray<[string, Category, readonly DeviceTemplate[]]> = [
  ['capteurs', 'capteur', SENSOR_MODELS],
  ['éclairage', 'eclairage', LIGHTING_MODELS],
  ['vidéo', 'video', VIDEO_MODELS],
  ['audio', 'audio', AUDIO_MODELS.filter((t) => t.category === 'audio')],
  ['contrôleurs', 'ordinateur', AUDIO_MODELS.filter((t) => t.category === 'ordinateur')]
]

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

describe('éclairage nommé', () => {
  it('les projecteurs sont patchables, les nœuds et contrôleurs ne le sont pas', () => {
    const byId = new Map(LIGHTING_MODELS.map((t) => [t.id, t]))
    for (const id of ['chauvet-rogue-r2x-spot', 'martin-mac-aura-xb', 'claypaky-sharpy', 'robe-megapointe', 'etc-colorsource-par', 'martin-atomic-3000-led']) {
      expect(byId.get(id)?.dmx, id).toBeDefined()
    }
    for (const id of ['enttec-ode-mk3', 'luminex-luminode-4', 'dmxking-edmx4-pro', 'advatek-pixlite-a4s-mk3']) {
      expect(byId.get(id)?.dmx, id).toBeUndefined()
      expect(byId.get(id)!.ports.some((p) => p.connector === 'dmx' || p.connector === 'pixel'), id).toBe(true)
    }
  })
})

describe('vidéo nommée', () => {
  it('les sorties d’un processeur LED ne sont pas des sorties d’univers', () => {
    const p = { ...createProject(), devices: [] }
    const t = VIDEO_MODELS.find((x) => x.id === 'novastar-mctrl4k')!
    const d = createDevice({ ...p, templates: [] }, t.id, { x: 0, y: 0 })
    expect(d.ports.filter((x) => x.connector === 'pixel').length).toBeGreaterThan(0)
    expect(d.ports.some((x) => isUniverseOutput(p, d, x))).toBe(false)
  })
})
