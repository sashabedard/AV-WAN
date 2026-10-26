import { describe, expect, it } from 'vitest'
import { messages } from '../../../shared/i18n/messages'
import { sanitizeProject } from './sanitize'
import { sampleProject } from './__fixtures__/sample'

describe('sanitizeProject', () => {
  it('renvoie le même objet sans avertissement si tout est sain', () => {
    const p = sampleProject()
    const r = sanitizeProject(p, messages('fr'))
    expect(r.project).toBe(p)
    expect(r.warnings).toEqual([])
  })

  it('retire les câbles orphelins, en double ou sur un port déjà pris', () => {
    const p = sampleProject()
    p.links.push({ ...p.links[0]!, id: 'l2', cableId: 'C-002' }) // même ports que l1
    p.links.push({ id: 'l3', cableId: 'C-003', a: { deviceId: 'fantome', portId: 'ETH' }, b: { deviceId: 'sw1', portId: '2' }, medium: 'cat6' })
    p.links.push({ ...p.links[0]!, cableId: 'C-004' }) // même id que l1
    const r = sanitizeProject(p, messages('fr'))
    expect(r.project.links.map((l) => l.id)).toEqual(['l1'])
    expect(r.warnings).toHaveLength(3)
    expect(r.warnings.join(' ')).toContain('C-003')
  })

  it('retire un appareil en double', () => {
    const p = sampleProject()
    p.devices.push({ ...p.devices[1]! })
    const r = sanitizeProject(p, messages('fr'))
    expect(r.project.devices).toHaveLength(2)
    expect(r.warnings[0]).toContain('CAM-1')
  })

  it('retire les placements en baie invalides, le premier chevauchant garde sa place', () => {
    const p = sampleProject()
    p.racks = [{ id: 'r1', name: 'BAIE-1', heightU: 6 }]
    const c = { ...p.devices[1]!, id: 'c', name: 'C' }
    p.devices = [
      { ...p.devices[0]!, rack: { rackId: 'r1', u: 1, heightU: 2 } },
      { ...p.devices[1]!, rack: { rackId: 'r1', u: 2, heightU: 1 } },
      { ...c, rack: { rackId: 'absent', u: 1, heightU: 1 } }
    ]
    const r = sanitizeProject(p, messages('fr'))
    expect(r.project.devices.map((d) => d.rack)).toEqual([{ rackId: 'r1', u: 1, heightU: 2 }, undefined, undefined])
    expect(r.project.devices[1]).toEqual({ ...p.devices[1]!, rack: undefined })
    expect('rack' in r.project.devices[1]!).toBe(false)
    expect(r.project.links).toEqual(p.links)
    expect(r.warnings).toHaveLength(2)
  })

  it('retire une baie en double et un placement qui dépasse la baie', () => {
    const p = sampleProject()
    p.racks = [{ id: 'r1', name: 'A', heightU: 2 }, { id: 'r1', name: 'B', heightU: 40 }]
    p.devices[0] = { ...p.devices[0]!, rack: { rackId: 'r1', u: 2, heightU: 2 } }
    const r = sanitizeProject(p, messages('fr'))
    expect(r.project.racks).toHaveLength(1)
    expect(r.project.devices[0]!.rack).toBeUndefined()
  })

  it('retire une VM dont l’hôte est inconnu, avec un avertissement', () => {
    const p = sampleProject()
    p.vms = [{ id: 'vm1', hostId: 'fantome', name: 'VM Show', vnics: [] }]
    const r = sanitizeProject(p, messages('fr'))
    expect(r.project.vms).toEqual([])
    expect(r.warnings[0]).toContain('VM Show')
  })

  it('retire un pont de vNIC vers un port absent de l’hôte', () => {
    const p = sampleProject()
    p.vms = [{ id: 'vm1', hostId: 'cam1', name: 'VM', vnics: [{ id: 'v0', label: 'vnic0', bridgePortId: 'NOPE', ips: [] }, { id: 'v1', label: 'vnic1', bridgePortId: 'ETH', ips: [] }] }]
    const r = sanitizeProject(p, messages('fr'))
    expect(r.project.vms![0]!.vnics).toEqual([{ id: 'v0', label: 'vnic0', ips: [] }, { id: 'v1', label: 'vnic1', bridgePortId: 'ETH', ips: [] }])
  })

  it('un port dont la carte est inconnue retombe dans « Intégré »', () => {
    const p = sampleProject()
    const cam = p.devices[1]!
    cam.cards = [{ id: 'c1', name: 'GPU 1' }]
    cam.ports = [{ ...cam.ports[0]!, cardId: 'c1' }, { ...cam.ports[1]!, cardId: 'fantome' }]
    const r = sanitizeProject(p, messages('fr'))
    const ports = r.project.devices[1]!.ports
    expect(ports[0]!.cardId).toBe('c1')
    expect('cardId' in ports[1]!).toBe(false)
  })
})
