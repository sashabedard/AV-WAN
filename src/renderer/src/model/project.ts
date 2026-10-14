import { nanoid } from 'nanoid'
import type { Device, Project, SwitchSpec } from './types'
import { DEFAULT_PROJECT_VLAN_IDS, vlanPreset } from '../catalog/vlanPresets'
import { getTemplate } from '../catalog'
import { buildSwitchPorts, defaultPoeBudget } from '../catalog/switch'
import { nextDeviceName } from './rules'

export function newId(): string {
  return nanoid(10)
}

export function createProject(now: Date = new Date()): Project {
  return {
    schemaVersion: 1,
    meta: { title: 'Nouveau projet', authors: [], date: now.toISOString().slice(0, 10), revision: 'A', status: 'conception' },
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
    return { ...base, switch: spec, ports: buildSwitchPorts(spec) }
  }
  return { ...base, ports: template.ports.map((p) => ({ ...p })), ...(template.model ? { model: template.model } : {}) }
}
