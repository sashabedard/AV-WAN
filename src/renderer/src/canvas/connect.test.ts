// src/renderer/src/canvas/connect.test.ts
import { describe, expect, it } from 'vitest'
import { clientPoint, connectionRefs, dropOnDevice, makeIsValidConnection, nodeIdAt } from './connect'
import { sampleProject } from '../model/__fixtures__/sample'
import { createDevice } from '../model/project'
import type { Project } from '../model/types'

function withDevice(templateId: string): Project {
  const p = sampleProject()
  return { ...p, devices: [...p.devices, createDevice(p, templateId, { x: 0, y: 0 }, { id: templateId })] }
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
    const doc = { elementFromPoint: () => ({ closest: () => ({ getAttribute: () => 'sw1' }) }) } as unknown as Pick<Document, 'elementFromPoint'>
    expect(nodeIdAt(doc, { x: 1, y: 2 })).toBe('sw1')
    expect(clientPoint({ clientX: 3, clientY: 4 } as MouseEvent)).toEqual({ x: 3, y: 4 })
    expect(clientPoint({ changedTouches: [{ clientX: 5, clientY: 6 }] } as unknown as TouchEvent)).toEqual({ x: 5, y: 6 })
  })
})
