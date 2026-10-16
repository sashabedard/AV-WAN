import type { Device, Project, Vlan } from './types'
import { VLAN_PRESETS, type VlanPreset } from '../catalog/vlanPresets'

export type VlanPatch = Partial<Omit<Vlan, 'id'>>

export const VLAN_BASE_UNIFI: Vlan['unifi'] = {
  igmpSnooping: false,
  querier: false,
  forwardUnknownMulticast: 'drop',
  floodKnownProtocols: false,
  fastLeave: false,
  mdnsProxy: 'off',
  networkIsolation: false,
  jumboFrames: false
}
const FALLBACK_COLOR = { dark: '#8E969F', light: '#646C75' }
const byId = (a: Vlan, b: Vlan): number => a.id - b.id

export function nextFreeVlanId(project: Project, from = 100): number {
  const used = new Set(project.vlans.map((v) => v.id))
  let id = from
  while (used.has(id) && id < 4094) id++
  return id
}

export function blankVlan(project: Project): Vlan {
  const id = nextFreeVlanId(project)
  const used = new Set(project.vlans.map((v) => v.color.dark.toUpperCase()))
  const color = VLAN_PRESETS.map((v) => v.color).find((c) => !used.has(c.dark.toUpperCase())) ?? FALLBACK_COLOR
  return { id, name: `VLAN ${id}`, short: `VLAN${id}`, color: { ...color }, internet: false, unifi: { ...VLAN_BASE_UNIFI } }
}

export function availablePresets(project: Project): VlanPreset[] {
  return VLAN_PRESETS.filter((p) => !project.vlans.some((v) => v.id === p.id))
}

export function addVlan(project: Project, vlan: Vlan): Project {
  if (project.vlans.some((v) => v.id === vlan.id)) return project
  return { ...project, vlans: [...project.vlans, structuredClone(vlan)].sort(byId) }
}

export function updateVlan(project: Project, id: number, patch: VlanPatch): Project {
  if (!project.vlans.some((v) => v.id === id)) return project
  return { ...project, vlans: project.vlans.map((v) => (v.id === id ? { ...v, ...patch } : v)) }
}

// Renuméroter : le nouveau numéro suit sur chaque port qui utilisait l'ancien. null si refusé.
export function changeVlanId(project: Project, from: number, to: number): Project | null {
  if (from === to) return project
  if (!Number.isInteger(to) || to < 1 || to > 4094) return null
  if (project.vlans.some((v) => v.id === to) || !project.vlans.some((v) => v.id === from)) return null
  const remap = (n: number): number => (n === from ? to : n)
  const devices = project.devices.map((d): Device => {
    let changed = false
    const portState = Object.fromEntries(
      Object.entries(d.portState).map(([port, st]) => {
        const uses = st.nativeVlan === from || (Array.isArray(st.taggedVlans) && st.taggedVlans.includes(from))
        if (!uses) return [port, st]
        changed = true
        return [
          port,
          {
            ...st,
            ...(st.nativeVlan !== undefined ? { nativeVlan: remap(st.nativeVlan) } : {}),
            ...(Array.isArray(st.taggedVlans) ? { taggedVlans: [...new Set(st.taggedVlans.map(remap))].sort((a, b) => a - b) } : {})
          }
        ]
      })
    )
    return changed ? { ...d, portState } : d
  })
  return { ...project, vlans: project.vlans.map((v) => (v.id === from ? { ...v, id: to } : v)).sort(byId), devices }
}

// Retirer un VLAN ne touche pas aux ports (dessin libre) : leurs câbles deviennent neutres.
export function removeVlan(project: Project, id: number): Project {
  if (!project.vlans.some((v) => v.id === id)) return project
  return { ...project, vlans: project.vlans.filter((v) => v.id !== id) }
}
