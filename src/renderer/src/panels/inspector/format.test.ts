import { describe, expect, it } from 'vitest'
import { messages } from '../../../../shared/i18n/messages'
import { peersOf, portVlanSummary } from './format'
import { createDevice, createProject } from '../../model/project'
import type { Project } from '../../model/types'

const words = messages('fr').inspector.device

describe('portVlanSummary', () => {
  it('résume le réglage VLAN d’un port', () => {
    expect(portVlanSummary(undefined, words)).toBe('')
    expect(portVlanSummary({}, words)).toBe('')
    expect(portVlanSummary({ mode: 'access', nativeVlan: 40 }, words)).toBe('A · 40')
    expect(portVlanSummary({ nativeVlan: 40 }, words)).toBe('A · 40')
    expect(portVlanSummary({ mode: 'trunk', nativeVlan: 10, taggedVlans: [30, 40] }, words)).toBe('T · 10 / 30, 40')
    expect(portVlanSummary({ mode: 'trunk', taggedVlans: 'all' }, words)).toBe('T · — / tous')
  })
})

describe('peersOf', () => {
  it('liste tous les clients d’une radio Wi-Fi de point d’accès', () => {
    let p: Project = createProject()
    const ap = createDevice(p, 'ap', { x: 0, y: 0 })
    p = { ...p, devices: [ap] }
    const a = createDevice(p, 'esp32-devkit', { x: 0, y: 200 })
    p = { ...p, devices: [...p.devices, a] }
    const b = createDevice(p, 'esp32-devkit', { x: 200, y: 200 })
    p = { ...p, devices: [...p.devices, b] }
    p.links.push(
      { id: 'w1', cableId: 'C-001', a: { deviceId: a.id, portId: 'WIFI' }, b: { deviceId: ap.id, portId: 'WIFI' }, medium: 'wifi' },
      { id: 'w2', cableId: 'C-002', a: { deviceId: b.id, portId: 'WIFI' }, b: { deviceId: ap.id, portId: 'WIFI' }, medium: 'wifi' }
    )
    expect(peersOf(p, ap, 'WIFI')).toBe('IOT-1 · Wi-Fi, IOT-2 · Wi-Fi')
    expect(peersOf(p, ap, 'ETH')).toBe('—')
  })
})
