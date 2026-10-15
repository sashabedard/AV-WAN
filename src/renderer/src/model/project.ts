import { nanoid } from 'nanoid'
import type { Device, DeviceTemplate, DmxPatch, Project, SwitchSpec, TemplateDmx } from './types'
import { DEFAULT_PROJECT_VLAN_IDS, vlanPreset } from '../catalog/vlanPresets'
import { getTemplate } from '../catalog'
import { buildSwitchPorts, defaultPoeBudget } from '../catalog/switch'
import { nextDeviceName } from './rules'

export function newId(): string {
  return nanoid(10)
}

// Date du calendrier local (toISOString donne la date UTC : le lendemain en soirée à Montréal).
function localDate(now: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function createProject(now: Date = new Date()): Project {
  return {
    schemaVersion: 2,
    meta: { title: 'Nouveau projet', authors: [], date: localDate(now), revision: 'A', status: 'conception' },
    settings: { colorMode: 'vlan', pageFormat: 'na', cableIdPrefix: 'C-', snapToGrid: true },
    vlans: DEFAULT_PROJECT_VLAN_IDS.map((id) => vlanPreset(id)),
    devices: [],
    links: [],
    zones: [],
    templates: []
  }
}

export interface CreateDeviceOptions {
  switchSpec?: SwitchSpec
  id?: string
  // Composante perso de la bibliothèque : addDevice l'embarque dans le projet avant de créer l'appareil.
  template?: DeviceTemplate
}

// Patch de départ : le 1er mode du gabarit (le plus courant), sans adresse ni univers.
function initialPatch(t: TemplateDmx): DmxPatch {
  const first = t.modes?.[0]
  return first ? { footprint: first.channels, mode: first.name } : { footprint: t.footprint }
}

// Champs du gabarit copiés sur l'appareil, comme ses ports (spec patch-puissance-catalogue § 3.2).
function templateExtras(t: DeviceTemplate): Partial<Device> {
  return {
    ...(t.model ? { model: t.model } : {}),
    ...(t.note ? { note: t.note } : {}),
    ...(t.powerW !== undefined ? { powerW: t.powerW } : {}),
    ...(t.dmx ? { dmx: initialPatch(t.dmx) } : {}),
    ...(t.psu ? { psu: { ...t.psu } } : {}),
    ...(t.ledStrip ? { ledStrip: { ...t.ledStrip } } : {})
  }
}

export function createDevice(
  project: Project,
  templateId: string,
  position: { x: number; y: number },
  opts: CreateDeviceOptions = {}
): Device {
  const template = getTemplate(project, templateId)
  if (!template) throw new Error(`Gabarit inconnu : ${templateId}`)
  const base = {
    id: opts.id ?? newId(),
    templateId,
    name: nextDeviceName(project, template.code),
    position: { x: position.x, y: position.y },
    portSide: 'auto' as const,
    portState: {}
  }
  if (template.switch) {
    const raw = opts.switchSpec ?? template.switch
    const budget = raw.poeBudgetW ?? defaultPoeBudget(raw.portCount, raw.poe)
    const spec: SwitchSpec = { portCount: raw.portCount, poe: raw.poe, sfpPlus: raw.sfpPlus, managed: raw.managed, ...(budget !== undefined ? { poeBudgetW: budget } : {}) }
    return { ...base, switch: spec, ports: buildSwitchPorts(spec), ...(template.powerW !== undefined ? { powerW: template.powerW } : {}) }
  }
  return { ...base, ports: template.ports.map((p) => ({ ...p })), ...templateExtras(template) }
}
