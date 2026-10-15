// Noms stables des icônes maison ; les dessins sont dans icons/glyphs.ts.
export const BUILTIN_ICON_NAMES = [
  'switch', 'gateway', 'ap', 'ptp', 'injector', 'psu', 'converter', 'patch-panel', 'laptop', 'desktop', 'mac', 'server',
  'media-server', 'nas', 'dante', 'dante-card', 'audio-console', 'speaker', 'stagebox', 'ptz', 'camera', 'encoder',
  'projector', 'display', 'lighting-console', 'dmx-node', 'pixel-controller', 'fixture', 'led-strip',
  'moving-head', 'par', 'strobe', 'fog', 'led-processor', 'led-panel',
  'esp32', 'chip', 'arduino', 'plc', 'raspberry', 'broker', 'lidar', 'depth-camera', 'usb-controller', 'generic'
] as const
export type BuiltinIconName = (typeof BUILTIN_ICON_NAMES)[number]
