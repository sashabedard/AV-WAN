// src/renderer/src/catalog/search.ts
import type { DeviceTemplate } from '../model/types'
import { CATEGORY_LABELS } from './categories'
import { TEMPLATES } from './templates'

// Marques, logiciels et synonymes : on cherche un appareil comme on en parle en régie.
const KEYWORDS: Readonly<Record<string, string>> = {
  switch: 'commutateur unifi poe',
  gateway: 'routeur router udm wan',
  ap: 'wifi borne antenne unifi',
  'ptp-bridge': 'antenne liaison radio airmax',
  'poe-injector': 'alimentation',
  'media-converter': 'fibre sfp',
  'patch-panel-24': 'brassage patch keystone',
  laptop: 'ordinateur portable macbook',
  'media-pc': 'touchdesigner resolume notch',
  'show-mac': 'qlab mac regie',
  server: 'serveur',
  'media-server': 'disguise pixera watchout',
  nas: 'stockage synology',
  'dante-avio': 'audinate avio',
  'dante-pcie': 'audinate pcie',
  'dante-console': 'audinate console mixage',
  'dante-speaker': 'audinate enceinte',
  'ptz-ndi': 'ptz ndi camera',
  'ip-camera': 'camera surveillance',
  'ndi-converter': 'ndi encodeur decodeur birddog',
  projector: 'videoprojecteur',
  display: 'ecran moniteur tele',
  'lighting-console': 'grandma eos console eclairage',
  'dmx-node': 'artnet sacn ode enttec',
  'pixel-controller': 'advatek pixlite pixels',
  'dmx-fixture': 'projecteur asservi par',
  'led-strip': 'ruban pixels ws2812',
  'esp32-devkit': 'espressif wifi',
  'esp32-poe': 'olimex espressif',
  'wt32-eth01': 'espressif ethernet',
  'm5-atom-poe': 'm5stack',
  'arduino-r4-wifi': 'uno',
  'arduino-opta': 'automate plc rs485',
  'arduino-eth-shield': 'ethernet',
  'raspberry-pi-5': 'rpi pi',
  'mqtt-broker': 'mosquitto',
  'lidar-eth': 'ouster hokuyo',
  'depth-cam-usb': 'kinect realsense orbbec',
  'depth-cam-poe': 'orbbec femto',
  generic: 'autre'
}

const BOUNDARY = /[\s()/·,.-]/

export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function haystack(t: DeviceTemplate): string {
  return normalizeText(
    [t.name, t.code, t.id.replace(/-/g, ' '), CATEGORY_LABELS[t.category], t.vendor ?? '', t.model ?? '', KEYWORDS[t.id] ?? ''].join(' ')
  )
}

// 3 : début de mot · 2 : au milieu d'un mot · 1 : lettres dans l'ordre · 0 : absent.
function tokenScore(token: string, hay: string): number {
  let best = 0
  for (let at = hay.indexOf(token); at >= 0; at = hay.indexOf(token, at + 1)) {
    best = Math.max(best, at === 0 || BOUNDARY.test(hay[at - 1]!) ? 3 : 2)
    if (best === 3) return 3
  }
  if (best > 0) return best
  let i = 0
  for (const ch of hay) {
    if (ch === token[i]) i++
    if (i === token.length) return 1
  }
  return 0
}

export function searchTemplates(query: string, templates: readonly DeviceTemplate[] = TEMPLATES): DeviceTemplate[] {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return [...templates]
  const hits: Array<{ t: DeviceTemplate; score: number; index: number }> = []
  templates.forEach((t, index) => {
    const hay = haystack(t)
    let score = 0
    for (const token of tokens) {
      const s = tokenScore(token, hay)
      if (s === 0) return
      score += s
    }
    hits.push({ t, score, index })
  })
  return hits.sort((a, b) => b.score - a.score || a.index - b.index).map((h) => h.t)
}
