import type { DeviceTemplate } from '../model/types'
import { ic } from './ic'
import { stripWithType } from '../model/led'
import { dmxThru, patchPanelPorts, range, rj45, sfp, sfpPlus, simple, wifi } from './ports'
import { DEFAULT_SWITCH_SPEC } from './switch'
import { SENSOR_MODELS } from './models/capteurs'
import { LIGHTING_MODELS } from './models/eclairage'
import { VIDEO_MODELS } from './models/video'
import { AUDIO_MODELS } from './models/audio'

const BASE_TEMPLATES: readonly DeviceTemplate[] = [
  // Réseau
  { id: 'switch', category: 'reseau', name: { fr: 'Switch', en: 'Switch' }, code: 'SW', icon: ic('switch'), ports: [], switch: DEFAULT_SWITCH_SPEC, defaults: { vlanId: 10 } },
  { id: 'gateway', category: 'reseau', name: { fr: 'Passerelle / routeur', en: 'Gateway / router' }, code: 'GW', icon: ic('gateway'), ports: [rj45('WAN', { speedMbps: 2500 }), ...range('LAN', 1, 4).map((id) => rj45(id))], defaults: { vlanId: 10 } },
  { id: 'ap', category: 'reseau', name: { fr: "Point d'accès Wi-Fi", en: "Wi-Fi access point" }, code: 'AP', icon: ic('ap'), ports: [rj45('ETH', { speedMbps: 2500, poeIn: 'at', poeDrawW: 21 }), wifi()], defaults: { vlanId: 10 } },
  // PoE passif 24/48 V non modélisé (amendement 3) : pas de consommation affichée.
  { id: 'ptp-bridge', category: 'reseau', name: { fr: 'Pont sans fil point à point', en: 'Point-to-point wireless bridge' }, code: 'PTP', icon: ic('ptp'), ports: [rj45('ETH'), { ...wifi(), id: 'AIR', label: { fr: 'Liaison radio', en: 'Radio link' } }] },
  { id: 'poe-injector', category: 'reseau', name: { fr: 'Injecteur PoE', en: 'PoE injector' }, code: 'INJ', icon: ic('injector'), ports: [rj45('IN', { label: 'DATA IN' }), rj45('OUT', { label: 'PoE OUT', poeOut: 'at' })] },
  { id: 'media-converter', category: 'reseau', name: { fr: 'Convertisseur de média', en: 'Media converter' }, code: 'MC', icon: ic('converter'), ports: [rj45('ETH'), sfp('SFP')] },
  { id: 'patch-panel-24', category: 'reseau', name: { fr: 'Panneau de brassage 24', en: 'Patch panel 24' }, code: 'PP', icon: ic('patch-panel'), ports: patchPanelPorts(24) },
  // Ordinateurs
  { id: 'laptop', category: 'ordinateur', name: { fr: 'Portable', en: 'Laptop' }, code: 'PC', icon: ic('laptop'), ports: [rj45('ETH', { label: { fr: 'ETH (adapt.)', en: 'ETH (adapter)' } }), wifi(), simple('usb', 'USB1', 'USB-C')], defaults: { vlanId: 20 } },
  { id: 'media-pc', category: 'ordinateur', name: { fr: 'PC média (TouchDesigner, Resolume)', en: 'Media PC (TouchDesigner, Resolume)' }, code: 'PC', icon: ic('desktop'), ports: [rj45('ETH1'), rj45('ETH2'), simple('usb', 'USB1'), simple('hdmi', 'HDMI1')], defaults: { vlanId: 40 } },
  { id: 'show-mac', category: 'ordinateur', name: { fr: 'Mac de régie (QLab)', en: 'Show Mac (QLab)' }, code: 'MAC', icon: ic('mac'), ports: [rj45('ETH'), wifi(), simple('usb', 'USB1')], defaults: { vlanId: 20 } },
  { id: 'server', category: 'ordinateur', name: { fr: 'Serveur', en: 'Server' }, code: 'SRV', icon: ic('server'), ports: [rj45('ETH1'), rj45('ETH2'), sfpPlus('SFP+1'), sfpPlus('SFP+2')], defaults: { vlanId: 80 } },
  { id: 'media-server', category: 'ordinateur', name: { fr: 'Serveur média', en: 'Media server' }, code: 'MS', icon: ic('media-server'), ports: [...range('ETH', 1, 4).map((id) => rj45(id)), simple('hdmi', 'OUT1'), simple('hdmi', 'OUT2')], defaults: { vlanId: 80 } },
  { id: 'nas', category: 'ordinateur', name: { fr: 'NAS', en: 'NAS' }, code: 'NAS', icon: ic('nas'), ports: [rj45('ETH1'), rj45('ETH2')], defaults: { vlanId: 80 } },
  // Audio
  { id: 'dante-avio', category: 'audio', name: { fr: 'Adaptateur Dante AVIO', en: 'Dante AVIO adapter' }, code: 'DNT', icon: ic('dante'), ports: [rj45('ETH', { poeIn: 'af', poeDrawW: 2 })], defaults: { vlanId: 30 } },
  { id: 'dante-pcie', category: 'audio', name: { fr: 'Carte Dante PCIe', en: 'Dante PCIe card' }, code: 'DNT', icon: ic('dante-card'), ports: [rj45('PRI', { label: { fr: 'Primaire', en: 'Primary' } }), rj45('SEC', { label: { fr: 'Secondaire', en: 'Secondary' } })], defaults: { vlanId: 30 } },
  { id: 'dante-console', category: 'audio', name: { fr: 'Interface / console Dante', en: 'Dante interface / console' }, code: 'DNT', icon: ic('audio-console'), ports: [rj45('PRI', { label: { fr: 'Primaire', en: 'Primary' } }), rj45('SEC', { label: { fr: 'Secondaire', en: 'Secondary' } })], defaults: { vlanId: 30 } },
  { id: 'dante-speaker', category: 'audio', name: { fr: 'Haut-parleur Dante PoE', en: 'Dante PoE speaker' }, code: 'SPK', icon: ic('speaker'), ports: [rj45('ETH', { poeIn: 'at', poeDrawW: 25 })], defaults: { vlanId: 30 } },
  // Vidéo
  { id: 'ptz-ndi', category: 'video', name: { fr: 'Caméra PTZ NDI', en: 'NDI PTZ camera' }, code: 'CAM', icon: ic('ptz'), ports: [rj45('ETH', { poeIn: 'at', poeDrawW: 25 }), simple('hdmi', 'HDMI'), simple('sdi', 'SDI')], defaults: { vlanId: 40 } },
  { id: 'ip-camera', category: 'video', name: { fr: 'Caméra IP', en: 'IP camera' }, code: 'CAM', icon: ic('camera'), ports: [rj45('ETH', { poeIn: 'af', poeDrawW: 7 })], defaults: { vlanId: 70 } },
  { id: 'ndi-converter', category: 'video', name: { fr: 'Encodeur / décodeur NDI', en: 'NDI encoder / decoder' }, code: 'NDI', icon: ic('encoder'), ports: [rj45('ETH', { poeIn: 'af', poeDrawW: 10 }), simple('hdmi', 'HDMI')], defaults: { vlanId: 40 } },
  { id: 'projector', category: 'video', name: { fr: 'Projecteur', en: 'Projector' }, code: 'PJ', icon: ic('projector'), ports: [rj45('ETH', { speedMbps: 100 }), simple('hdmi', 'HDMI'), simple('serial', 'RS232', 'RS-232')], defaults: { vlanId: 20 } },
  { id: 'display', category: 'video', name: { fr: 'Écran', en: 'Display' }, code: 'DSP', icon: ic('display'), ports: [rj45('ETH', { speedMbps: 100 }), simple('hdmi', 'HDMI')], defaults: { vlanId: 20 } },
  // Éclairage
  { id: 'lighting-console', category: 'eclairage', name: { fr: "Console d'éclairage", en: "Lighting console" }, code: 'LX', icon: ic('lighting-console'), ports: [rj45('ETH1'), rj45('ETH2'), simple('dmx', 'DMX-A', 'DMX A'), simple('dmx', 'DMX-B', 'DMX B')], defaults: { vlanId: 50 } },
  { id: 'dmx-node', category: 'eclairage', name: { fr: 'Nœud DMX (type ODE)', en: 'DMX node (ODE type)' }, code: 'DMX', icon: ic('dmx-node'), ports: [rj45('ETH', { speedMbps: 100, poeIn: 'af', poeDrawW: 3 }), simple('dmx', 'DMX-1', 'DMX 1'), simple('dmx', 'DMX-2', 'DMX 2')], defaults: { vlanId: 50 } },
  { id: 'pixel-controller', category: 'eclairage', name: { fr: 'Contrôleur de pixels (type PixLite A4-S)', en: 'Pixel controller (PixLite A4-S type)' }, code: 'PIX', icon: ic('pixel-controller'), ports: [rj45('ETH1'), rj45('ETH2'), ...range('OUT', 1, 4).map((id) => simple('pixel', id)), simple('dmx', 'DMX')], defaults: { vlanId: 50 } },
  { id: 'dmx-fixture', category: 'eclairage', name: { fr: 'Appareil DMX', en: 'DMX fixture' }, code: 'FIX', icon: ic('fixture'), ports: [simple('dmx', 'DMX-IN', 'DMX IN'), simple('dmx', 'DMX-OUT', 'DMX OUT')], dmx: { footprint: 1 } },
  { id: 'led-strip', category: 'eclairage', name: { fr: 'Bande LED', en: 'LED strip' }, code: 'LED', icon: ic('led-strip'), ports: [simple('pixel', 'IN'), simple('dc', 'DC-IN', 'DC IN')], ledStrip: { ...stripWithType(undefined, 'ws2812b'), lengthM: 5 } },
  // Génériques (spec § 7.1) : patchables avec des canaux typiques ; le mode réel se règle dans l’inspecteur. Pas de watts inventés.
  { id: 'moving-spot', category: 'eclairage', name: { fr: 'Lyre spot', en: 'Moving head spot' }, code: 'MH', icon: ic('moving-head'), ports: dmxThru(), dmx: { footprint: 16 }, defaults: { vlanId: 50 } },
  { id: 'moving-wash', category: 'eclairage', name: { fr: 'Lyre wash', en: 'Moving head wash' }, code: 'WSH', icon: ic('moving-head'), ports: dmxThru(), dmx: { footprint: 16 }, defaults: { vlanId: 50 } },
  { id: 'moving-beam', category: 'eclairage', name: { fr: 'Lyre beam', en: 'Moving head beam' }, code: 'BM', icon: ic('moving-head'), ports: dmxThru(), dmx: { footprint: 16 }, defaults: { vlanId: 50 } },
  { id: 'par-led', category: 'eclairage', name: { fr: 'PAR LED', en: 'PAR LED' }, code: 'PAR', icon: ic('par'), ports: dmxThru(), dmx: { footprint: 8 }, defaults: { vlanId: 50 } },
  { id: 'led-batten', category: 'eclairage', name: { fr: 'Barre LED', en: 'LED batten' }, code: 'BAR', icon: ic('led-strip'), ports: dmxThru(), dmx: { footprint: 12 }, defaults: { vlanId: 50 } },
  { id: 'profile-led', category: 'eclairage', name: { fr: 'Découpe LED', en: 'LED profile' }, code: 'PRF', icon: ic('fixture'), ports: dmxThru(), dmx: { footprint: 5 }, defaults: { vlanId: 50 } },
  { id: 'strobe', category: 'eclairage', name: { fr: 'Stroboscope', en: 'Strobe' }, code: 'STR', icon: ic('strobe'), ports: dmxThru(), dmx: { footprint: 4 }, defaults: { vlanId: 50 } },
  { id: 'hazer', category: 'eclairage', name: { fr: 'Machine à brume', en: 'Hazer' }, code: 'HZ', icon: ic('fog'), ports: dmxThru(), dmx: { footprint: 2 }, defaults: { vlanId: 50 } },
  { id: 'fog-machine', category: 'eclairage', name: { fr: 'Machine à fumée', en: 'Fog machine' }, code: 'FOG', icon: ic('fog'), ports: dmxThru(), dmx: { footprint: 1 }, defaults: { vlanId: 50 } },
  // IoT
  { id: 'esp32-devkit', category: 'iot', name: { fr: 'ESP32 DevKit (Wi-Fi)', en: 'ESP32 DevKit (Wi-Fi)' }, code: 'IOT', icon: ic('esp32'), ports: [wifi(), simple('usb', 'USB')], defaults: { vlanId: 60 } },
  { id: 'esp32-poe', category: 'iot', name: { fr: 'ESP32-POE (Olimex)', en: 'ESP32-POE (Olimex)' }, code: 'IOT', icon: ic('esp32'), ports: [rj45('ETH', { speedMbps: 100, poeIn: 'af', poeDrawW: 2 }), wifi(), simple('usb', 'USB')], defaults: { vlanId: 60 } },
  { id: 'wt32-eth01', category: 'iot', name: { fr: 'WT32-ETH01', en: 'WT32-ETH01' }, code: 'IOT', icon: ic('esp32'), ports: [rj45('ETH', { speedMbps: 100 }), wifi()], defaults: { vlanId: 60 } },
  { id: 'm5-atom-poe', category: 'iot', name: { fr: 'M5Stack Atom PoE', en: 'M5Stack Atom PoE' }, code: 'IOT', icon: ic('chip'), ports: [rj45('ETH', { speedMbps: 100, poeIn: 'af', poeDrawW: 2 })], defaults: { vlanId: 60 } },
  { id: 'arduino-r4-wifi', category: 'iot', name: { fr: 'Arduino Uno R4 WiFi', en: 'Arduino Uno R4 WiFi' }, code: 'IOT', icon: ic('arduino'), ports: [wifi(), simple('usb', 'USB')], defaults: { vlanId: 60 } },
  { id: 'arduino-opta', category: 'iot', name: { fr: 'Arduino Opta', en: 'Arduino Opta' }, code: 'PLC', icon: ic('plc'), ports: [rj45('ETH', { speedMbps: 100 }), simple('serial', 'RS485', 'RS-485')], defaults: { vlanId: 60 } },
  { id: 'arduino-eth-shield', category: 'iot', name: { fr: 'Arduino + Ethernet Shield 2', en: 'Arduino + Ethernet Shield 2' }, code: 'IOT', icon: ic('arduino'), ports: [rj45('ETH', { speedMbps: 100 }), simple('usb', 'USB')], defaults: { vlanId: 60 } },
  { id: 'raspberry-pi-5', category: 'iot', name: { fr: 'Raspberry Pi 5', en: 'Raspberry Pi 5' }, code: 'RPI', icon: ic('raspberry'), ports: [rj45('ETH'), wifi(), simple('usb', 'USB1'), simple('hdmi', 'HDMI')], defaults: { vlanId: 60 } },
  { id: 'mqtt-broker', category: 'iot', name: { fr: 'Broker MQTT (Mosquitto)', en: 'MQTT broker (Mosquitto)' }, code: 'MQT', icon: ic('broker'), ports: [rj45('ETH')], defaults: { vlanId: 60 } },
  // Capteurs
  { id: 'lidar-eth', category: 'capteur', name: { fr: 'LiDAR Ethernet', en: 'Ethernet LiDAR' }, code: 'LDR', icon: ic('lidar'), ports: [rj45('ETH', { speedMbps: 100 })], defaults: { vlanId: 60 } },
  { id: 'depth-cam-usb', category: 'capteur', name: { fr: 'Caméra de profondeur USB', en: 'USB depth camera' }, code: 'DEP', icon: ic('depth-camera'), ports: [simple('usb', 'USB')] },
  { id: 'depth-cam-poe', category: 'capteur', name: { fr: 'Caméra de profondeur PoE+', en: 'PoE+ depth camera' }, code: 'DEP', icon: ic('depth-camera'), ports: [rj45('ETH', { poeIn: 'at', poeDrawW: 13 })], defaults: { vlanId: 60 } },
  // Autre
  // Alimentation basse tension (spec § 5.2) : 24 V de départ, courant et puissance à taper (pas de capacité inventée).
  { id: 'psu', category: 'autre', name: { fr: 'Alimentation', en: 'Power supply' }, code: 'PSU', icon: ic('psu'), ports: range('DC-OUT-', 1, 4).map((id, i) => simple('dc', id, `DC OUT ${i + 1}`)), psu: { volts: 24 } },
  { id: 'generic', category: 'autre', name: { fr: 'Appareil générique', en: 'Generic device' }, code: 'GEN', icon: ic('generic'), ports: [rj45('ETH')] }
]

export const TEMPLATES: readonly DeviceTemplate[] = [...BASE_TEMPLATES, ...SENSOR_MODELS, ...LIGHTING_MODELS, ...VIDEO_MODELS, ...AUDIO_MODELS]

export const TEMPLATES_BY_ID: ReadonlyMap<string, DeviceTemplate> = new Map(TEMPLATES.map((t) => [t.id, t]))

// Gabarits dessinés comme une façade de rack (en plus des switchs, reconnus à leur spec).
export const RACK_TEMPLATE_IDS: ReadonlySet<string> = new Set(['patch-panel-24'])

// Panneaux de brassage : la prise avant An et la prise arrière Rn sont reliées dans le panneau.
export const PATCH_PANEL_TEMPLATE_IDS: ReadonlySet<string> = new Set(['patch-panel-24'])
