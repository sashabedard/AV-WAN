import { describe, expect, it } from 'vitest'
import { sampleProject } from './__fixtures__/sample'
import { canConnectPorts, defaultMedium, isPortFree, nextCableId, nextDeviceName, pickPort } from './rules'
import { createDevice } from './project'
import type { Project } from './types'

function withDevices(p: Project, ...templateIds: string[]): Project {
  let out = p
  for (const t of templateIds) out = { ...out, devices: [...out.devices, createDevice(out, t, { x: 0, y: 400 }, { id: t })] }
  return out
}

describe('isPortFree et canConnectPorts', () => {
  it("un port RJ45 n'accepte qu'un câble", () => {
    const p = sampleProject()
    expect(isPortFree(p, { deviceId: 'sw1', portId: '1' })).toBe(false)
    expect(isPortFree(p, { deviceId: 'sw1', portId: '2' })).toBe(true)
    expect(isPortFree(p, { deviceId: 'sw1', portId: '99' })).toBe(false)
  })

  it('refuse les connecteurs incompatibles et un appareil relié à lui-même', () => {
    const p = withDevices(sampleProject(), 'led-strip')
    expect(canConnectPorts(p, { deviceId: 'sw1', portId: '2' }, { deviceId: 'led-strip', portId: 'IN' })).toBe(false)
    expect(canConnectPorts(p, { deviceId: 'sw1', portId: '2' }, { deviceId: 'sw1', portId: '3' })).toBe(false)
  })

  it("la radio d'un point d'accès accepte plusieurs clients, une seule fois chacun", () => {
    let p = withDevices(sampleProject(), 'ap', 'esp32-devkit', 'arduino-r4-wifi')
    const ap = { deviceId: 'ap', portId: 'WIFI' }
    p = { ...p, links: [...p.links, { id: 'w1', cableId: 'C-002', a: { deviceId: 'esp32-devkit', portId: 'WIFI' }, b: ap, medium: 'wifi' }] }
    expect(canConnectPorts(p, { deviceId: 'arduino-r4-wifi', portId: 'WIFI' }, ap)).toBe(true)
    expect(canConnectPorts(p, { deviceId: 'esp32-devkit', portId: 'WIFI' }, ap)).toBe(false)
  })
})

describe('defaultMedium, nextCableId, nextDeviceName', () => {
  it('choisit un médium selon le connecteur', () => {
    expect(defaultMedium('rj45')).toBe('cat6')
    expect(defaultMedium('sfp+')).toBe('om4')
    expect(defaultMedium('wifi')).toBe('wifi')
    expect(defaultMedium('dmx')).toBe('dmx')
  })

  it("ne réutilise jamais un numéro de câble (les étiquettes sont peut-être déjà imprimées)", () => {
    const p = sampleProject()
    p.links.push({ ...p.links[0]!, id: 'l9', cableId: 'C-007' })
    expect(nextCableId(p)).toBe('C-008')
    expect(nextCableId({ ...p, links: [] })).toBe('C-001')
  })

  it('trouve le premier nom libre', () => {
    expect(nextDeviceName(sampleProject(), 'SW')).toBe('SW-2')
  })
})

describe('pickPort', () => {
  it('préfère un port PoE pour un appareil alimenté par PoE', () => {
    const p = withDevices(sampleProject(), 'dante-avio')
    expect(pickPort(p, { deviceId: 'dante-avio', portId: 'ETH' }, 'sw1')).toBe('2')
  })

  it("renvoie undefined s'il n'y a aucun port compatible libre", () => {
    const p = withDevices(sampleProject(), 'led-strip')
    expect(pickPort(p, { deviceId: 'led-strip', portId: 'IN' }, 'sw1')).toBeUndefined()
  })
})
