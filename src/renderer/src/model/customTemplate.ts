// Composantes perso (spec plan 4 § 6) : brouillon de la boîte « Nouvelle composante », ports, validation,
// et embarquement dans le projet. Fonctions pures.
import { nanoid } from 'nanoid'
import type { Category, Connector, DeviceTemplate, IconRef, PoeClass, PortDef, Project } from './types'

export const CUSTOM_ID = /^custom-[A-Za-z0-9_-]{6,40}$/
export const MAX_PORTS = 64
export const MAX_NAME = 60

export type PoeChoice = 'none' | `in-${PoeClass}` | `out-${PoeClass}`

export interface PortDraft {
  label: string
  connector: Connector
  poe: PoeChoice
}

export interface TemplateDraft {
  name: string
  code: string
  category: Category
  vendor: string
  model: string
  icon: IconRef
  ports: PortDraft[]
}

export interface DraftErrors {
  name?: string
  code?: string
  ports?: string
}

// Préfixe des ports ajoutés en lot : « 4 × RJ45 » donne ETH1 à ETH4.
const PORT_PREFIX: Record<Connector, string> = {
  rj45: 'ETH', sfp: 'SFP', 'sfp+': 'SFP+', wifi: 'WIFI', usb: 'USB', dmx: 'DMX', pixel: 'PIX', hdmi: 'HDMI', sdi: 'SDI', serial: 'SER'
}
const SPEED: Partial<Record<Connector, number>> = { rj45: 1000, sfp: 1000, 'sfp+': 10000 }

const stripAccents = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

export function newCustomId(): string {
  return `custom-${nanoid(12)}`
}

export function blankDraft(): TemplateDraft {
  return { name: '', code: '', category: 'autre', vendor: '', model: '', icon: { kind: 'builtin', name: 'generic' }, ports: [] }
}

const poeOf = (p: PortDef): PoeChoice => (p.poeIn ? `in-${p.poeIn}` : p.poeOut ? `out-${p.poeOut}` : 'none')

export function draftFrom(t: DeviceTemplate): TemplateDraft {
  return {
    name: t.name,
    code: t.code,
    category: t.category,
    vendor: t.vendor ?? '',
    model: t.model ?? '',
    icon: structuredClone(t.icon),
    ports: t.ports.map((p) => ({ label: p.label || p.id, connector: p.connector, poe: poeOf(p) }))
  }
}

// Le PoE ne passe que par un port RJ45.
export function poeAllowed(connector: Connector): boolean {
  return connector === 'rj45'
}

export function addPortBatch(ports: readonly PortDraft[], connector: Connector, count: number): PortDraft[] {
  const n = Math.min(Math.max(0, Math.floor(count)), Math.max(0, MAX_PORTS - ports.length))
  const prefix = PORT_PREFIX[connector]
  const numbered = new RegExp(`^${prefix.replace(/\+/g, '\\+')}(\\d+)$`)
  let next = 1 + ports.reduce((max, p) => {
    const m = numbered.exec(p.label)
    return m ? Math.max(max, Number(m[1])) : max
  }, 0)
  const added: PortDraft[] = []
  for (let i = 0; i < n; i++) added.push({ label: `${prefix}${next++}`, connector, poe: 'none' })
  return [...ports, ...added]
}

export function portIdFromLabel(label: string, taken: ReadonlySet<string>): string {
  const base = stripAccents(label.trim()).replace(/[^A-Za-z0-9+_-]+/g, '-').replace(/^-+|-+$/g, '') || 'P'
  if (!taken.has(base)) return base
  let k = 2
  while (taken.has(`${base}-${k}`)) k++
  return `${base}-${k}`
}

export function normalizeCode(code: string): string {
  return stripAccents(code).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
}

export function validateDraft(d: TemplateDraft): DraftErrors {
  const errors: DraftErrors = {}
  const name = d.name.trim()
  if (!name) errors.name = 'Donnez un nom à la composante.'
  else if (name.length > MAX_NAME) errors.name = `${MAX_NAME} caractères au plus.`
  if (!/^[A-Z0-9]{1,4}$/.test(d.code)) errors.code = 'De 1 à 4 lettres ou chiffres.'
  if (d.ports.length > MAX_PORTS) errors.ports = `${MAX_PORTS} ports au plus.`
  else if (d.ports.some((p) => !p.label.trim())) errors.ports = 'Chaque port a besoin d’un nom.'
  return errors
}

export function hasErrors(errors: DraftErrors): boolean {
  return Object.keys(errors).length > 0
}

export function templateFromDraft(d: TemplateDraft, id: string): DeviceTemplate {
  const taken = new Set<string>()
  const ports = d.ports.map((p): PortDef => {
    const portId = portIdFromLabel(p.label, taken)
    taken.add(portId)
    const def: PortDef = { id: portId, label: p.label.trim(), connector: p.connector }
    const speed = SPEED[p.connector]
    if (speed) def.speedMbps = speed
    if (poeAllowed(p.connector) && p.poe !== 'none') {
      const [direction, poeClass] = p.poe.split('-') as ['in' | 'out', PoeClass]
      if (direction === 'in') def.poeIn = poeClass
      else def.poeOut = poeClass
    }
    return def
  })
  const vendor = d.vendor.trim()
  const model = d.model.trim()
  return {
    id,
    category: d.category,
    name: d.name.trim(),
    code: d.code,
    icon: structuredClone(d.icon),
    ports,
    ...(vendor ? { vendor } : {}),
    ...(model ? { model } : {}),
    isCustom: true
  }
}

export function duplicateTemplate(t: DeviceTemplate): DeviceTemplate {
  return { ...structuredClone(t), id: newCustomId(), name: `${t.name} (copie)`.slice(0, MAX_NAME) }
}

// Placement : le projet embarque la composante, pour s'ouvrir complet chez quelqu'un qui ne l'a pas.
export function withTemplate(project: Project, template: DeviceTemplate): Project {
  return project.templates.some((t) => t.id === template.id) ? project : { ...project, templates: [...project.templates, template] }
}

// Enregistrement : les composantes qui ne servent plus à aucun appareil ne sont pas écrites.
export function pruneTemplates(project: Project): Project {
  const used = new Set(project.devices.map((d) => d.templateId))
  const kept = project.templates.filter((t) => used.has(t.id))
  return kept.length === project.templates.length ? project : { ...project, templates: kept }
}

export function projectOnlyTemplates(project: Pick<Project, 'templates'>, libraryIds: ReadonlySet<string>): DeviceTemplate[] {
  return project.templates.filter((t) => !libraryIds.has(t.id))
}
