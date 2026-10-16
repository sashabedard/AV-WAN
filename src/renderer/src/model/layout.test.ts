import { describe, expect, it } from 'vitest'
import { resolvePortSide } from './layout'
import type { Device } from './types'
import { createDevice, createProject } from './project'
import { sampleProject } from './__fixtures__/sample'

describe('resolvePortSide', () => {
  it("met les prises face aux appareils branchés (la caméra est sous le switch)", () => {
    const p = sampleProject()
    expect(resolvePortSide(p, p.devices[1]!)).toBe('top')
    expect(resolvePortSide(p, p.devices[0]!)).toBe('bottom')
  })

  it('respecte un choix manuel et met les prises en bas sans câble', () => {
    const p = sampleProject()
    expect(resolvePortSide(p, { ...p.devices[1]!, portSide: 'left' })).toBe('left')
    expect(resolvePortSide({ ...p, links: [] }, p.devices[1]!)).toBe('bottom')
  })

  it('choisit un côté latéral quand le voisin est surtout à droite', () => {
    const p = sampleProject()
    p.devices[1]!.position = { x: 600, y: 40 }
    expect(resolvePortSide(p, p.devices[0]!)).toBe('right')
  })

  it('compare les centres : un appareil sous la moitié droite d’un switch 48 ports a ses prises en haut', () => {
    const p = createProject(undefined, 'fr')
    const sw = createDevice(p, 'switch', { x: 0, y: 0 }, { lang: 'fr', switchSpec: { portCount: 48, poe: 'at', sfpPlus: 4, managed: true } })
    p.devices.push(sw)
    // Façade ≈ 612 px de large : centre de la caméra (176 px) aux trois quarts de la façade.
    const cam = createDevice(p, 'ptz-ndi', { x: 459 - 88, y: 200 }, { lang: 'fr' })
    p.devices.push(cam)
    p.links.push({ id: 'l1', cableId: 'C-001', a: { deviceId: sw.id, portId: '40' }, b: { deviceId: cam.id, portId: 'ETH' }, medium: 'cat6' })
    expect(resolvePortSide(p, cam)).toBe('top')
    expect(resolvePortSide(p, sw)).toBe('bottom')
  })

  it('utilise la taille fournie par le canvas quand elle est donnée', () => {
    const p = sampleProject()
    // Caméra en (0, 200) sous le bord gauche d'un switch de 2000 px : son centre est loin à droite.
    const wide = (d: Device) => (d.switch ? { w: 2000, h: 66 } : { w: 176, h: 58 })
    expect(resolvePortSide(p, p.devices[1]!, wide)).toBe('right')
  })
})
