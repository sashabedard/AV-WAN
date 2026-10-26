import type { Device, Project, Vm, Vnic } from './types'
import type { Messages } from '../../../shared/i18n/messages'
import { getTemplate } from '../catalog'
import { newId } from './project'
import { isNetworkPort } from './ips'
import { portVlan } from './derive'

// VMs hébergées par un ordinateur (spec cartes-ip-vms § 4.1, § 4.5) : jamais des Device, pas de câble ni de position.
export function canHostVms(project: Project, device: Device): boolean {
  return getTemplate(project, device.templateId)?.category === 'ordinateur'
}

export function vmsOf(project: Project, hostId: string): Vm[] {
  return (project.vms ?? []).filter((v) => v.hostId === hostId)
}

const mapVm = (project: Project, id: string, fn: (vm: Vm) => Vm): Project => ({ ...project, vms: (project.vms ?? []).map((v) => (v.id === id ? fn(v) : v)) })

const firstFree = (taken: ReadonlySet<string>, make: (n: number) => string, from: number): string => {
  let n = from
  while (taken.has(make(n))) n++
  return make(n)
}

export function addVm(project: Project, hostId: string, m: Messages, makeId: () => string = newId): { project: Project; id: string } {
  const host = project.devices.find((d) => d.id === hostId)
  const name = firstFree(new Set(vmsOf(project, hostId).map((v) => v.name)), (n) => m.model.vms.name({ n }), 1)
  const bridge = host?.ports.find(isNetworkPort)?.id
  const vm: Vm = { id: makeId(), hostId, name, vnics: [{ id: makeId(), label: 'vnic0', ...(bridge ? { bridgePortId: bridge } : {}), ips: [] }] }
  return { project: { ...project, vms: [...(project.vms ?? []), vm] }, id: vm.id }
}

export function updateVm(project: Project, id: string, patch: Partial<Pick<Vm, 'name' | 'specs' | 'hostname' | 'note'>>): Project {
  return mapVm(project, id, (vm) => ({ ...vm, ...patch }))
}

const withoutBridge = (n: Vnic): Vnic => {
  const { bridgePortId: _b, ...rest } = n
  return rest
}

// Changer d'hôte : un pont vers un port absent du nouvel hôte est vidé (aucune référence pendante).
export function moveVm(project: Project, id: string, hostId: string): Project {
  const host = project.devices.find((d) => d.id === hostId)
  if (!host) return project
  const ports = new Set(host.ports.map((p) => p.id))
  return mapVm(project, id, (vm) => ({
    ...vm,
    hostId,
    vnics: vm.vnics.map((n) => (n.bridgePortId !== undefined && !ports.has(n.bridgePortId) ? withoutBridge(n) : n))
  }))
}

export function addVnic(project: Project, vmId: string, makeId: () => string = newId): Project {
  return mapVm(project, vmId, (vm) => ({
    ...vm,
    vnics: [...vm.vnics, { id: makeId(), label: firstFree(new Set(vm.vnics.map((v) => v.label)), (n) => `vnic${n}`, 0), ips: [] }]
  }))
}

// Un champ passé à undefined est retiré (pont « — », VLAN hérité).
export function updateVnic(project: Project, vmId: string, vnicId: string, patch: Partial<Omit<Vnic, 'id'>>): Project {
  return mapVm(project, vmId, (vm) => ({
    ...vm,
    vnics: vm.vnics.map((n) => {
      if (n.id !== vnicId) return n
      const next = { ...n, ...patch }
      for (const k of Object.keys(next) as Array<keyof Vnic>) if (next[k] === undefined) delete next[k]
      return next
    })
  }))
}

export function removeVnic(project: Project, vmId: string, vnicId: string): Project {
  return mapVm(project, vmId, (vm) => ({ ...vm, vnics: vm.vnics.filter((n) => n.id !== vnicId) }))
}

export function removeVms(project: Project, ids: readonly string[]): Project {
  const gone = new Set(ids)
  return { ...project, vms: (project.vms ?? []).filter((v) => !gone.has(v.id)) }
}

// VLAN d'une vNIC : le sien, sinon celui du port ponté de l'hôte (même règle que le plan IP).
export function vnicVlan(project: Project, vm: Vm, vnic: Vnic): number | undefined {
  if (vnic.vlanId !== undefined) return vnic.vlanId
  return vnic.bridgePortId !== undefined ? portVlan(project, { deviceId: vm.hostId, portId: vnic.bridgePortId }) : undefined
}
