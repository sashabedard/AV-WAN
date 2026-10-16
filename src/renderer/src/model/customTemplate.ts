// Composantes perso (spec plan 4 § 6) : brouillon de la boîte « Nouvelle composante », ports, validation,
// et embarquement dans le projet. Fonctions pures.
import { nanoid } from 'nanoid'
import { decimalText, parseDecimalField, parseIntField } from './fields'
import { templateText } from '../catalog/templateText'
import type { Lang } from '../../../shared/i18n/lang'
import type { Messages } from '../../../shared/i18n/messages'
import type { Category, Connector, DeviceTemplate, StoredTemplate, IconRef, PoeClass, PortDef, Project } from './types'

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
  patchable: boolean
  footprint: string
  powerW: string
}

export interface DraftErrors {
  name?: string
  code?: string
  ports?: string
  dmx?: string
  power?: string
}

// Préfixe des ports ajoutés en lot : « 4 × RJ45 » donne ETH1 à ETH4.
const PORT_PREFIX: Record<Connector, string> = {
  rj45: 'ETH', sfp: 'SFP', 'sfp+': 'SFP+', wifi: 'WIFI', usb: 'USB', dmx: 'DMX', pixel: 'PIX', hdmi: 'HDMI', sdi: 'SDI', serial: 'SER', dc: 'DC'
}
const SPEED: Partial<Record<Connector, number>> = { rj45: 1000, sfp: 1000, 'sfp+': 10000 }

const stripAccents = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

export function newCustomId(): string {
  return `custom-${nanoid(12)}`
}

export function blankDraft(): TemplateDraft {
  return { name: '', code: '', category: 'autre', vendor: '', model: '', icon: { kind: 'builtin', name: 'generic' }, ports: [], patchable: false, footprint: '1', powerW: '' }
}

const poeOf = (p: Pick<PortDef, 'poeIn' | 'poeOut'>): PoeChoice => (p.poeIn ? `in-${p.poeIn}` : p.poeOut ? `out-${p.poeOut}` : 'none')

export function draftFrom(t: DeviceTemplate, lang: Lang): TemplateDraft {
  return {
    name: templateText(t.name, lang),
    code: t.code,
    category: t.category,
    vendor: t.vendor ?? '',
    model: t.model ?? '',
    icon: structuredClone(t.icon),
    ports: t.ports.map((p) => ({ label: templateText(p.label, lang) || p.id, connector: p.connector, poe: poeOf(p) })),
    // Pas de formatFr ici : son espace des milliers (« 1 200 ») serait refusé à la relecture du champ.
    patchable: t.dmx !== undefined,
    footprint: String(t.dmx?.modes?.[0]?.channels ?? t.dmx?.footprint ?? 1),
    powerW: t.powerW !== undefined ? decimalText(t.powerW, lang) : ''
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

export function validateDraft(d: TemplateDraft, m: Messages['componentEditor']['errors'], lang: Lang): DraftErrors {
  const errors: DraftErrors = {}
  const name = d.name.trim()
  if (!name) errors.name = m.nameRequired
  else if (name.length > MAX_NAME) errors.name = m.nameTooLong({ max: MAX_NAME })
  if (!/^[A-Z0-9]{1,4}$/.test(d.code)) errors.code = m.code
  if (d.ports.length > MAX_PORTS) errors.ports = m.tooManyPorts({ max: MAX_PORTS })
  else if (d.ports.some((p) => !p.label.trim())) errors.ports = m.portNeedsName
  if (d.patchable && typeof parseIntField(d.footprint, 1, 512) !== 'number') errors.dmx = m.channels
  if (parseDecimalField(d.powerW, false, lang) === undefined) errors.power = m.power
  return errors
}

export function hasErrors(errors: DraftErrors): boolean {
  return Object.keys(errors).length > 0
}

export function templateFromDraft(d: TemplateDraft, id: string, lang: Lang): StoredTemplate {
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
  const footprint = parseIntField(d.footprint, 1, 512)
  const powerW = parseDecimalField(d.powerW, false, lang)
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
    ...(d.patchable && typeof footprint === 'number' ? { dmx: { footprint } } : {}),
    ...(typeof powerW === 'number' ? { powerW } : {}),
    isCustom: true
  }
}

// Une copie est toujours perso ; le nom est tronqué avant le suffixe pour que « (copie) » reste visible.
// Un gabarit intégré (textes bilingues) devient une composante perso : ses textes sont figés dans `lang`, la langue de l'interface.
export function duplicateTemplate(t: DeviceTemplate, copySuffix: string, lang: Lang): StoredTemplate {
  const name = templateText(t.name, lang)
  const { note, ...rest } = structuredClone(t)
  return {
    ...rest,
    id: newCustomId(),
    name: `${name.slice(0, MAX_NAME - copySuffix.length)}${copySuffix}`,
    ports: t.ports.map((p) => ({ ...structuredClone(p), label: templateText(p.label, lang) })),
    ...(note !== undefined ? { note: templateText(note, lang) } : {}),
    isCustom: true
  }
}

// Placement : le projet embarque la composante, pour s'ouvrir complet chez quelqu'un qui ne l'a pas.
export function withTemplate(project: Project, template: StoredTemplate): Project {
  return project.templates.some((t) => t.id === template.id) ? project : { ...project, templates: [...project.templates, template] }
}

// Enregistrement : les composantes qui ne servent plus à aucun appareil ne sont pas écrites.
export function pruneTemplates(project: Project): Project {
  const used = new Set(project.devices.map((d) => d.templateId))
  const kept = project.templates.filter((t) => used.has(t.id))
  return kept.length === project.templates.length ? project : { ...project, templates: kept }
}

export function projectOnlyTemplates(project: Pick<Project, 'templates'>, libraryIds: ReadonlySet<string>): StoredTemplate[] {
  return project.templates.filter((t) => !libraryIds.has(t.id))
}
