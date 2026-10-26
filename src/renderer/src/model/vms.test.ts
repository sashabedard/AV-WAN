import { describe, expect, it } from 'vitest'
import type { Project } from './types'
import { messages } from '../../../shared/i18n/messages'
import { createDevice, createProject } from './project'
import { addVm, addVnic, canHostVms, moveVm, removeVms, removeVnic, updateVm, updateVnic, vmsOf, vnicVlan } from './vms'

let n = 0
const ids = () => `id${++n}`
const m = messages('fr')

function project(): Project {
  const p = createProject(undefined, 'fr')
  const host = createDevice(p, 'media-server', { x: 0, y: 0 }, { lang: 'fr', id: 'h1' })
  const other = createDevice(p, 'media-pc', { x: 400, y: 0 }, { lang: 'fr', id: 'h2' })
  const cam = createDevice(p, 'ptz-ndi', { x: 0, y: 400 }, { lang: 'fr', id: 'cam' })
  const sw = createDevice(p, 'switch', { x: 0, y: 800 }, { lang: 'fr', id: 'sw', switchSpec: { portCount: 8, poe: 'none', sfpPlus: 0, managed: true } })
  return {
    ...p,
    devices: [host, other, cam, { ...sw, portState: { '3': { mode: 'access', nativeVlan: 40 } } }],
    links: [{ id: 'l', cableId: 'C-001', a: { deviceId: 'sw', portId: '3' }, b: { deviceId: 'h1', portId: 'ETH3' }, medium: 'cat6' }]
  }
}

describe('vms', () => {
  it('canHostVms : un ordinateur oui, une caméra non', () => {
    const p = project()
    expect(canHostVms(p, p.devices[0]!)).toBe(true)
    expect(canHostVms(p, p.devices[2]!)).toBe(false)
  })

  it('addVm deux fois : « VM 1 », « VM 2 », vnic0 pontée sur le 1ᵉʳ port réseau', () => {
    let p = project()
    const a = addVm(p, 'h1', m, ids)
    p = a.project
    const b = addVm(p, 'h1', m, ids)
    p = b.project
    expect(vmsOf(p, 'h1').map((v) => v.name)).toEqual(['VM 1', 'VM 2'])
    expect(vmsOf(p, 'h1')[0]!.vnics).toEqual([{ id: expect.any(String), label: 'vnic0', bridgePortId: 'ETH1', ips: [] }])
    expect(vmsOf(p, 'h2')).toEqual([])
    expect(addVm(p, 'h2', m, ids).project.vms!.at(-1)!.name).toBe('VM 1')
  })

  it('updateVm, addVnic, updateVnic, removeVnic, removeVms', () => {
    let p = project()
    const { project: q, id } = addVm(p, 'h1', m, ids)
    p = updateVm(q, id, { name: 'Show', specs: { os: 'Ubuntu 24.04', vcpu: 4, ramGb: 16 } })
    p = addVnic(p, id)
    const vm = () => p.vms!.find((v) => v.id === id)!
    expect(vm().name).toBe('Show')
    expect(vm().vnics.map((v) => v.label)).toEqual(['vnic0', 'vnic1'])
    const v1 = vm().vnics[1]!.id
    p = updateVnic(p, id, v1, { bridgePortId: 'ETH2', ips: [{ address: '10.40.0.32', mode: 'static' }] })
    expect(vm().vnics[1]).toMatchObject({ bridgePortId: 'ETH2', ips: [{ address: '10.40.0.32', mode: 'static' }] })
    p = removeVnic(p, id, vm().vnics[0]!.id)
    expect(vm().vnics.map((v) => v.label)).toEqual(['vnic1'])
    expect(removeVms(p, [id]).vms).toEqual([])
  })

  it('Review Focus 5 : changer d’hôte vers un ordinateur sans le port ponté vide le pont', () => {
    let p = project()
    const { project: q, id } = addVm(p, 'h1', m, ids)
    p = updateVnic(q, id, q.vms![0]!.vnics[0]!.id, { bridgePortId: 'ETH4' })
    const moved = moveVm(p, id, 'h2') // le PC média n'a que ETH1 et ETH2
    expect(moved.vms![0]!.hostId).toBe('h2')
    expect('bridgePortId' in moved.vms![0]!.vnics[0]!).toBe(false)
    const kept = moveVm(updateVnic(p, id, p.vms![0]!.vnics[0]!.id, { bridgePortId: 'ETH1' }), id, 'h2')
    expect(kept.vms![0]!.vnics[0]!.bridgePortId).toBe('ETH1')
  })

  it('vnicVlan hérite du VLAN du câble du port ponté ; vlanId le surcharge', () => {
    let p = project()
    const { project: q, id } = addVm(p, 'h1', m, ids)
    p = updateVnic(q, id, q.vms![0]!.vnics[0]!.id, { bridgePortId: 'ETH3' })
    const vm = p.vms![0]!
    expect(vnicVlan(p, vm, vm.vnics[0]!)).toBe(40)
    expect(vnicVlan(p, vm, { ...vm.vnics[0]!, vlanId: 50 })).toBe(50)
    expect(vnicVlan(p, vm, { ...vm.vnics[0]!, bridgePortId: undefined })).toBeUndefined()
  })
})
