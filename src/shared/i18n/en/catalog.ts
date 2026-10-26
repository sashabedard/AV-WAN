import type { Messages } from '../messages'

export const catalog: Messages['catalog'] = {
  categories: {
    reseau: 'Network',
    ordinateur: 'Computers',
    audio: 'Audio',
    video: 'Video',
    eclairage: 'Lighting',
    iot: 'IoT',
    capteur: 'Sensors',
    autre: 'Other'
  },
  media: {
    cat5e: 'Cat5e', cat6: 'Cat6', cat6a: 'Cat6A', om3: 'OM3 fiber', om4: 'OM4 fiber', os2: 'OS2 fiber', dac: 'DAC',
    wifi: 'Wi-Fi', usb: 'USB', dmx: 'DMX', pixel: 'Pixels', hdmi: 'HDMI', sdi: 'SDI', serial: 'Serial', dc: 'DC power', displayport: 'DisplayPort'
  },
  connectors: {
    rj45: 'RJ45', sfp: 'SFP', 'sfp+': 'SFP+', wifi: 'Wi-Fi', usb: 'USB', dmx: 'DMX', pixel: 'Pixels', hdmi: 'HDMI', sdi: 'SDI', serial: 'Serial', dc: 'DC power', displayport: 'DisplayPort'
  },
  poeChoices: {
    none: 'None',
    'in-af': 'Receives PoE (af)',
    'in-at': 'Receives PoE+ (at)',
    'in-bt': 'Receives PoE++ (bt)',
    'out-af': 'Provides PoE (af)',
    'out-at': 'Provides PoE+ (at)',
    'out-bt': 'Provides PoE++ (bt)'
  },
  poeSpec: { none: 'None', af: 'PoE', at: 'PoE+', bt: 'PoE++' },
  switchPorts: (p) => `${p.n} ports`,
  proAvProfile: 'ProAV port profile'
}
