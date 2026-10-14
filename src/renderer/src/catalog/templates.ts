import type { DeviceTemplate, IconRef } from '../model/types'
import type { BuiltinIconName } from './iconNames'
import { range, rj45, sfp, sfpPlus, simple, wifi } from './ports'
import { DEFAULT_SWITCH_SPEC } from './switch'

const ic = (name: BuiltinIconName): IconRef => ({ kind: 'builtin', name })

export const TEMPLATES: readonly DeviceTemplate[] = [
  // Réseau
  { id: 'switch', category: 'reseau', name: 'Switch', code: 'SW', icon: ic('switch'), ports: [], switch: DEFAULT_SWITCH_SPEC, defaults: { vlanId: 10 } },
  { id: 'gateway', category: 'reseau', name: 'Passerelle / routeur', code: 'GW', icon: ic('gateway'), ports: [rj45('WAN', { speedMbps: 2500 }), ...range('LAN', 1, 4).map((id) => rj45(id))], defaults: { vlanId: 10 } },
  { id: 'ap', category: 'reseau', name: "Point d'accès Wi-Fi", code: 'AP', icon: ic('ap'), ports: [rj45('ETH', { speedMbps: 2500, poeIn: 'at', poeDrawW: 21 }), wifi()], defaults: { vlanId: 10 } },
  { id: 'ptp-bridge', category: 'reseau', name: 'Pont sans fil point à point', code: 'PTP', icon: ic('ptp'), ports: [rj45('ETH', { poeDrawW: 11 }), { ...wifi(), id: 'AIR', label: 'Liaison radio' }] },
  { id: 'poe-injector', category: 'reseau', name: 'Injecteur PoE', code: 'INJ', icon: ic('injector'), ports: [rj45('IN', { label: 'DATA IN' }), rj45('OUT', { label: 'PoE OUT', poeOut: 'at' })] },
  { id: 'media-converter', category: 'reseau', name: 'Convertisseur de média', code: 'MC', icon: ic('converter'), ports: [rj45('ETH'), sfp('SFP')] },
  // Ordinateurs
  { id: 'laptop', category: 'ordinateur', name: 'Portable', code: 'PC', icon: ic('laptop'), ports: [rj45('ETH', { label: 'ETH (adapt.)' }), wifi(), simple('usb', 'USB1', 'USB-C')], defaults: { vlanId: 20 } },
  { id: 'media-pc', category: 'ordinateur', name: 'PC média (TouchDesigner, Resolume)', code: 'PC', icon: ic('desktop'), ports: [rj45('ETH1'), rj45('ETH2'), simple('usb', 'USB1'), simple('hdmi', 'HDMI1')], defaults: { vlanId: 40 } },
  { id: 'show-mac', category: 'ordinateur', name: 'Mac de régie (QLab)', code: 'MAC', icon: ic('mac'), ports: [rj45('ETH'), wifi(), simple('usb', 'USB1')], defaults: { vlanId: 20 } },
  { id: 'server', category: 'ordinateur', name: 'Serveur', code: 'SRV', icon: ic('server'), ports: [rj45('ETH1'), rj45('ETH2'), sfpPlus('SFP+1'), sfpPlus('SFP+2')], defaults: { vlanId: 80 } },
  { id: 'media-server', category: 'ordinateur', name: 'Serveur média', code: 'MS', icon: ic('media-server'), ports: [...range('ETH', 1, 4).map((id) => rj45(id)), simple('hdmi', 'OUT1'), simple('hdmi', 'OUT2')], defaults: { vlanId: 80 } },
  { id: 'nas', category: 'ordinateur', name: 'NAS', code: 'NAS', icon: ic('nas'), ports: [rj45('ETH1'), rj45('ETH2')], defaults: { vlanId: 80 } },
  // Audio
  { id: 'dante-avio', category: 'audio', name: 'Adaptateur Dante AVIO', code: 'DNT', icon: ic('dante'), ports: [rj45('ETH', { poeIn: 'af', poeDrawW: 2 })], defaults: { vlanId: 30 } },
  { id: 'dante-pcie', category: 'audio', name: 'Carte Dante PCIe', code: 'DNT', icon: ic('dante-card'), ports: [rj45('PRI', { label: 'Primaire' }), rj45('SEC', { label: 'Secondaire' })], defaults: { vlanId: 30 } },
  { id: 'dante-console', category: 'audio', name: 'Interface / console Dante', code: 'DNT', icon: ic('audio-console'), ports: [rj45('PRI', { label: 'Primaire' }), rj45('SEC', { label: 'Secondaire' })], defaults: { vlanId: 30 } },
  { id: 'dante-speaker', category: 'audio', name: 'Haut-parleur Dante PoE', code: 'SPK', icon: ic('speaker'), ports: [rj45('ETH', { poeIn: 'at', poeDrawW: 25 })], defaults: { vlanId: 30 } },
  // Vidéo
  { id: 'ptz-ndi', category: 'video', name: 'Caméra PTZ NDI', code: 'CAM', icon: ic('ptz'), ports: [rj45('ETH', { poeIn: 'at', poeDrawW: 25 }), simple('hdmi', 'HDMI'), simple('sdi', 'SDI')], defaults: { vlanId: 40 } },
  { id: 'ip-camera', category: 'video', name: 'Caméra IP', code: 'CAM', icon: ic('camera'), ports: [rj45('ETH', { poeIn: 'af', poeDrawW: 7 })], defaults: { vlanId: 70 } },
  { id: 'ndi-converter', category: 'video', name: 'Encodeur / décodeur NDI', code: 'NDI', icon: ic('encoder'), ports: [rj45('ETH', { poeIn: 'af', poeDrawW: 10 }), simple('hdmi', 'HDMI')], defaults: { vlanId: 40 } },
  { id: 'projector', category: 'video', name: 'Projecteur', code: 'PJ', icon: ic('projector'), ports: [rj45('ETH', { speedMbps: 100 }), simple('hdmi', 'HDMI'), simple('serial', 'RS232', 'RS-232')], defaults: { vlanId: 20 } },
  { id: 'display', category: 'video', name: 'Écran', code: 'DSP', icon: ic('display'), ports: [rj45('ETH', { speedMbps: 100 }), simple('hdmi', 'HDMI')], defaults: { vlanId: 20 } },
  // Éclairage
  { id: 'lighting-console', category: 'eclairage', name: "Console d'éclairage", code: 'LX', icon: ic('lighting-console'), ports: [rj45('ETH1'), rj45('ETH2'), simple('dmx', 'DMX-A', 'DMX A'), simple('dmx', 'DMX-B', 'DMX B')], defaults: { vlanId: 50 } },
  { id: 'dmx-node', category: 'eclairage', name: 'Nœud DMX (type ODE)', code: 'DMX', icon: ic('dmx-node'), ports: [rj45('ETH', { speedMbps: 100, poeIn: 'af', poeDrawW: 3 }), simple('dmx', 'DMX-1', 'DMX 1'), simple('dmx', 'DMX-2', 'DMX 2')], defaults: { vlanId: 50 } },
  { id: 'pixel-controller', category: 'eclairage', name: 'Contrôleur de pixels (type PixLite A4-S)', code: 'PIX', icon: ic('pixel-controller'), ports: [rj45('ETH1'), rj45('ETH2'), ...range('OUT', 1, 4).map((id) => simple('pixel', id)), simple('dmx', 'DMX')], defaults: { vlanId: 50 } },
  { id: 'dmx-fixture', category: 'eclairage', name: 'Appareil DMX', code: 'FIX', icon: ic('fixture'), ports: [simple('dmx', 'DMX-IN', 'DMX IN'), simple('dmx', 'DMX-OUT', 'DMX OUT')] },
  { id: 'led-strip', category: 'eclairage', name: 'Bande LED', code: 'LED', icon: ic('led-strip'), ports: [simple('pixel', 'IN')] },
  // IoT
  { id: 'esp32-devkit', category: 'iot', name: 'ESP32 DevKit (Wi-Fi)', code: 'IOT', icon: ic('esp32'), ports: [wifi(), simple('usb', 'USB')], defaults: { vlanId: 60 } },
  { id: 'esp32-poe', category: 'iot', name: 'ESP32-POE (Olimex)', code: 'IOT', icon: ic('esp32'), ports: [rj45('ETH', { speedMbps: 100, poeIn: 'af', poeDrawW: 2 }), wifi(), simple('usb', 'USB')], defaults: { vlanId: 60 } },
  { id: 'wt32-eth01', category: 'iot', name: 'WT32-ETH01', code: 'IOT', icon: ic('esp32'), ports: [rj45('ETH', { speedMbps: 100 }), wifi()], defaults: { vlanId: 60 } },
  { id: 'm5-atom-poe', category: 'iot', name: 'M5Stack Atom PoE', code: 'IOT', icon: ic('chip'), ports: [rj45('ETH', { speedMbps: 100, poeIn: 'af', poeDrawW: 2 })], defaults: { vlanId: 60 } },
  { id: 'arduino-r4-wifi', category: 'iot', name: 'Arduino Uno R4 WiFi', code: 'IOT', icon: ic('arduino'), ports: [wifi(), simple('usb', 'USB')], defaults: { vlanId: 60 } },
  { id: 'arduino-opta', category: 'iot', name: 'Arduino Opta', code: 'PLC', icon: ic('plc'), ports: [rj45('ETH', { speedMbps: 100 }), simple('serial', 'RS485', 'RS-485')], defaults: { vlanId: 60 } },
  { id: 'arduino-eth-shield', category: 'iot', name: 'Arduino + Ethernet Shield 2', code: 'IOT', icon: ic('arduino'), ports: [rj45('ETH', { speedMbps: 100 }), simple('usb', 'USB')], defaults: { vlanId: 60 } },
  { id: 'raspberry-pi-5', category: 'iot', name: 'Raspberry Pi 5', code: 'RPI', icon: ic('raspberry'), ports: [rj45('ETH'), wifi(), simple('usb', 'USB1'), simple('hdmi', 'HDMI')], defaults: { vlanId: 60 } },
  { id: 'mqtt-broker', category: 'iot', name: 'Broker MQTT (Mosquitto)', code: 'MQT', icon: ic('broker'), ports: [rj45('ETH')], defaults: { vlanId: 60 } },
  // Capteurs
  { id: 'lidar-eth', category: 'capteur', name: 'LiDAR Ethernet', code: 'LDR', icon: ic('lidar'), ports: [rj45('ETH', { speedMbps: 100 })], defaults: { vlanId: 60 } },
  { id: 'depth-cam-usb', category: 'capteur', name: 'Caméra de profondeur USB', code: 'DEP', icon: ic('depth-camera'), ports: [simple('usb', 'USB')] },
  { id: 'depth-cam-poe', category: 'capteur', name: 'Caméra de profondeur PoE+', code: 'DEP', icon: ic('depth-camera'), ports: [rj45('ETH', { poeIn: 'at', poeDrawW: 13 })], defaults: { vlanId: 60 } },
  // Autre
  { id: 'generic', category: 'autre', name: 'Appareil générique', code: 'GEN', icon: ic('generic'), ports: [rj45('ETH')] }
]

export const TEMPLATES_BY_ID: ReadonlyMap<string, DeviceTemplate> = new Map(TEMPLATES.map((t) => [t.id, t]))
