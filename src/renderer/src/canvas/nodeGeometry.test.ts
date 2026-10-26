import { describe, expect, it } from 'vitest'
import type { Side } from '../model/types'
import { estimateNodeSize } from '../model/layout'
import { createDevice, createProject } from '../model/project'
import { TEMPLATES } from '../catalog/templates'
import { SWITCH_PORT_COUNTS } from '../catalog/switch'
import { DEVICE_NODE_HEIGHT, TAPE_LEFT, TAPE_TOP_MAX_WIDTH, VM_GAP, VM_HEADER_H, VM_TILE_W, deviceNodeBox, vmBlock, vmTileHeight, deviceNodeWidth, devicePortOffset, nodeSize, portOffset } from './nodeGeometry'
import { resolvePortSides, sideLayout } from '../model/sides'
import type { Device, Vm } from '../model/types'

const HALF = 5 // .react-flow__handle.port : 10 px de large

describe('devicePortOffset', () => {
  it("les prises du haut ne chevauchent jamais l'étiquette du nom", () => {
    const tapeStart = TAPE_LEFT
    const tapeEnd = TAPE_LEFT + TAPE_TOP_MAX_WIDTH
    for (let width = 176; width <= deviceNodeWidth(48); width++) {
      for (let count = 1; count <= 8; count++) {
        for (let i = 0; i < count; i++) {
          const x = devicePortOffset('top', i, count, width, DEVICE_NODE_HEIGHT)
          const clear = x - HALF >= tapeEnd || x + HALF <= tapeStart
          expect(clear, `largeur ${width}, ${count} prises, prise ${i} à x=${x}`).toBe(true)
          expect(x + HALF).toBeLessThanOrEqual(width)
        }
      }
    }
  })

  it('les prises du haut restent dans l’ordre et ne se superposent pas', () => {
    for (let count = 2; count <= 8; count++) {
      const xs = Array.from({ length: count }, (_, i) => devicePortOffset('top', i, count, deviceNodeWidth(count), DEVICE_NODE_HEIGHT))
      for (let i = 1; i < count; i++) expect(xs[i]! - xs[i - 1]!).toBeGreaterThanOrEqual(2 * HALF)
    }
  })

  it('les autres côtés gardent la répartition sur toute la longueur du bord', () => {
    const width = deviceNodeWidth(3)
    const cases: [Side, number][] = [
      ['bottom', width],
      ['left', DEVICE_NODE_HEIGHT],
      ['right', DEVICE_NODE_HEIGHT]
    ]
    for (const [side, length] of cases) {
      for (let i = 0; i < 3; i++) expect(devicePortOffset(side, i, 3, width, DEVICE_NODE_HEIGHT)).toBe(portOffset(i, 3, length))
    }
  })
})

describe('nodeSize', () => {
  it('l’estimation du modèle (côté des prises) suit exactement la géométrie du canvas', () => {
    const p = createProject(undefined, 'fr')
    for (const t of TEMPLATES.filter((t) => !t.switch)) {
      const d = createDevice(p, t.id, { x: 0, y: 0 }, { lang: 'fr' })
      expect(estimateNodeSize(d), t.id).toEqual(nodeSize(d))
    }
    for (const portCount of SWITCH_PORT_COUNTS) {
      for (const sfpPlus of [0, 2, 4] as const) {
        const d = createDevice(p, 'switch', { x: 0, y: 0 }, { lang: 'fr', switchSpec: { portCount, poe: 'at', sfpPlus, managed: true } })
        expect(estimateNodeSize(d), `${portCount} ports, ${sfpPlus} SFP+`).toEqual(nodeSize(d))
      }
    }
  })
})

describe('deviceNodeBox', () => {
  it('Review Focus 3 : sans portSides, chaque appareil du catalogue garde sa taille et ses positions de prises', () => {
    const p = createProject(undefined, 'fr')
    for (const t of TEMPLATES.filter((t) => !t.switch)) {
      const d = createDevice(p, t.id, { x: 0, y: 0 }, { lang: 'fr' })
      if (nodeSize(d).h !== DEVICE_NODE_HEIGHT) continue // façades de baie
      for (const side of ['top', 'bottom', 'left', 'right'] as const) {
        const dev: Device = { ...d, portSide: side }
        const sides = resolvePortSides({ ...p, devices: [dev] }, dev)
        const box = deviceNodeBox(dev, sides)
        expect(box, t.id).toEqual({ w: deviceNodeWidth(d.ports.length), h: DEVICE_NODE_HEIGHT })
        const layout = sideLayout(dev, sides)
        expect(layout[side].map((x) => x.id)).toEqual(d.ports.map((x) => x.id))
      }
    }
  })

  it('un serveur à 8 DP à droite mesure 16 + 8 × 18 = 160 de haut', () => {
    const p = createProject(undefined, 'fr')
    const d: Device = {
      ...createDevice(p, 'media-server', { x: 0, y: 0 }, { lang: 'fr' }),
      ports: Array.from({ length: 8 }, (_, i) => ({ id: `DP${i}`, label: `DP ${i}`, connector: 'displayport' as const })),
      portSides: { video: 'right' }
    }
    const box = deviceNodeBox(d, resolvePortSides({ ...p, devices: [d] }, d))
    expect(box).toEqual({ w: 176, h: 160 })
    expect(estimateNodeSize(d)).toEqual(box)
    expect(nodeSize(d)).toEqual(box)
  })

  it('les prises du haut gardent la réserve de l’étiquette dans la largeur', () => {
    const p = createProject(undefined, 'fr')
    const d: Device = {
      ...createDevice(p, 'media-server', { x: 0, y: 0 }, { lang: 'fr' }),
      ports: Array.from({ length: 10 }, (_, i) => ({ id: `U${i}`, label: `USB ${i}`, connector: 'usb' as const })),
      portSides: { usb: 'top' }
    }
    // 24 + (10 + ceil(80 / 18) = 5) × 18 = 294
    expect(deviceNodeBox(d, resolvePortSides({ ...p, devices: [d] }, d))).toEqual({ w: 294, h: DEVICE_NODE_HEIGHT })
  })
})

describe('VMs dans le nœud de l’hôte', () => {
  const vm = (id: string, vnics = 1): Vm => ({ id, hostId: 'h', name: id, vnics: Array.from({ length: vnics }, (_, i) => ({ id: `${id}-${i}`, label: `vnic${i}`, ips: [] })) })
  const p = createProject(undefined, 'fr')
  const host = createDevice(p, 'media-server', { x: 0, y: 0 }, { lang: 'fr', id: 'h' })
  const sides = resolvePortSides({ ...p, devices: [host] }, host)

  it('hauteur d’une tuile : 44 + 14 par vNIC ; bloc vide sans VM', () => {
    expect(vmTileHeight(vm('a', 2))).toBe(72)
    expect(vmBlock([])).toEqual({ w: 0, h: 0 })
  })

  it('hôte sans VM : taille inchangée', () => {
    expect(deviceNodeBox(host, sides, [])).toEqual(deviceNodeBox(host, sides))
    expect(deviceNodeBox(host, sides)).toEqual(nodeSize(host))
  })

  it('4 VMs : 2 rangées, largeur ≥ 3 × 150 + 2 × 8 + 24', () => {
    const vms = [vm('a'), vm('b', 3), vm('c'), vm('d')]
    expect(vmBlock(vms)).toEqual({ w: 3 * VM_TILE_W + 2 * VM_GAP, h: vmTileHeight(vms[1]!) + VM_GAP + vmTileHeight(vms[3]!) })
    const box = deviceNodeBox(host, sides, vms)
    expect(box.w).toBeGreaterThanOrEqual(3 * 150 + 2 * 8 + 24)
    expect(box.h).toBe(DEVICE_NODE_HEIGHT + VM_HEADER_H + vmBlock(vms).h + VM_GAP)
    expect(estimateNodeSize(host, vms)).toEqual(box)
    expect(nodeSize(host, vms)).toEqual(box)
  })
})

