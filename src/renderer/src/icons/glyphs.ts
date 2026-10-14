import type { BuiltinIconName } from '../catalog/iconNames'
import type { Category } from '../model/types'

// Grille de 24, trait 1,5, extrémités arrondies, currentColor, sans remplissage (spec § 8.6).
// Tracés en commandes absolues seulement : le test borne chaque point dans la grille.
const n = (v: number): string => String(Math.round(v * 100) / 100)

/** Rectangle à coins arrondis. */
export function rr(x: number, y: number, w: number, h: number, r: number): string {
  return (
    `M${n(x + r)} ${n(y)}H${n(x + w - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)}` +
    `V${n(y + h - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w - r)} ${n(y + h)}` +
    `H${n(x + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y + h - r)}` +
    `V${n(y + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}Z`
  )
}

/** Cercle (deux demi-arcs). */
export function circle(cx: number, cy: number, r: number): string {
  return `M${n(cx - r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 0 ${n(cx + r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 0 ${n(cx - r)} ${n(cy)}Z`
}

/** Point : un trait minuscule que l'extrémité ronde transforme en pastille. */
export function dot(x: number, y: number): string {
  return `M${n(x)} ${n(y)}H${n(x + 0.01)}`
}

export const GLYPHS: Record<BuiltinIconName, readonly string[]> = {
  switch: [rr(2, 7, 20, 10, 2), 'M5.5 11V13', 'M8.5 11V13', 'M11.5 11V13', 'M14.5 11V13', rr(17, 10.75, 2.5, 2.5, 0.5)],
  gateway: [rr(3, 13, 18, 7, 2), dot(7, 16.5), dot(10, 16.5), 'M14 16.5H17', 'M12 10V3', 'M9.5 5.5L12 3L14.5 5.5'],
  ap: [rr(4, 15.5, 16, 4, 2), 'M8.5 11.5A5 5 0 0 1 15.5 11.5', 'M6 9A8.5 8.5 0 0 1 18 9', dot(12, 13.5)],
  ptp: [rr(3, 5, 4, 9, 1), rr(17, 5, 4, 9, 1), 'M5 14V20', 'M19 14V20', 'M9 9.5H10.5', 'M11.25 9.5H12.75', 'M13.5 9.5H15'],
  injector: [rr(4, 4, 16, 16, 2), 'M13 7L9.5 12.5H13L11 17'],
  converter: [rr(2.5, 8.5, 6, 7, 1), rr(15.5, 9.5, 6, 5, 1), 'M8.5 12H15.5', 'M13.5 10L15.5 12L13.5 14'],
  'patch-panel': [rr(2, 7, 20, 10, 1.5), 'M5 10H7V12H5Z', 'M8.5 10H10.5V12H8.5Z', 'M12 10H14V12H12Z', 'M15.5 10H17.5V12H15.5Z', 'M5 14.5H19'],
  laptop: [rr(5, 5, 14, 10, 1.5), 'M2.5 18.5H21.5L19.5 15H4.5Z'],
  desktop: [rr(14.5, 4, 6.5, 16, 1.5), dot(17.75, 8), 'M16.5 11H19', rr(3, 6, 9, 7, 1), 'M7.5 13V17', 'M5 17H10'],
  mac: [rr(3, 3.5, 18, 12.5, 1.5), 'M12 16V20.5', 'M8.5 20.5H15.5', 'M10.5 7.25L14.5 9.75L10.5 12.25Z'],
  server: [rr(4, 3.5, 16, 7, 1.5), rr(4, 13.5, 16, 7, 1.5), dot(7.5, 7), dot(7.5, 17), 'M11 7H16.5', 'M11 17H16.5'],
  'media-server': [rr(3, 5, 18, 14, 2), 'M10 9L15 12L10 15Z', dot(6, 8)],
  nas: [rr(5, 3, 14, 18, 2), 'M8 7H16', 'M8 10.5H16', 'M8 14H16', dot(12, 17.5)],
  dante: [rr(7, 7, 10, 10, 2), 'M2.5 12H7', rr(17, 10, 2.5, 4, 0.5), 'M9.5 12H10.5L11.5 10L13 14L14 12H14.5'],
  'dante-card': [rr(3, 6.5, 14, 8.5, 1), 'M19.5 4.5V19.5', 'M17 9H19.5', 'M17 12.5H19.5', 'M6 15V18', 'M8.5 15V18', 'M11 15V18', 'M13.5 15V18', rr(6.5, 9, 4, 3.5, 0.5)],
  'audio-console': [rr(3, 5, 18, 14, 1.5), 'M7.5 8.5V15.5', 'M12 8.5V15.5', 'M16.5 8.5V15.5', 'M6.25 13H8.75', 'M10.75 10H13.25', 'M15.25 12H17.75'],
  speaker: [rr(6, 2.5, 12, 19, 2), circle(12, 14.5, 3.5), circle(12, 7, 1.25)],
  ptz: [circle(12, 10, 6), circle(12, 10, 2.5), 'M12 16V18', rr(7.5, 18, 9, 2.5, 1)],
  camera: ['M4 7.5H14.5L19.5 10V14L14.5 16.5H4A1 1 0 0 1 3 15.5V8.5A1 1 0 0 1 4 7.5Z', 'M7 16.5V20.5', 'M5 20.5H9', dot(16.5, 12)],
  encoder: [rr(3, 6, 18, 12, 2), 'M7.5 12H16', 'M13.5 9.5L16 12L13.5 14.5', dot(6, 9)],
  projector: [rr(2.5, 8, 19, 9, 2), circle(15.5, 12.5, 2.5), 'M6 11H9.5', 'M6 14H9.5', 'M5.5 17V19', 'M18.5 17V19'],
  display: [rr(3, 4, 18, 12.5, 1.5), 'M10 16.5L9.5 20', 'M14 16.5L14.5 20', 'M8 20H16'],
  'lighting-console': ['M3 18L5 8H19L21 18Z', dot(8, 11), dot(12, 11), dot(16, 11), 'M7.5 14.5H10', 'M14 14.5H16.5'],
  'dmx-node': [rr(4, 5, 16, 9, 1.5), 'M12 5V2.5', 'M8.5 14V16.5', 'M15.5 14V16.5', circle(8.5, 18.5, 2), circle(15.5, 18.5, 2), dot(8, 9.5)],
  'pixel-controller': [rr(3, 5, 18, 12, 1.5), 'M6 17V20.5', 'M10 17V20.5', 'M14 17V20.5', 'M18 17V20.5', dot(7, 11), dot(10.33, 11), dot(13.67, 11), dot(17, 11)],
  fixture: ['M8 4H16L14.5 12.5H9.5Z', 'M5.5 6.5V12.5A2 2 0 0 0 7.5 14.5H16.5A2 2 0 0 0 18.5 12.5V6.5', 'M12 14.5V18.5', rr(8.5, 18.5, 7, 2, 1)],
  'led-strip': [rr(2.5, 10, 19, 4.5, 1), dot(6, 12.25), dot(10, 12.25), dot(14, 12.25), dot(18, 12.25), 'M6 7.5V5.5', 'M10 7.5V5.5', 'M14 7.5V5.5', 'M18 7.5V5.5'],
  esp32: [rr(6, 2.5, 12, 19, 1.5), 'M8.5 6.5V4.5H10.5V6.5H12.5V4.5H14.5V6.5', rr(8.5, 10, 7, 7, 1), 'M3.5 9.5H6', 'M3.5 13H6', 'M3.5 16.5H6', 'M18 9.5H20.5', 'M18 13H20.5', 'M18 16.5H20.5'],
  chip: [rr(6, 6, 12, 12, 2), rr(9.5, 9.5, 5, 5, 0.75), 'M9 2.5V6', 'M12 2.5V6', 'M15 2.5V6', 'M9 18V21.5', 'M12 18V21.5', 'M15 18V21.5', 'M2.5 9H6', 'M2.5 12H6', 'M2.5 15H6', 'M18 9H21.5', 'M18 12H21.5', 'M18 15H21.5'],
  arduino: ['M4 6H17L20 9V18H4Z', rr(2, 9, 4, 3.5, 0.5), 'M8.5 9H15.5', 'M9 15H17', rr(10.5, 11, 3, 2, 0.4)],
  plc: [rr(6, 2.5, 12, 19, 1.5), 'M6 7H18', 'M6 17H18', 'M9 4.75V7', 'M12 4.75V7', 'M15 4.75V7', 'M9 17V19.25', 'M12 17V19.25', 'M15 17V19.25', dot(9.5, 12), dot(12, 12), 'M14 12H15'],
  raspberry: [rr(2.5, 5, 19, 14, 1.5), rr(16.5, 7.5, 5, 3.5, 0.5), rr(16.5, 13, 5, 3.5, 0.5), 'M5.5 7.5H13', rr(6, 11, 5.5, 4.5, 0.75)],
  broker: [circle(12, 12, 2.75), circle(5, 6, 1.75), circle(19, 6, 1.75), circle(5, 18, 1.75), circle(19, 18, 1.75), 'M6.5 7.1L9.9 10.2', 'M17.5 7.1L14.1 10.2', 'M6.5 16.9L9.9 13.8', 'M17.5 16.9L14.1 13.8'],
  lidar: [rr(7, 8, 10, 11, 2), 'M7 12.5H17', 'M12 2.5V5.5', 'M3 7L5.5 8.5', 'M21 7L18.5 8.5', 'M9.5 21.5H14.5'],
  'depth-camera': [rr(2.5, 8, 19, 7, 3.5), circle(7, 11.5, 1.75), circle(17, 11.5, 1.75), dot(12, 11.5), 'M12 15V19', 'M9 19.5H15'],
  generic: [rr(4, 5, 16, 14, 2), 'M8 15H16', dot(8, 9.5), 'M11 9.5H16']
}

export type UiIconName = 'search' | 'zone' | 'vlan' | 'devices' | 'sun' | 'moon' | 'system' | 'plus' | 'close' | 'bolt' | 'wifi' | 'chevron-down' | 'pin' | 'menu'
export type IconName = BuiltinIconName | UiIconName

export const UI_GLYPHS: Record<UiIconName, readonly string[]> = {
  search: [circle(10.5, 10.5, 6), 'M15 15L20.5 20.5'],
  zone: ['M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9', 'M15 4H18.5A1.5 1.5 0 0 1 20 5.5V9', 'M20 15V18.5A1.5 1.5 0 0 1 18.5 20H15', 'M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15'],
  vlan: ['M12 3.5L20.5 8L12 12.5L3.5 8Z', 'M3.5 12L12 16.5L20.5 12', 'M3.5 16L12 20.5L20.5 16'],
  devices: [rr(3.5, 3.5, 7, 7, 1.5), rr(13.5, 3.5, 7, 7, 1.5), rr(3.5, 13.5, 7, 7, 1.5), rr(13.5, 13.5, 7, 7, 1.5)],
  sun: [circle(12, 12, 4), 'M12 2.5V4.5', 'M12 19.5V21.5', 'M2.5 12H4.5', 'M19.5 12H21.5', 'M5.3 5.3L6.7 6.7', 'M17.3 17.3L18.7 18.7', 'M5.3 18.7L6.7 17.3', 'M17.3 6.7L18.7 5.3'],
  moon: ['M19.5 14.5A8 8 0 1 1 9.5 4.5A7.5 7.5 0 0 0 19.5 14.5Z'],
  system: [rr(3, 4.5, 18, 12, 1.5), 'M9 20H15', 'M12 16.5V20'],
  plus: ['M12 5V19', 'M5 12H19'],
  close: ['M6 6L18 18', 'M18 6L6 18'],
  bolt: ['M13 2.5L5.5 13H11.5L10.5 21.5L18.5 10.5H12.5Z'],
  wifi: ['M4.5 9.5A10.5 10.5 0 0 1 19.5 9.5', 'M7.5 12.75A6.25 6.25 0 0 1 16.5 12.75', dot(12, 16.5)],
  'chevron-down': ['M6 9L12 15L18 9'],
  pin: ['M9 3.5H15', 'M10 3.5V9.5L7 13.5H17L14 9.5V3.5', 'M12 13.5V20.5'],
  menu: ['M4 7H20', 'M4 12H20', 'M4 17H20']
}

export function isBuiltinIcon(name: string): name is BuiltinIconName {
  return Object.hasOwn(GLYPHS, name)
}

export const CATEGORY_ICON: Record<Category, BuiltinIconName> = {
  reseau: 'switch',
  ordinateur: 'laptop',
  audio: 'speaker',
  video: 'ptz',
  eclairage: 'fixture',
  iot: 'esp32',
  capteur: 'lidar',
  autre: 'generic'
}
