// src/renderer/src/model/daisyChain.ts
// Chaînes DMX et adresses calculées dans l'ordre du câble (spec daisy-chain § 4.1, § 4.2). Fonctions pures.
import type { Device, PortRef, Project } from './types'
import { DMX_SLOTS, isPatchable, isUniverseOutput, linkAdjacency, resolveUniverse } from './dmx'

export interface DaisyChain {
  source: PortRef // prise de sortie d'univers (nœud, console…)
  universe: number // univers de cette prise
  deviceIds: string[] // appareils de la chaîne, dans l'ordre du signal
}

// Les projets de l'historique sont immuables : une liste de chaînes par projet.
const chainCache = new WeakMap<Project, readonly DaisyChain[]>()

export function daisyChains(project: Project): readonly DaisyChain[] {
  const hit = chainCache.get(project)
  if (hit) return hit
  const chains = buildChains(project)
  chainCache.set(project, chains)
  return chains
}

export function chainOf(project: Project, deviceId: string): DaisyChain | undefined {
  return daisyChains(project).find((c) => c.deviceIds.includes(deviceId))
}

function buildChains(project: Project): DaisyChain[] {
  const byId = new Map(project.devices.map((d) => [d.id, d]))
  const adjacency = linkAdjacency(project)
  const chains: DaisyChain[] = []
  for (const device of project.devices) {
    for (const port of device.ports) {
      const universe = device.portState[port.id]?.universe
      if (universe === undefined || !isUniverseOutput(project, device, port)) continue
      const source: PortRef = { deviceId: device.id, portId: port.id }
      const deviceIds: string[] = []
      // Spec § 4.1 : parcours en largeur ; le premier saut ne passe que par la prise de départ.
      const seen = new Set<string>([device.id])
      let frontier = [device.id]
      let first = true
      while (frontier.length > 0) {
        const inFrontier = new Set(frontier)
        const level = [...new Set(frontier.flatMap((id) => adjacency.get(id) ?? []))].sort((a, b) => a - b)
        const next: string[] = []
        for (const i of level) {
          const link = project.links[i]!
          for (const [here, there] of [
            [link.a, link.b],
            [link.b, link.a]
          ] as const) {
            if (!inFrontier.has(here.deviceId)) continue
            if (first && here.portId !== source.portId) continue
            const from = byId.get(here.deviceId)?.ports.find((p) => p.id === here.portId)
            const target = byId.get(there.deviceId)
            const to = target?.ports.find((p) => p.id === there.portId)
            if (!from || !target || !to || from.connector !== 'dmx' || to.connector !== 'dmx') continue
            if (!isPatchable(target) || seen.has(target.id)) continue
            seen.add(target.id)
            next.push(target.id)
            // La source la plus proche gagne : un univers tapé ou une autre prise exclut l'appareil, sans couper le parcours.
            const resolved = resolveUniverse(project, target.id, byId, adjacency)
            if (resolved?.source.kind === 'port' && resolved.source.ref.deviceId === source.deviceId && resolved.source.ref.portId === source.portId) deviceIds.push(target.id)
          }
        }
        frontier = next
        first = false
      }
      chains.push({ source, universe, deviceIds })
    }
  }
  return chains
}

// Spec § 4.2 : curseur à 1 ; une adresse fixée (et définie) le replace après elle, sinon l'adresse suit le curseur.
export function autoAddress(project: Project): Project {
  const wanted = new Map<string, number | undefined>()
  for (const chain of daisyChains(project)) {
    let cursor = 1
    for (const id of chain.deviceIds) {
      const dmx = project.devices.find((d) => d.id === id)?.dmx
      if (!dmx) continue
      if (dmx.addressPinned && dmx.address !== undefined) {
        cursor = dmx.address + dmx.footprint
        continue
      }
      wanted.set(id, cursor <= DMX_SLOTS ? cursor : undefined) // jamais tronquée : au-delà de 512, pas d'adresse
      cursor += dmx.footprint
    }
  }
  let changed = false
  const devices = project.devices.map((d): Device => {
    if (!d.dmx || !wanted.has(d.id)) return d
    const address = wanted.get(d.id)
    if (d.dmx.address === address) return d
    changed = true
    const { address: _old, ...rest } = d.dmx
    return { ...d, dmx: address === undefined ? rest : { ...rest, address } }
  })
  return changed ? { ...project, devices } : project
}

// Spec § 4.6 : à l'ouverture d'un ancien fichier, une adresse enregistrée qui diffère du calcul devient fixée,
// pour qu'aucune adresse documentée ne bouge ; les automatiques sans adresse reçoivent la leur.
export function autoAddressOnOpen(project: Project): Project {
  const toPin = new Set<string>()
  for (const chain of daisyChains(project)) {
    let cursor = 1
    for (const id of chain.deviceIds) {
      const dmx = project.devices.find((d) => d.id === id)?.dmx
      if (!dmx) continue
      if (dmx.address !== undefined && (dmx.addressPinned || dmx.address !== cursor)) {
        if (!dmx.addressPinned) toPin.add(id)
        cursor = dmx.address + dmx.footprint
      } else cursor += dmx.footprint
    }
  }
  const pinned =
    toPin.size === 0
      ? project
      : { ...project, devices: project.devices.map((d): Device => (toPin.has(d.id) ? { ...d, dmx: { ...d.dmx!, addressPinned: true } } : d)) }
  return autoAddress(pinned)
}
