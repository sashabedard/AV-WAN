// Les dessins arrivent au plan 2 : ici, seulement les noms, pour que les gabarits soient stables.
export const BUILTIN_ICON_NAMES = [
  'switch', 'gateway', 'ap', 'ptp', 'injector', 'converter', 'laptop', 'desktop', 'mac', 'server',
  'media-server', 'nas', 'dante', 'dante-card', 'audio-console', 'speaker', 'ptz', 'camera', 'encoder',
  'projector', 'display', 'lighting-console', 'dmx-node', 'pixel-controller', 'fixture', 'led-strip',
  'esp32', 'chip', 'arduino', 'plc', 'raspberry', 'broker', 'lidar', 'depth-camera', 'generic'
] as const
export type BuiltinIconName = (typeof BUILTIN_ICON_NAMES)[number]
