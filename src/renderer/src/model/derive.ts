import type { Link, Medium, PoeClass, PortRef, Project } from './types'
import { findDevice, findPort, isSwitchLike, linksOnPort, passThroughPeer } from './rules'

export type LinkVlanView =
  | { kind: 'access'; vlan: number }
  | { kind: 'trunk'; native?: number; tagged: number[] | 'all' }
  | { kind: 'none' }
export type VlanChoice = LinkVlanView

export const POE_LABELS: Record<PoeClass, string> = { af: 'PoE', at: 'PoE+', bt: 'PoE++' }

const NETWORK_MEDIA: ReadonlySet<Medium> = new Set(['cat5e', 'cat6', 'cat6a', 'om3', 'om4', 'os2', 'dac', 'wifi'])

export function isNetworkMedium(m: Medium): boolean {
  return NETWORK_MEDIA.has(m)
}

// Les extrémités qui portent le réglage VLAN du câble. Un câble sans bout « switch » qui arrive sur un
// panneau de brassage suit la prise jumelle (avant An ⇄ arrière Rn) jusqu'au câble suivant.
export function vlanEnds(project: Project, link: Link): PortRef[] {
  return vlanEndsVia(project, link, new Set([link.id]))
}

function vlanEndsVia(project: Project, link: Link, seen: Set<string>): PortRef[] {
  if (!isNetworkMedium(link.medium)) return []
  const ends = [link.a, link.b]
  const switchLike = (r: PortRef): boolean => {
    const d = findDevice(project, r.deviceId)
    return d !== undefined && isSwitchLike(d)
  }
  if (link.medium === 'wifi') {
    const client = ends.find((r) => findDevice(project, r.deviceId) !== undefined && !switchLike(r))
    return [client ?? link.a]
  }
  const direct = ends.filter(switchLike)
  if (direct.length > 0) return direct
  for (const end of ends) {
    const next = passThroughLink(project, end, seen)
    if (!next) continue
    seen.add(next.id)
    const found = vlanEndsVia(project, next, seen)
    if (found.length > 0) return found
  }
  return []
}

// Le câble branché sur la prise jumelle d'un panneau de brassage, s'il n'a pas déjà été parcouru.
function passThroughLink(project: Project, ref: PortRef, seen: ReadonlySet<string>): Link | undefined {
  const device = findDevice(project, ref.deviceId)
  const peer = device ? passThroughPeer(device, ref.portId) : undefined
  if (!device || !peer) return undefined
  return linksOnPort(project, { deviceId: device.id, portId: peer }).find((l) => !seen.has(l.id))
}

export function linkVlanView(project: Project, link: Link): LinkVlanView {
  const [first] = vlanEnds(project, link)
  if (!first) return { kind: 'none' }
  const st = findDevice(project, first.deviceId)?.portState[first.portId]
  if (!st) return { kind: 'none' }
  if (st.mode === 'trunk') {
    return { kind: 'trunk', ...(st.nativeVlan !== undefined ? { native: st.nativeVlan } : {}), tagged: st.taggedVlans ?? 'all' }
  }
  if (st.nativeVlan !== undefined) return { kind: 'access', vlan: st.nativeVlan }
  return { kind: 'none' }
}

// Tous les VLAN qui passent sur un câble (pour la mise en évidence et les fiches VLAN).
export function linkVlanIds(project: Project, link: Link): number[] {
  const v = linkVlanView(project, link)
  if (v.kind === 'access') return [v.vlan]
  if (v.kind === 'none') return []
  const tagged = v.tagged === 'all' ? project.vlans.map((x) => x.id) : v.tagged
  return [...new Set([...(v.native !== undefined ? [v.native] : []), ...tagged])].sort((a, b) => a - b)
}

export function vlanMembers(project: Project, vlanId: number): { deviceIds: string[]; linkIds: string[] } {
  const linkIds: string[] = []
  const devices = new Set<string>()
  for (const l of project.links) {
    if (!linkVlanIds(project, l).includes(vlanId)) continue
    linkIds.push(l.id)
    devices.add(l.a.deviceId)
    devices.add(l.b.deviceId)
  }
  return { deviceIds: project.devices.filter((d) => devices.has(d.id)).map((d) => d.id), linkIds }
}

export function setLinkVlan(project: Project, linkId: string, choice: VlanChoice): Project {
  const link = project.links.find((l) => l.id === linkId)
  if (!link) return project
  const ends = vlanEnds(project, link)
  if (ends.length === 0) return project
  const devices = project.devices.map((d) => {
    const mine = ends.filter((e) => e.deviceId === d.id)
    if (mine.length === 0) return d
    const portState = { ...d.portState }
    for (const e of mine) {
      const { mode: _mode, nativeVlan: _native, taggedVlans: _tagged, ...rest } = portState[e.portId] ?? {}
      if (choice.kind === 'access') portState[e.portId] = { ...rest, mode: 'access', nativeVlan: choice.vlan }
      else if (choice.kind === 'trunk')
        portState[e.portId] = { ...rest, mode: 'trunk', ...(choice.native !== undefined ? { nativeVlan: choice.native } : {}), taggedVlans: choice.tagged }
      else portState[e.portId] = rest
    }
    return { ...d, portState }
  })
  return { ...project, devices }
}

const POE_ORDER: Record<PoeClass, number> = { af: 1, at: 2, bt: 3 }
type FoundPort = NonNullable<ReturnType<typeof findPort>>

export interface LinkPoe {
  active: boolean
  cls?: PoeClass
  drawW?: number
  pse?: PortRef
  pd?: PortRef
}

export function linkPoe(project: Project, link: Link): LinkPoe {
  const a = findPort(project, link.a)
  const b = findPort(project, link.b)
  if (!a || !b) return { active: false }
  const pairs: Array<[FoundPort, PortRef, FoundPort, PortRef]> = [
    [a, link.a, b, link.b],
    [b, link.b, a, link.a]
  ]
  for (const [pse, pseRef, pd, pdRef] of pairs) {
    const out = pse.port.poeOut
    const inn = pd.port.poeIn
    if (!out || !inn) continue
    if (pse.device.portState[pseRef.portId]?.poeEnabled === false) continue
    const cls = POE_ORDER[out] <= POE_ORDER[inn] ? out : inn
    return { active: true, cls, ...(pd.port.poeDrawW !== undefined ? { drawW: pd.port.poeDrawW } : {}), pse: pseRef, pd: pdRef }
  }
  return { active: false }
}

export function switchPoeUsage(project: Project, deviceId: string): { usedW: number; budgetW?: number } {
  let used = 0
  for (const l of project.links) {
    const poe = linkPoe(project, l)
    if (poe.active && poe.pse?.deviceId === deviceId) used += poe.drawW ?? 0
  }
  const budget = findDevice(project, deviceId)?.switch?.poeBudgetW
  return { usedW: Math.round(used * 10) / 10, ...(budget !== undefined ? { budgetW: budget } : {}) }
}

// VLAN d'une prise : le réglage du port d'un switch, sinon celui du câble branché (accès, ou natif d'un trunk).
export function portVlan(project: Project, ref: PortRef): number | undefined {
  const device = findDevice(project, ref.deviceId)
  const own = device && isSwitchLike(device) ? device.portState[ref.portId]?.nativeVlan : undefined
  if (own !== undefined) return own
  const link = linksOnPort(project, ref)[0]
  if (!link) return undefined
  const v = linkVlanView(project, link)
  return v.kind === 'access' ? v.vlan : v.kind === 'trunk' ? v.native : undefined
}
