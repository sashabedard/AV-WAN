// Audio et show control nommés (spec patch-puissance-catalogue § 7). Chaque valeur vient de la source citée au-dessus du gabarit.
import type { DeviceTemplate } from '../../model/types'
import { ic } from '../ic'
import { range, rj45, simple } from '../ports'

// Prises Dante d’un appareil à interface redondante (convention du catalogue de base).
const dantePair = () => [rj45('PRI', { label: 'Primaire' }), rj45('SEC', { label: 'Secondaire' })]

export const AUDIO_MODELS: readonly DeviceTemplate[] = [
  // Source : https://in.yamaha.com/en/products/proaudio/interfaces/r_series_adda_2/specs.html (fiche du fabricant, consultée le 2026-10-14)
  // Dante « Primary/Secondary », 1000Base-T, etherCON Cat5e ; consommation 72 W.
  {
    id: 'yamaha-rio1608-d2',
    category: 'audio',
    name: 'Stagebox Dante Yamaha Rio1608-D2',
    code: 'STB',
    vendor: 'Yamaha',
    model: 'Yamaha Rio1608-D2',
    icon: ic('stagebox'),
    ports: dantePair(),
    powerW: 72,
    defaults: { vlanId: 30 },
    note: 'Dante primaire et secondaire (etherCON).'
  },
  // Source : https://usa.yamaha.com/products/proaudio/mixers/dm3/specs.html (fiche du fabricant, consultée le 2026-10-14)
  // Dante 2 × etherCON « Primary/Secondary » (DM3-D seulement), réseau 1 × RJ-45, USB to Host 1 × Type-B (USB 2.0), USB to Device 1 × Type-A ; consommation 43 W.
  {
    id: 'yamaha-dm3',
    category: 'audio',
    name: 'Console Yamaha DM3-D',
    code: 'MIX',
    vendor: 'Yamaha',
    model: 'Yamaha DM3-D',
    icon: ic('audio-console'),
    ports: [
      ...dantePair(),
      rj45('NET', { label: 'Réseau' }),
      simple('usb', 'USB-HOST', 'USB TO HOST'),
      simple('usb', 'USB-DEV', 'USB TO DEVICE')
    ],
    powerW: 43,
    defaults: { vlanId: 30 },
    note: 'Variante Dante (DM3-D) ; la DM3 Standard n’a pas de Dante. La fiche ne précise pas la vitesse du port réseau.'
  },
  // Source : https://www.allen-heath.com/content/uploads/2023/05/SQ-5-Technical-Datasheet_G.pdf (fiche du fabricant : réseau Fast Ethernet 100 Mbit/s, consommation max 75 W)
  // et https://www.allen-heath.com/content/uploads/2023/06/SQ-Dante-V2-Cut-Sheet.pdf (carte Dante : commutateur Gigabit intégré, 2 ports etherCON redondants ou en mode commutateur) (consultées le 2026-10-14)
  {
    id: 'ah-sq5-dante',
    category: 'audio',
    name: 'Console Allen & Heath SQ-5 (carte Dante)',
    code: 'MIX',
    vendor: 'Allen & Heath',
    model: 'Allen & Heath SQ-5 + Dante',
    icon: ic('audio-console'),
    ports: [
      rj45('NET', { label: 'Réseau', speedMbps: 100 }),
      rj45('DANTE-1', { label: 'Dante 1', speedMbps: 1000 }),
      rj45('DANTE-2', { label: 'Dante 2', speedMbps: 1000 })
    ],
    powerW: 75,
    defaults: { vlanId: 30 },
    note: 'Carte Dante en option : « Dante 1/2 » est neutre, les ports servent en redondance ou en commutateur. 75 W = console seule, consommation de la carte non publiée.'
  },
  // Source : https://pubs.shure.com/view/guide/ULXD-DQ/en-US.pdf (manuel du fabricant, consultée le 2026-10-14)
  // 2 ports Ethernet/Dante « Primary » et « Secondary » (10/100 Mbps ou 1 Gbps), alimentation 100–240 V AC 0,26 A max, pas de PoE ni de puissance en watts.
  {
    id: 'shure-ulxd4d',
    category: 'audio',
    name: 'Récepteur HF Shure ULXD4D',
    code: 'HF',
    vendor: 'Shure',
    model: 'Shure ULXD4D',
    icon: ic('dante'),
    ports: dantePair(),
    defaults: { vlanId: 30 },
    note: 'Chaque port porte le Dante et le contrôle (Wireless Workbench). Puissance en watts non publiée par le fabricant : 0,26 A max sur 100–240 V.'
  },
  // Source : https://help.qsys.com/q-sys_9.5/Content/Hardware/Processing/Core_Nano.htm (fiche du fabricant, consultée le 2026-10-14)
  // LAN A (principal) et LAN B (secours) RJ45 1000 Mbps ; USB-C, USB-B (appareil), 4 USB-A (hôte) ; 28 W typique, 60 W maximum.
  {
    id: 'qsc-core-nano',
    category: 'audio',
    name: 'Processeur Q-SYS Core Nano',
    code: 'QSC',
    vendor: 'QSC',
    model: 'Q-SYS Core Nano',
    icon: ic('server'),
    ports: [
      rj45('LAN-A', { label: 'LAN A' }),
      rj45('LAN-B', { label: 'LAN B' }),
      simple('usb', 'USB-C', 'USB C'),
      simple('usb', 'USB-B', 'USB B'),
      ...range('USB-A', 1, 4).map((id, i) => simple('usb', id, `USB A ${i + 1}`))
    ],
    powerW: 60,
    defaults: { vlanId: 30 },
    note: 'LAN A principal, LAN B secours ; 60 W = maximum (28 W typique).'
  },
  // Source : https://help.qsys.com/q-sys_9.5/Content/Hardware/Processing/Core_8_Flex.htm (fiche du fabricant, consultée le 2026-10-14)
  // LAN A (principal) et LAN B (secours) RJ45 1000 Mbps ; USB-C, USB-B (appareil), 4 USB-A (hôte) ; 40 W typique, 60 W maximum.
  {
    id: 'qsc-core-8-flex',
    category: 'audio',
    name: 'Processeur Q-SYS Core 8 Flex',
    code: 'QSC',
    vendor: 'QSC',
    model: 'Q-SYS Core 8 Flex',
    icon: ic('server'),
    ports: [
      rj45('LAN-A', { label: 'LAN A' }),
      rj45('LAN-B', { label: 'LAN B' }),
      simple('usb', 'USB-C', 'USB C'),
      simple('usb', 'USB-B', 'USB B'),
      ...range('USB-A', 1, 4).map((id, i) => simple('usb', id, `USB A ${i + 1}`))
    ],
    powerW: 60,
    defaults: { vlanId: 30 },
    note: 'LAN A principal, LAN B secours ; 60 W = maximum (40 W typique). GPIO et audio analogique non dessinés.'
  },
  // Source : https://www.eviaudio.fr/wp-content/uploads/2021/09/Lab%20Gruppen/D40-20-10_4L%20Data%20Sheet%20UK.pdf
  // (fiche D Series Lake du fabricant, copie hébergée par un revendeur, TDS-DSERIESLAKE2_V2 du 24.05.2016, consultée le 2026-10-14)
  // 2 × etherCON RJ45 « dual redundant control and Dante » ; pas de puissance en watts dans la fiche.
  {
    id: 'labgruppen-d-20-4l',
    category: 'audio',
    name: 'Amplificateur Lab.gruppen D 20:4L',
    code: 'AMP',
    vendor: 'Lab.gruppen',
    model: 'Lab.gruppen D 20:4L',
    icon: ic('speaker'),
    ports: dantePair(),
    defaults: { vlanId: 30 },
    note: 'Dante et contrôle Lake sur les deux etherCON. Puissance et vitesse des ports non publiées dans la fiche.'
  },
  // Source : https://www.elgato.com/us/en/p/stream-deck-mk2-black (page produit du fabricant : USB 2.0 ou plus, Type-A ou Type-C) (consultée le 2026-10-14)
  {
    id: 'elgato-stream-deck-mk2',
    category: 'ordinateur',
    name: 'Contrôleur Elgato Stream Deck MK.2',
    code: 'SD',
    vendor: 'Elgato',
    model: 'Elgato Stream Deck MK.2',
    icon: ic('usb-controller'),
    ports: [simple('usb', 'USB', 'USB')],
    note: 'Consommation non publiée par le fabricant.'
  },
  // Source : https://cdn.inmusicbrands.com/akai/attachments/apc40II/APC40%20mkII%20-%20User%20Guide%20-%20v1.0.pdf (manuel du fabricant : le port USB de l’ordinateur alimente l’appareil) (consulté le 2026-10-14)
  {
    id: 'akai-apc40-mk2',
    category: 'ordinateur',
    name: 'Contrôleur MIDI Akai APC40 MKII',
    code: 'MID',
    vendor: 'Akai Professional',
    model: 'Akai APC40 MKII',
    icon: ic('usb-controller'),
    ports: [simple('usb', 'USB', 'USB')],
    note: 'Alimenté par l’USB ; consommation non publiée par le fabricant.'
  }
]
