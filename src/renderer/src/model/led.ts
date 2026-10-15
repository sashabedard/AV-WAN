// src/renderer/src/model/led.ts
// Bandes LED (spec patch-puissance-catalogue § 5.3) : puissance et pixels. Fonctions pures, sans import :
// le catalogue et les migrations s'en servent, ce module reste une feuille du graphe d'imports.
import type { LedStrip, LedStripType } from './types'

const DMX_SLOTS = 512 // canaux d'un univers DMX (même valeur que model/dmx.ts)

export interface LedTypeInfo {
  label: string
  pixel: boolean
  volts: number // tension usuelle
  wPerM: number // W/m typique, pleine puissance
  pxPerM?: number // pixels adressables par mètre (types pixel)
  channelsPerPixel?: number // 3 (RGB) ou 4 (RGBW), types pixel
}

// Valeurs typiques (annexe B) : elles préremplissent, tout reste modifiable.
// Sources (vérifiées le 2026-10-14) : COB 10 W/m (24 V, 320 LED/m) : coolcomponents.co.uk/products/320-leds-per-meter-cob-led-strip-6500k-1-meter,
// gtv.com.pl/en/produkt/LD-COB24V-20-ZBN ; WS2811 14,4 W/m, 20 px/m : futurelight.co.za/products/led-addressable-strip-light,
// simplelighting.co.uk/digital-pixel-led-strip-light-chasing-effect-ws2811-14-4w ; WS2812B 18 W/m : botland.store (réf. 16608),
// derunledlights.com/ws2812b-dc5v-60leds-m-addressable-rgb-led-strip-lights ; SK6812 RGBW 18 W/m : shop.dmx4all.de/en/digital-led-stripe-rgbw-sk6812-60ws.html ;
// GS8208 14,4 W/m : luxalight.eu/sites/default/files/downloads/2021-12/Datasheet_LS12RGB60GS8208VPLX_1.pdf ; SMD RGBW 24 V 19,2 W/m : ph.rs-online.com/web/p/led-strip-lights/1845181 ;
// SMD RGB 12 V 14,4 W/m : idealed.abstore.pl (60 × 5050, 12 V). Les fiches divergent pour WS2815 (8 à 14 W/m), FCOB RGB (11,6 à 14 W/m) et COB CCT (aucune fiche trouvée) :
// valeurs typiques conservées pour ces types, à ajuster par l’utilisateur.
export const LED_STRIP_TYPES: Record<LedStripType, LedTypeInfo> = {
  cob: { label: 'COB mono', pixel: false, volts: 24, wPerM: 10 },
  'cob-cct': { label: 'COB CCT', pixel: false, volts: 24, wPerM: 12 },
  'fcob-rgb': { label: 'FCOB RGB', pixel: false, volts: 24, wPerM: 15 },
  'fcob-rgbw': { label: 'FCOB RGBW', pixel: false, volts: 24, wPerM: 18 },
  'smd-rgb': { label: 'SMD 5050 RGB', pixel: false, volts: 12, wPerM: 14.4 },
  'smd-rgbw': { label: 'SMD RGBW', pixel: false, volts: 24, wPerM: 19.2 },
  ws2811: { label: 'Pixel WS2811', pixel: true, volts: 12, wPerM: 14.4, pxPerM: 20, channelsPerPixel: 3 },
  ws2812b: { label: 'Pixel WS2812B', pixel: true, volts: 5, wPerM: 18, pxPerM: 60, channelsPerPixel: 3 },
  ws2815: { label: 'Pixel WS2815', pixel: true, volts: 12, wPerM: 14.4, pxPerM: 60, channelsPerPixel: 3 },
  'sk6812-rgbw': { label: 'Pixel RGBW (SK6812)', pixel: true, volts: 5, wPerM: 18, pxPerM: 60, channelsPerPixel: 4 },
  gs8208: { label: 'Pixel GS8208', pixel: true, volts: 12, wPerM: 14.4, pxPerM: 60, channelsPerPixel: 3 }
}

export const LED_VOLTAGES: readonly number[] = [5, 12, 24, 48]

const round1 = (n: number): number => Math.round(n * 10) / 10

export function stripPower(s: LedStrip): { watts: number; amps: number } | undefined {
  if (s.lengthM === undefined) return undefined
  const watts = round1(s.wPerM * s.lengthM)
  return { watts, amps: round1(watts / s.volts) }
}

export interface StripPixels {
  pixels: number
  channels: number
  perUniverse: number
  universes: number
  channelsPerPixel: number
}

// Un pixel n'est jamais coupé entre deux univers : 170 px RGB ou 128 px RGBW par univers.
export function stripPixels(s: LedStrip): StripPixels | undefined {
  const cpp = LED_STRIP_TYPES[s.type].channelsPerPixel
  if (cpp === undefined || s.pxPerM === undefined || s.lengthM === undefined) return undefined
  const pixels = Math.round(s.pxPerM * s.lengthM)
  const perUniverse = Math.floor(DMX_SLOTS / cpp)
  return { pixels, channels: pixels * cpp, perUniverse, universes: Math.ceil(pixels / perUniverse), channelsPerPixel: cpp }
}

export function stripWithType(s: LedStrip | undefined, type: LedStripType): LedStrip {
  const info = LED_STRIP_TYPES[type]
  return {
    type,
    volts: info.volts,
    wPerM: info.wPerM,
    ...(info.pxPerM !== undefined ? { pxPerM: info.pxPerM } : {}),
    ...(s?.lengthM !== undefined ? { lengthM: s.lengthM } : {})
  }
}
