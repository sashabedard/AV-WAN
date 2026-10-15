import type { z } from 'zod'
import type * as S from './schema'

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
export type DeviceTemplate = z.infer<typeof S.DeviceTemplateSchema>
export type PortState = z.infer<typeof S.PortStateSchema>
export type Device = z.infer<typeof S.DeviceSchema>
export type Link = z.infer<typeof S.LinkSchema>
export type Zone = z.infer<typeof S.ZoneSchema>
export type Vlan = z.infer<typeof S.VlanSchema>
export type Project = z.infer<typeof S.ProjectSchema>

export interface PortRef {
  deviceId: string
  portId: string
}

export type DmxPatch = z.infer<typeof S.DmxPatchSchema>
export type DmxMode = z.infer<typeof S.DmxModeSchema>
export type TemplateDmx = z.infer<typeof S.TemplateDmxSchema>
export type Psu = z.infer<typeof S.PsuSchema>
export type LedStripType = z.infer<typeof S.LedStripTypeSchema>
export type LedStrip = z.infer<typeof S.LedStripSchema>
export type MainsVoltage = 120 | 230
