// Libellés du catalogue indexés par identifiant (catégories, câbles, connecteurs, PoE). Les identifiants restent les clés enregistrées.
export const catalog = {
  categories: {
    reseau: 'Réseau',
    ordinateur: 'Ordinateurs',
    audio: 'Audio',
    video: 'Vidéo',
    eclairage: 'Éclairage',
    iot: 'IoT',
    capteur: 'Capteurs',
    autre: 'Autre'
  },
  media: {
    cat5e: 'Cat5e', cat6: 'Cat6', cat6a: 'Cat6A', om3: 'Fibre OM3', om4: 'Fibre OM4', os2: 'Fibre OS2', dac: 'DAC',
    wifi: 'Wi-Fi', usb: 'USB', dmx: 'DMX', pixel: 'Pixels', hdmi: 'HDMI', sdi: 'SDI', serial: 'Série', dc: 'Alim DC'
  },
  connectors: {
    rj45: 'RJ45', sfp: 'SFP', 'sfp+': 'SFP+', wifi: 'Wi-Fi', usb: 'USB', dmx: 'DMX', pixel: 'Pixels', hdmi: 'HDMI', sdi: 'SDI', serial: 'Série', dc: 'Alim DC'
  },
  poeChoices: {
    none: 'Aucun',
    'in-af': 'Reçoit PoE (af)',
    'in-at': 'Reçoit PoE+ (at)',
    'in-bt': 'Reçoit PoE++ (bt)',
    'out-af': 'Fournit PoE (af)',
    'out-at': 'Fournit PoE+ (at)',
    'out-bt': 'Fournit PoE++ (bt)'
  },
  poeSpec: { none: 'Aucun', af: 'PoE', at: 'PoE+', bt: 'PoE++' },
  switchPorts: (p: { n: number }) => `${p.n} ports`,
  proAvProfile: 'Profil de port ProAV'
} as const
