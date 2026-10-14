// Noms stables des icônes maison ; les dessins sont dans icons/glyphs.ts.
export const BUILTIN_ICON_NAMES = [
  'switch', 'gateway', 'ap', 'ptp', 'injector', 'converter', 'patch-panel', 'laptop', 'desktop', 'mac', 'server',
  'media-server', 'nas', 'dante', 'dante-card', 'audio-console', 'speaker', 'ptz', 'camera', 'encoder',
  'projector', 'display', 'lighting-console', 'dmx-node', 'pixel-controller', 'fixture', 'led-strip',
  'esp32', 'chip', 'arduino', 'plc', 'raspberry', 'broker', 'lidar', 'depth-camera', 'generic'
] as const
export type BuiltinIconName = (typeof BUILTIN_ICON_NAMES)[number]
