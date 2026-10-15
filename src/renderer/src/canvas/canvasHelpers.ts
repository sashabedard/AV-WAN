import type { Node } from '@xyflow/react'
import type { CordFlowEdge } from './toFlow'
import type { Device, IpConfig } from '../model/types'
import { patchLine, type PatchEntry } from '../model/dmx'
import { LED_STRIP_TYPES, stripPower } from '../model/led'
import { resolvePsu } from '../model/power'
import { formatFr } from '../model/fields'

export const GRID = 8

// Deuxième ligne de la tuile d'un appareil : « adresse · FIXE/DHCP », « DHCP » sans adresse, sinon « IP non définie ».
export function deviceIpLine(ip: IpConfig | undefined): string {
  if (!ip) return 'IP non définie'
  if (ip.address) return `${ip.address} · ${ip.mode === 'static' ? 'FIXE' : 'DHCP'}`
  return ip.mode === 'dhcp' ? 'DHCP' : 'IP non définie'
}

// 2ᵉ ligne d'une tuile (spec patch-puissance-catalogue § 4.7) : l'adresse DMX d'un appareil patchable, sinon l'IP.
export function deviceSecondLine(device: Device, patch: PatchEntry | undefined): string {
  if (device.ledStrip) {
    const power = stripPower(device.ledStrip)
    const len = device.ledStrip.lengthM
    return power && len !== undefined ? `${formatFr(power.watts)} W · ${formatFr(len)} m` : LED_STRIP_TYPES[device.ledStrip.type].label
  }
  if (device.psu) {
    const r = resolvePsu(device.psu)
    return [r.volts !== undefined ? `${formatFr(r.volts)} V` : '', r.watts !== undefined ? `${formatFr(r.watts)} W` : ''].filter(Boolean).join(' · ')
  }
  if (device.dmx) return patchLine(patch)
  return deviceIpLine(device.ip)
}

export function snapPoint(p: { x: number; y: number }, on: boolean): { x: number; y: number } {
  return on ? { x: Math.round(p.x / GRID) * GRID, y: Math.round(p.y / GRID) * GRID } : { x: p.x, y: p.y }
}

// Les nœuds dérivés du store n'ont ni dimensions mesurées ni sélection : on les reprend de l'état local.
export function mergeNodes<T extends Node>(derived: T[], prev: T[]): T[] {
  const byId = new Map(prev.map((n) => [n.id, n]))
  return derived.map((n) => {
    const p = byId.get(n.id)
    if (!p || (p.measured === undefined && !p.selected)) return n
    return { ...n, ...(p.measured ? { measured: p.measured } : {}), selected: p.selected ?? false }
  })
}

// Vrai quand l'état de React Flow reflète déjà les nœuds dérivés du projet courant (mergeNodes garde l'objet position).
export function nodesMatchDerived(nodes: ReadonlyArray<{ id: string; position: unknown }>, derived: ReadonlyArray<{ id: string; position: unknown }>): boolean {
  return nodes.length === derived.length && nodes.every((n, i) => n.id === derived[i].id && n.position === derived[i].position)
}

export function mergeEdges(derived: CordFlowEdge[], prev: CordFlowEdge[]): CordFlowEdge[] {
  const selected = new Set(prev.filter((e) => e.selected).map((e) => e.id))
  return derived.map((e) => (selected.has(e.id) ? { ...e, selected: true } : e))
}

// La sélection posée par le store (coller, tests, panneau VLAN) devient celle du canvas.
export function syncSelected<T extends { id: string; selected?: boolean }>(items: T[], ids: ReadonlySet<string>): T[] {
  let changed = false
  const next = items.map((item) => {
    const want = ids.has(item.id)
    if ((item.selected ?? false) === want) return item
    changed = true
    return { ...item, selected: want }
  })
  return changed ? next : items
}
