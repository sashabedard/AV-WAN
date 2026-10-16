import { z } from 'zod'

// Messages de validation en français (amendements du plan 1 : plus d'anglais dans les toasts).
z.config(z.locales.fr())

export const VlanIdSchema = z.number().int().min(1).max(4094)
export const PoeClassSchema = z.enum(['af', 'at', 'bt'])
export const ConnectorSchema = z.enum(['rj45', 'sfp', 'sfp+', 'wifi', 'usb', 'dmx', 'pixel', 'hdmi', 'sdi', 'serial', 'dc'])
export const MediumSchema = z.enum([
  'cat5e', 'cat6', 'cat6a', 'om3', 'om4', 'os2', 'dac', 'wifi', 'usb', 'dmx', 'pixel', 'hdmi', 'sdi', 'serial', 'dc'
])
export const CategorySchema = z.enum(['reseau', 'ordinateur', 'audio', 'video', 'eclairage', 'iot', 'capteur', 'autre'])
export const SideSchema = z.enum(['top', 'bottom', 'left', 'right'])
export const PortSideSchema = z.enum(['auto', 'top', 'bottom', 'left', 'right'])

const XYSchema = z.object({ x: z.number(), y: z.number() })
const HexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/)
export const IpSchema = z.object({ address: z.string(), mode: z.enum(['static', 'dhcp']) })

// Patch DMX (spec patch-puissance-catalogue § 3.2). Univers : Art-Net commence à 0, sACN à 1 ; gardé tel que tapé.
export const DmxUniverseSchema = z.number().int().min(0).max(63999)
const DmxSlotSchema = z.number().int().min(1).max(512)
export const DmxPatchSchema = z.object({
  footprint: DmxSlotSchema,
  address: DmxSlotSchema.optional(),
  universe: DmxUniverseSchema.optional(),
  mode: z.string().optional(),
  // Spec daisy-chain § 4.2 : adresse fixée à la main, la chaîne la respecte et repart après elle.
  addressPinned: z.literal(true).optional()
})
// Noms des canaux DMX (spec canaux-dmx § 3.2) : params[i] nomme le canal i + 1 ; un trou est ''.
export const DMX_PARAM_MAX = 60
const DmxParamsSchema = z.array(z.string().max(DMX_PARAM_MAX)).max(512)
export const DmxModeSchema = z.object({ name: z.string(), channels: DmxSlotSchema, params: DmxParamsSchema.optional() })
// Liste d'un modèle + mode, dans le projet ou les réglages : clé (gabarit, modèle, mode), '' quand absent.
export const DmxChannelListSchema = z.object({
  templateId: z.string(),
  model: z.string().optional(),
  mode: z.string().optional(),
  params: DmxParamsSchema
})
// modes[0] : le mode le plus courant, choisi à la création de l'appareil.
export const TemplateDmxSchema = z.object({ footprint: DmxSlotSchema, modes: z.array(DmxModeSchema).min(1).optional() })
// Alimentation : deux valeurs suffisent, la troisième se calcule (P = V × I).
export const PsuSchema = z.object({ volts: z.number().positive().optional(), amps: z.number().positive().optional(), watts: z.number().positive().optional() })
export const LedStripTypeSchema = z.enum(['cob', 'cob-cct', 'fcob-rgb', 'fcob-rgbw', 'smd-rgb', 'smd-rgbw', 'ws2811', 'ws2812b', 'ws2815', 'sk6812-rgbw', 'gs8208'])
export const LedStripSchema = z.object({
  type: LedStripTypeSchema,
  volts: z.number().positive(),
  wPerM: z.number().nonnegative(),
  lengthM: z.number().positive().optional(), // absente : puissance non renseignée
  pxPerM: z.number().int().positive().optional()
})

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
  sfpPlus: z.number().int().min(0).max(4),
  managed: z.boolean()
})

export const IconRefSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('builtin'), name: z.string() }),
  // tint : SVG monochrome importé, affiché en currentColor (masque CSS), comme les icônes maison.
  z.object({ kind: z.literal('image'), dataUri: z.string().startsWith('data:image/'), tint: z.boolean().optional() })
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
  powerW: z.number().nonnegative().optional(),
  dmx: TemplateDmxSchema.optional(),
  psu: PsuSchema.optional(),
  ledStrip: LedStripSchema.optional(),
  note: z.string().optional(),
  isCustom: z.boolean().optional()
})

export const PortStateSchema = z.object({
  mode: z.enum(['access', 'trunk']).optional(),
  nativeVlan: VlanIdSchema.optional(),
  taggedVlans: z.union([z.array(VlanIdSchema), z.literal('all')]).optional(),
  poeEnabled: z.boolean().optional(),
  ip: IpSchema.optional(),
  universe: DmxUniverseSchema.optional(),
  label: z.string().optional(),
  note: z.string().optional()
})

export const RackSchema = z.object({
  id: z.string(),
  name: z.string(),
  heightU: z.number().int().min(1).max(52),
  zoneId: z.string().optional()
})

export const RackPlacementSchema = z.object({ rackId: z.string(), u: z.number().int().min(1), heightU: z.number().int().min(1).max(52) })

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
  note: z.string().optional(),
  powerW: z.number().nonnegative().optional(),
  dmx: DmxPatchSchema.optional(),
  psu: PsuSchema.optional(),
  ledStrip: LedStripSchema.optional(),
  rack: RackPlacementSchema.optional()
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
  schemaVersion: z.literal(3),
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
    snapToGrid: z.boolean(),
    mainsVoltage: z.union([z.literal(120), z.literal(230)]).optional()
  }),
  vlans: z.array(VlanSchema),
  devices: z.array(DeviceSchema),
  links: z.array(LinkSchema),
  zones: z.array(ZoneSchema),
  racks: z.array(RackSchema).optional(),
  templates: z.array(DeviceTemplateSchema),
  dmxChannels: z.array(DmxChannelListSchema).optional(),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }).optional()
})
