import type { z } from 'zod'
import type * as S from './schema'
import type { Localized } from '../../../shared/i18n/localized'

export type VlanId = number
export type PoeClass = z.infer<typeof S.PoeClassSchema>
export type Connector = z.infer<typeof S.ConnectorSchema>
export type Medium = z.infer<typeof S.MediumSchema>
export type Category = z.infer<typeof S.CategorySchema>
export type Side = z.infer<typeof S.SideSchema>
export type PortSide = z.infer<typeof S.PortSideSchema>
export type IpConfig = z.infer<typeof S.IpSchema>
export type PortDef = z.infer<typeof S.PortDefSchema>
export type SwitchSpec = z.infer<typeof S.SwitchSpecSchema>
export type IconRef = z.infer<typeof S.IconRefSchema>
// Gabarit tel qu'il est enregistré dans le projet et la bibliothèque : composante perso, textes saisis dans la langue de la personne.
export type StoredTemplate = z.infer<typeof S.DeviceTemplateSchema>
// Texte d'un gabarit : bilingue pour le catalogue intégré, simple chaîne pour une composante perso.
export type TemplateText = string | Localized
export type TemplatePort = Omit<PortDef, 'label'> & { label: TemplateText }
// Gabarit affichable : intégré (textes Localized) ou perso (chaînes). StoredTemplate lui est assignable.
export type DeviceTemplate = Omit<StoredTemplate, 'name' | 'note' | 'ports'> & { name: TemplateText; note?: TemplateText; ports: TemplatePort[] }
export type PortState = z.infer<typeof S.PortStateSchema>
export type Device = z.infer<typeof S.DeviceSchema>
export type Link = z.infer<typeof S.LinkSchema>
export type Rack = z.infer<typeof S.RackSchema>
export type RackPlacement = NonNullable<Device['rack']>
export type Zone = z.infer<typeof S.ZoneSchema>
export type Vlan = z.infer<typeof S.VlanSchema>
export type Project = z.infer<typeof S.ProjectSchema>

export interface PortRef {
  deviceId: string
  portId: string
}

export type DmxPatch = z.infer<typeof S.DmxPatchSchema>
export type DmxMode = z.infer<typeof S.DmxModeSchema>
export type DmxChannelList = z.infer<typeof S.DmxChannelListSchema>
export type TemplateDmx = z.infer<typeof S.TemplateDmxSchema>
export type Psu = z.infer<typeof S.PsuSchema>
export type LedStripType = z.infer<typeof S.LedStripTypeSchema>
export type LedStrip = z.infer<typeof S.LedStripSchema>
export type MainsVoltage = 120 | 230
