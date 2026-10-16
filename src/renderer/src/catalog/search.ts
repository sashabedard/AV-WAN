// src/renderer/src/catalog/search.ts
import type { DeviceTemplate } from '../model/types'
import { categoryLabel } from './categories'
import { messages } from '../../../shared/i18n/messages'
import type { TemplateText } from '../model/types'
import { TEMPLATES } from './templates'

// Marques, logiciels et synonymes : on cherche un appareil comme on en parle en régie.
const KEYWORDS: Readonly<Record<'fr' | 'en', Readonly<Record<string, string>>>> = {
  fr: {
    switch: 'commutateur unifi poe',
    gateway: 'routeur router udm wan',
    ap: 'wifi borne antenne unifi',
    'ptp-bridge': 'antenne liaison radio airmax',
    'poe-injector': 'injecteur poe midspan',
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
    'moving-spot': 'lyre moving head asservi spot gobo',
    'moving-wash': 'lyre moving head asservi wash',
    'moving-beam': 'lyre moving head asservi beam',
    'par-led': 'par projecteur rgbw',
    'led-batten': 'barre rampe batten',
    'profile-led': 'decoupe profile ellipsoidal',
    strobe: 'strobe flash',
    hazer: 'brume haze hazer',
    'fog-machine': 'fumee fog smoke',
    'led-strip': 'ruban pixels ws2812 ws2815 sk6812 cob fcob rgbw smd',
    psu: 'alimentation alim bloc mean well transfo 12v 24v 48v dc',
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
    generic: 'autre',
    // Modèles nommés : les écritures courantes que le nom ne contient pas.
    'shure-ulxd4d': 'ulx-d ulxd ulxd4d',
    'disguise-vx-4': 'vx4'
  },
  en: {
    switch: 'switch unifi poe managed',
    gateway: 'gateway router udm wan firewall',
    ap: 'access point wifi antenna unifi',
    'ptp-bridge': 'antenna radio link wireless bridge airmax',
    'poe-injector': 'injector poe midspan',
    'media-converter': 'fiber sfp',
    'patch-panel-24': 'patching patch keystone',
    laptop: 'portable computer macbook',
    'media-pc': 'touchdesigner resolume notch',
    'show-mac': 'qlab mac control',
    server: 'server',
    'media-server': 'disguise pixera watchout',
    nas: 'storage synology',
    'dante-avio': 'audinate avio',
    'dante-pcie': 'audinate pcie',
    'dante-console': 'audinate console mixer mixing',
    'dante-speaker': 'audinate speaker loudspeaker',
    'ptz-ndi': 'ptz ndi camera',
    'ip-camera': 'camera surveillance cctv',
    'ndi-converter': 'ndi encoder decoder birddog',
    projector: 'projector beamer',
    display: 'screen monitor tv',
    'lighting-console': 'grandma eos console lighting desk',
    'dmx-node': 'artnet sacn ode enttec',
    'pixel-controller': 'advatek pixlite pixels',
    'dmx-fixture': 'fixture light',
    'moving-spot': 'moving head spot gobo',
    'moving-wash': 'moving head wash',
    'moving-beam': 'moving head beam',
    'par-led': 'par can rgbw',
    'led-batten': 'bar batten',
    'profile-led': 'profile ellipsoidal',
    strobe: 'strobe flash',
    hazer: 'haze hazer',
    'fog-machine': 'fog smoke',
    'led-strip': 'tape pixels ws2812 ws2815 sk6812 cob fcob rgbw smd',
    psu: 'power supply psu mean well transformer 12v 24v 48v dc',
    'esp32-devkit': 'espressif wifi',
    'esp32-poe': 'olimex espressif',
    'wt32-eth01': 'espressif ethernet',
    'm5-atom-poe': 'm5stack',
    'arduino-r4-wifi': 'uno',
    'arduino-opta': 'plc controller rs485',
    'arduino-eth-shield': 'ethernet',
    'raspberry-pi-5': 'rpi pi',
    'mqtt-broker': 'mosquitto',
    'lidar-eth': 'ouster hokuyo',
    'depth-cam-usb': 'kinect realsense orbbec',
    'depth-cam-poe': 'orbbec femto',
    generic: 'other',
    // Named models: common spellings the name does not contain.
    'shure-ulxd4d': 'ulx-d ulxd ulxd4d',
    'disguise-vx-4': 'vx4'
  }
}

const BOUNDARY = /[\s()/·,.-]/

export function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

const LANGS = ['fr', 'en'] as const

const textIn = (text: TemplateText, lang: (typeof LANGS)[number]): string => (typeof text === 'string' ? text : text[lang])

// Un texte à chercher par langue : on trouve « lyre » en français et « moving head » en anglais, quelle que soit la langue de l'interface.
// Les deux textes restent séparés pour que la recherche approximative ne mélange pas des lettres de deux langues.
function haystacks(t: DeviceTemplate): string[] {
  return LANGS.map((lang) =>
    normalizeText([textIn(t.name, lang), t.code, t.id.replace(/-/g, ' '), categoryLabel(t.category, messages(lang)), t.vendor ?? '', t.model ?? '', KEYWORDS[lang][t.id] ?? ''].join(' '))
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
    let best = 0
    for (const hay of haystacks(t)) {
      let score = 0
      for (const token of tokens) {
        const s = tokenScore(token, hay)
        if (s === 0) {
          score = 0
          break
        }
        score += s
      }
      best = Math.max(best, score)
    }
    if (best > 0) hits.push({ t, score: best, index })
  })
  return hits.sort((a, b) => b.score - a.score || a.index - b.index).map((h) => h.t)
}
