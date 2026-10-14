import { z } from 'zod'

export const VlanIdSchema = z.number().int().min(1).max(4094)
export const PoeClassSchema = z.enum(['af', 'at', 'bt'])
export const ConnectorSchema = z.enum(['rj45', 'sfp', 'sfp+', 'wifi', 'usb', 'dmx', 'pixel', 'hdmi', 'sdi', 'serial'])
export const MediumSchema = z.enum([
  'cat5e', 'cat6', 'cat6a', 'om3', 'om4', 'os2', 'dac', 'wifi', 'usb', 'dmx', 'pixel', 'hdmi', 'sdi', 'serial'
])
export const CategorySchema = z.enum(['reseau', 'ordinateur', 'audio', 'video', 'eclairage', 'iot', 'capteur', 'autre'])
export const SideSchema = z.enum(['top', 'bottom', 'left', 'right'])
export const PortSideSchema = z.enum(['auto', 'top', 'bottom', 'left', 'right'])

const XYSchema = z.object({ x: z.number(), y: z.number() })
const HexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/)
export const IpSchema = z.object({ address: z.string(), mode: z.enum(['static', 'dhcp']) })

export const PortDefSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9+_-]+$/),
  label: z.string(),
  connector: ConnectorSchema,
  speedMbps: z.number().positive().optional(),
  poeOut: PoeClassSchema.optional(),
  poeIn: PoeClassSchema.optional(),
  poeDrawW: z.number().nonnegative().optional(),
  row: z.enum(['top', 'bottom', 'side']).optional()
})

export const SwitchSpecSchema = z.object({
  portCount: z.union([z.literal(4), z.literal(5), z.literal(8), z.literal(12), z.literal(16), z.literal(24), z.literal(48)]),
  poe: z.enum(['none', 'af', 'at', 'bt']),
  poeBudgetW: z.number().nonnegative().optional(),
  sfpPlus: z.union([z.literal(0), z.literal(2), z.literal(4)]),
  managed: z.boolean()
})

export const IconRefSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('builtin'), name: z.string() }),
  z.object({ kind: z.literal('image'), dataUri: z.string().startsWith('data:image/') })
])

export const DeviceTemplateSchema = z.object({
  id: z.string(),
  category: CategorySchema,
  name: z.string(),
  code: z.string().min(1).max(4),
  vendor: z.string().optional(),
  model: z.string().optional(),
  icon: IconRefSchema,
  ports: z.array(PortDefSchema),
  switch: SwitchSpecSchema.optional(),
  defaults: z.object({ vlanId: VlanIdSchema.optional() }).optional(),
  isCustom: z.boolean().optional()
})

export const PortStateSchema = z.object({
  mode: z.enum(['access', 'trunk']).optional(),
  nativeVlan: VlanIdSchema.optional(),
  taggedVlans: z.union([z.array(VlanIdSchema), z.literal('all')]).optional(),
  poeEnabled: z.boolean().optional(),
  ip: IpSchema.optional(),
  label: z.string().optional(),
  note: z.string().optional()
})

export const DeviceSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  name: z.string(),
  position: XYSchema,
  zoneId: z.string().optional(),
  portSide: PortSideSchema,
  model: z.string().optional(),
  icon: IconRefSchema.optional(),
  switch: SwitchSpecSchema.optional(),
  ports: z.array(PortDefSchema),
  portState: z.record(z.string(), PortStateSchema),
  ip: IpSchema.optional(),
  hostname: z.string().optional(),
  note: z.string().optional()
})

const PortRefSchema = z.object({ deviceId: z.string(), portId: z.string() })

export const LinkSchema = z.object({
  id: z.string(),
  cableId: z.string(),
  a: PortRefSchema,
  b: PortRefSchema,
  medium: MediumSchema,
  lengthM: z.number().positive().optional(),
  jacketColor: z.string().optional(),
  wifi: z.object({ ssid: z.string().optional(), band: z.enum(['2.4', '5', '6']).optional() }).optional(),
  elbow: z.object({ dx: z.number(), dy: z.number() }).optional(),
  note: z.string().optional()
})

export const ZoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  rect: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }),
  ownPdfPage: z.boolean()
})

export const UnifiSchema = z.object({
  igmpSnooping: z.boolean(),
  querier: z.boolean(),
  forwardUnknownMulticast: z.enum(['drop', 'flood', 'router-ports']),
  floodKnownProtocols: z.boolean(),
  fastLeave: z.boolean(),
  mdnsProxy: z.enum(['off', 'auto', 'all', 'custom']),
  networkIsolation: z.boolean(),
  proAvProfile: z.string().optional(),
  jumboFrames: z.boolean()
})

export const VlanSchema = z.object({
  id: VlanIdSchema,
  name: z.string(),
  short: z.string(),
  color: z.object({ dark: HexColorSchema, light: HexColorSchema }),
  subnet: z.string().optional(),
  gateway: z.string().optional(),
  dhcp: z.object({ enabled: z.boolean(), range: z.string().optional() }).optional(),
  internet: z.boolean(),
  unifi: UnifiSchema,
  note: z.string().optional()
})

export const ProjectSchema = z.object({
  schemaVersion: z.literal(1),
  meta: z.object({
    title: z.string(),
    course: z.string().optional(),
    authors: z.array(z.string()),
    date: z.string(),
    revision: z.string(),
    status: z.enum(['conception', 'tel-que-construit'])
  }),
  settings: z.object({
    colorMode: z.enum(['vlan', 'type', 'port']),
    pageFormat: z.enum(['na', 'iso']),
    cableIdPrefix: z.string(),
    snapToGrid: z.boolean()
  }),
  vlans: z.array(VlanSchema),
  devices: z.array(DeviceSchema),
  links: z.array(LinkSchema),
  zones: z.array(ZoneSchema),
  templates: z.array(DeviceTemplateSchema),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }).optional()
})
