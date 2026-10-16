// src/renderer/src/canvas/connect.test.ts
import { describe, expect, it } from 'vitest'
import { clientPoint, connectionRefs, dropOnDevice, makeIsValidConnection, nodeIdAt, reconnectEnd, dropReconnectOnDevice, dropUnplugs } from './connect'
import { sampleProject } from '../model/__fixtures__/sample'
import { createDevice } from '../model/project'
import type { Project } from '../model/types'

function withDevice(templateId: string): Project {
  const p = sampleProject()
  return { ...p, devices: [...p.devices, createDevice(p, templateId, { x: 0, y: 0 }, { lang: 'fr', id: templateId })] }
}

describe('connect', () => {
  it('traduit une connexion React Flow en paire de ports', () => {
    expect(connectionRefs({ source: 'a', sourceHandle: '1', target: 'b', targetHandle: 'ETH' })).toEqual([
      { deviceId: 'a', portId: '1' },
      { deviceId: 'b', portId: 'ETH' }
    ])
    expect(connectionRefs({ source: 'a', sourceHandle: null, target: 'b', targetHandle: 'ETH' })).toBeNull()
  })

  it('valide une connexion selon les règles physiques', () => {
    const p = withDevice('dante-avio')
    const valid = makeIsValidConnection(() => p)
    expect(valid({ source: 'dante-avio', sourceHandle: 'ETH', target: 'sw1', targetHandle: '2' })).toBe(true)
    expect(valid({ source: 'dante-avio', sourceHandle: 'ETH', target: 'sw1', targetHandle: '1' })).toBe(false)
  })

  it("lâcher sur le corps d'un appareil choisit un port libre compatible", () => {
    const p = withDevice('dante-avio')
    expect(dropOnDevice(p, { deviceId: 'dante-avio', portId: 'ETH' }, 'sw1')).toEqual({ ok: true, to: { deviceId: 'sw1', portId: '2' } })
  })

  it("explique pourquoi aucun port n'est disponible", () => {
    const p = withDevice('led-strip')
    expect(dropOnDevice(p, { deviceId: 'led-strip', portId: 'IN' }, 'sw1')).toEqual({ ok: false, message: 'Aucun port pixels libre sur SW-1.' })
    expect(dropOnDevice(p, { deviceId: 'led-strip', portId: 'IN' }, 'led-strip')).toEqual({ ok: false, message: '' })
  })

  it('trouve le nœud sous le pointeur, souris ou tactile', () => {
    const doc = { elementFromPoint: () => ({ closest: (s: string) => (s === '.react-flow__node' ? { getAttribute: () => 'sw1' } : null) }) } as unknown as Pick<Document, 'elementFromPoint'>
    expect(nodeIdAt(doc, { x: 1, y: 2 })).toBe('sw1')
    expect(clientPoint({ clientX: 3, clientY: 4 } as MouseEvent)).toEqual({ x: 3, y: 4 })
    expect(clientPoint({ changedTouches: [{ clientX: 5, clientY: 6 }] } as unknown as TouchEvent)).toEqual({ x: 5, y: 6 })
  })

  it('aucun câble ne se branche sur la vignette épinglée', () => {
    const doc = { elementFromPoint: () => ({ closest: (s: string) => (s === '.pinned' ? {} : { getAttribute: () => 'cam1' }) }) } as unknown as Pick<Document, 'elementFromPoint'>
    expect(nodeIdAt(doc, { x: 1, y: 2 })).toBeNull()
    const p = withDevice('dante-avio')
    const blocked = makeIsValidConnection(() => p, () => null, () => true)
    expect(blocked({ source: 'dante-avio', sourceHandle: 'ETH', target: 'sw1', targetHandle: '2' })).toBe(false)
  })
})

describe('reconnectEnd', () => {
  const link = { a: { deviceId: 'sw1', portId: '1' }, b: { deviceId: 'cam1', portId: 'ETH' } }

  it('reconnaît le bout déplacé, quel que soit le sens de la connexion', () => {
    expect(reconnectEnd(link, { source: 'sw1', sourceHandle: '1', target: 'cam2', targetHandle: 'ETH' })).toEqual({ end: 'b', to: { deviceId: 'cam2', portId: 'ETH' } })
    expect(reconnectEnd(link, { source: 'sw1', sourceHandle: '3', target: 'cam1', targetHandle: 'ETH' })).toEqual({ end: 'a', to: { deviceId: 'sw1', portId: '3' } })
    expect(reconnectEnd(link, { source: 'cam1', sourceHandle: 'ETH', target: 'sw1', targetHandle: '5' })).toEqual({ end: 'a', to: { deviceId: 'sw1', portId: '5' } })
    expect(reconnectEnd(link, { source: 'sw2', sourceHandle: '4', target: 'sw1', targetHandle: '1' })).toEqual({ end: 'b', to: { deviceId: 'sw2', portId: '4' } })
  })

  it('ne rend rien si rien n’a bougé ou si aucun bout ne correspond', () => {
    expect(reconnectEnd(link, { source: 'sw1', sourceHandle: '1', target: 'cam1', targetHandle: 'ETH' })).toBeNull()
    expect(reconnectEnd(link, { source: 'x', sourceHandle: '1', target: 'y', targetHandle: '2' })).toBeNull()
  })

  it('valide un rebranchement en ignorant le câble déplacé', () => {
    const p = sampleProject()
    const valid = makeIsValidConnection(() => p, () => 'l1')
    expect(valid({ source: 'sw1', sourceHandle: '2', target: 'cam1', targetHandle: 'ETH' })).toBe(true)
    expect(valid({ source: 'sw1', sourceHandle: '1', target: 'cam1', targetHandle: 'HDMI' })).toBe(false)
  })
})

describe('dropReconnectOnDevice', () => {
  const fixed = { deviceId: 'cam1', portId: 'ETH' }

  it('choisit un port libre compatible en écartant le câble déplacé', () => {
    expect(dropReconnectOnDevice(sampleProject(), 'l1', fixed, 'sw1')).toEqual({ ok: true, end: 'a', to: { deviceId: 'sw1', portId: '1' } })
  })

  it('refuse le même appareil sans message, et un câble inconnu', () => {
    expect(dropReconnectOnDevice(sampleProject(), 'l1', fixed, 'cam1')).toEqual({ ok: false, message: '' })
    expect(dropReconnectOnDevice(sampleProject(), 'inconnu', fixed, 'sw1')).toEqual({ ok: false, message: '' })
  })
})

describe('dropUnplugs', () => {
  it('débranche seulement si un rebranchement est en cours et que rien n’est sous le point', () => {
    expect(dropUnplugs('l1', null)).toBe(true)
    expect(dropUnplugs('l1', 'sw1')).toBe(false)
    expect(dropUnplugs(null, null)).toBe(false)
    expect(dropUnplugs(null, 'sw1')).toBe(false)
  })
})
