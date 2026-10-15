// src/renderer/src/model/power.ts
// Puissance (spec patch-puissance-catalogue § 5) : alimentations V/A/W, charge, sources d'alimentation.
import type { Device, MainsVoltage, Project, Psu } from './types'
import { linkPoe } from './derive'
import { findDevice, linksOnPort } from './rules'
import { stripPower } from './led'

export const LOAD_MARGIN = 0.8 // règle des 80 % : 20 % de marge sur une alimentation
export type LoadLevel = 'ok' | 'margin' | 'over'

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function loadLevel(ratio: number): LoadLevel {
  return ratio > 1 ? 'over' : ratio > LOAD_MARGIN ? 'margin' : 'ok'
}

export interface ResolvedPsu {
  volts?: number
  amps?: number
  watts?: number
  computed?: 'volts' | 'amps' | 'watts' // la valeur déduite des deux autres
  product?: number // V × I, quand les trois valeurs tapées ne concordent pas (écart > 1 %)
}

export function resolvePsu(spec: Psu | undefined): ResolvedPsu {
  const { volts: v, amps: a, watts: w } = spec ?? {}
  if (v !== undefined && a !== undefined && w === undefined) return { volts: v, amps: a, watts: round1(v * a), computed: 'watts' }
  if (v !== undefined && w !== undefined && a === undefined) return { volts: v, amps: round1(w / v), watts: w, computed: 'amps' }
  if (a !== undefined && w !== undefined && v === undefined) return { volts: round1(w / a), amps: a, watts: w, computed: 'volts' }
  if (v !== undefined && a !== undefined && w !== undefined && Math.abs(v * a - w) > 0.01 * w) return { volts: v, amps: a, watts: w, product: round1(v * a) }
  return { ...(v !== undefined ? { volts: v } : {}), ...(a !== undefined ? { amps: a } : {}), ...(w !== undefined ? { watts: w } : {}) }
}

// Capacité d'une alimentation : une valeur calculée qui s'arrondit à 0 (5 V × 0,005 A) est inconnue, jamais un ratio infini.
export function psuCapacityW(spec: Psu | undefined): number | undefined {
  const w = resolvePsu(spec).watts
  return w !== undefined && w > 0 ? w : undefined
}

// Puissance d'un appareil : calculée pour une bande, nominale pour une alimentation, sinon le champ.
export function devicePowerW(device: Device): number | undefined {
  if (device.ledStrip) return stripPower(device.ledStrip)?.watts
  if (device.psu) return psuCapacityW(device.psu)
  return device.powerW
}

export function mainsVoltage(project: Project): MainsVoltage {
  return project.settings.mainsVoltage ?? 120
}

// Appareils au bout des câbles branchés sur les prises DC (ou pixel) d'un appareil, chacun une fois.
function peersOn(project: Project, deviceId: string, connector: 'dc' | 'pixel'): Device[] {
  const device = findDevice(project, deviceId)
  if (!device) return []
  const out: Device[] = []
  const seen = new Set<string>()
  for (const port of device.ports) {
    if (port.connector !== connector) continue
    for (const l of linksOnPort(project, { deviceId, portId: port.id })) {
      const other = l.a.deviceId === deviceId && l.a.portId === port.id ? l.b : l.a
      const peer = findDevice(project, other.deviceId)
      if (peer && peer.id !== deviceId && !seen.has(peer.id)) {
        seen.add(peer.id)
        out.push(peer)
      }
    }
  }
  return out
}

const dcPeers = (project: Project, deviceId: string): Device[] => peersOn(project, deviceId, 'dc')

function hasDcCable(project: Project, device: Device): boolean {
  return device.ports.some((port) => port.connector === 'dc' && linksOnPort(project, { deviceId: device.id, portId: port.id }).length > 0)
}

export interface PsuLoad {
  capacityW?: number
  loadW: number
  ratio?: number
  fed: Device[]
  missing: Device[] // alimentés sans puissance renseignée : comptés 0
}

export function psuLoad(project: Project, psuId: string): PsuLoad {
  const psu = findDevice(project, psuId)
  const direct = dcPeers(project, psuId)
  // Bandes sans câble DC nourries à travers un contrôleur de pixels branché sur cette alimentation (voir feedingPsu).
  const viaPixel = psu?.psu ? project.devices.filter((d) => d.ledStrip && !direct.includes(d) && feedingPsu(project, d.id)?.id === psuId) : []
  const fed = [...direct, ...viaPixel]
  const loadW = round1(fed.reduce((sum, d) => sum + (devicePowerW(d) ?? 0), 0))
  const capacityW = psuCapacityW(psu?.psu)
  return {
    ...(capacityW !== undefined ? { capacityW } : {}),
    loadW,
    ...(capacityW !== undefined ? { ratio: loadW / capacityW } : {}),
    fed,
    missing: fed.filter((d) => devicePowerW(d) === undefined)
  }
}

// L'alimentation (gabarit avec `psu`) branchée sur une prise DC de l'appareil. Une bande sans câble DC est
// nourrie par sa sortie pixel (PixLite : PSU → DC-IN du contrôleur, puis chaque sortie porte données et alimentation) :
// elle compte sur l'alimentation de l'appareil qui la pilote. Une bande avec son propre câble DC garde son alimentation directe.
export function feedingPsu(project: Project, deviceId: string): Device | undefined {
  return psuFeeding(project, deviceId, new Set())
}

function psuFeeding(project: Project, deviceId: string, visited: Set<string>): Device | undefined {
  const device = findDevice(project, deviceId)
  if (!device || device.psu) return undefined
  const direct = dcPeers(project, deviceId).find((d) => d.psu !== undefined)
  if (direct || !device.ledStrip || hasDcCable(project, device)) return direct
  visited.add(deviceId)
  for (const peer of peersOn(project, deviceId, 'pixel')) {
    if (visited.has(peer.id)) continue
    const psu = psuFeeding(project, peer.id, visited)
    if (psu) return psu
  }
  return undefined
}

// Le switch (ou l'injecteur) qui alimente l'appareil en PoE, s'il y en a un.
export function poeFeeder(project: Project, deviceId: string): Device | undefined {
  for (const l of project.links) {
    if (l.a.deviceId !== deviceId && l.b.deviceId !== deviceId) continue
    const poe = linkPoe(project, l)
    if (poe.active && poe.pd?.deviceId === deviceId && poe.pse) return findDevice(project, poe.pse.deviceId)
  }
  return undefined
}
