// Vidéo et LED wall nommés (spec patch-puissance-catalogue § 7). Chaque valeur vient de la source citée au-dessus du gabarit.
import type { DeviceTemplate } from '../../model/types'
import { ic } from '../ic'
import { range, rj45, simple } from '../ports'

// Sorties d’un processeur LED vers les dalles : connecteur `pixel`, médium dans le libellé (ce ne sont ni des ports réseau ni des sorties d’univers).
const pixelOutputs = (prefix: string, count: number, medium: string) =>
  range(prefix, 1, count).map((id, i) => simple('pixel', id, `${prefix.replace('-', ' ')}${i + 1} (${medium})`))

export const VIDEO_MODELS: readonly DeviceTemplate[] = [
  // Source : https://www.rentex.com/wp-content/uploads/2018/02/NovaStar-Controller-MCTRL4K-Specifications-Rev1.0.1.pdf
  // (fiche NovaStar « Specifications Rev1.0.1 », copie hébergée par Rentex, consultée le 2026-10-14)
  // 16 sorties Gigabit Ethernet (Neutrik) et 4 sorties fibre LC monomode ; entrées DP 1.2, HDMI 2.0 et 2 DVI double lien ; 30 W.
  {
    id: 'novastar-mctrl4k',
    category: 'video',
    name: 'Processeur LED NovaStar MCTRL4K',
    code: 'LED',
    vendor: 'NovaStar',
    model: 'NovaStar MCTRL4K',
    icon: ic('led-processor'),
    ports: [
      rj45('ETH'),
      simple('hdmi', 'HDMI-IN', 'HDMI IN'),
      ...pixelOutputs('OUT-', 16, 'RJ45'),
      ...pixelOutputs('OPT-', 4, 'fibre')
    ],
    powerW: 30,
    defaults: { vlanId: 40 },
    note: 'Sorties RJ45 ou fibre, pas les deux à la fois ; entrées DisplayPort et DVI non dessinées ; la fiche ne précise pas la vitesse du port de contrôle.'
  },
  // Source : https://oss.novastar.tech/uploads/2024/07/VX1000-All-in-One-Controller-Specifications-V1.6.0.pdf
  // (fiche du fabricant, V1.6.0, consultée le 2026-10-14) : 10 sorties Gigabit Ethernet, 2 sorties fibre 10G, puissance nominale 35 W.
  {
    id: 'novastar-vx1000',
    category: 'video',
    name: 'Processeur LED NovaStar VX1000',
    code: 'LED',
    vendor: 'NovaStar',
    model: 'NovaStar VX1000',
    icon: ic('led-processor'),
    ports: [
      rj45('ETH'),
      simple('hdmi', 'HDMI-IN1', 'HDMI IN 1'),
      simple('hdmi', 'HDMI-IN2', 'HDMI IN 2'),
      simple('sdi', 'SDI-IN', 'SDI IN'),
      simple('hdmi', 'HDMI-OUT', 'HDMI OUT'),
      ...pixelOutputs('OUT-', 10, 'RJ45'),
      simple('pixel', 'OPT-1', 'OPT 1 (fibre 10G)'),
      simple('pixel', 'OPT-2', 'OPT 2 (fibre 10G)')
    ],
    powerW: 35,
    defaults: { vlanId: 40 },
    note: 'OPT 1 sert d’entrée ou de sortie selon l’appareil relié, OPT 2 de sortie seulement ; entrées DVI non dessinées ; la fiche ne précise pas la vitesse du port de contrôle.'
  },
  // Source : https://www.bromptontech.com/wp-content/uploads/2025/07/Brompton-SX40-Data-Sheet-Feb2025-EN.pdf
  // (fiche du fabricant, fév. 2025, consultée le 2026-10-14) : 4 sorties 10G dont chacune passe seule du cuivre (10GBASE-T) à la fibre (10GBASE-LR),
  // entrées HDMI 2.0b et 12G-SDI (avec recopie), 2 ports Gigabit Ethernet de gestion ; secteur 1,2 à 0,6 A, pas de puissance en watts.
  {
    id: 'brompton-tessera-sx40',
    category: 'video',
    name: 'Processeur LED Brompton Tessera SX40',
    code: 'LED',
    vendor: 'Brompton Technology',
    model: 'Brompton Tessera SX40',
    icon: ic('led-processor'),
    ports: [
      rj45('ETH1'),
      rj45('ETH2'),
      simple('hdmi', 'HDMI-IN', 'HDMI IN'),
      simple('sdi', 'SDI-IN', 'SDI IN'),
      simple('sdi', 'SDI-THRU', 'SDI THRU'),
      ...pixelOutputs('OUT-', 4, 'fibre 10G ou cuivre')
    ],
    defaults: { vlanId: 40 },
    note: 'Chaque sortie 10G bascule seule entre fibre (opticalCON, LC) et cuivre (Cat 6A) vers les XD. Puissance en watts non publiée par le fabricant : 1,2 à 0,6 A sur 100–240 V.'
  },
  // Source : https://www.rentex.com/wp-content/uploads/2026/02/Brompton-XD-Data-Sheet-Apr2023.pdf (fiche du fabricant, avr. 2023, copie hébergée par Rentex, consultée le 2026-10-14)
  // 1 entrée 10G cuivre, 1 entrée 10G fibre, 1 recopie 10G, 10 sorties 1G etherCON, Ethernet de gestion ; secteur 0,4 à 0,2 A, pas de puissance en watts.
  {
    id: 'brompton-tessera-xd-10g',
    category: 'video',
    name: 'Distributeur Brompton Tessera XD 10G',
    code: 'XD',
    vendor: 'Brompton Technology',
    model: 'Brompton Tessera XD 10G',
    icon: ic('led-processor'),
    ports: [
      rj45('MGMT', { label: 'Gestion' }),
      simple('pixel', 'IN-CU', 'IN (10G cuivre)'),
      simple('pixel', 'IN-FIBRE', 'IN (10G fibre)'),
      simple('pixel', 'THRU', 'THRU (10G cuivre ou fibre)'),
      ...pixelOutputs('OUT-', 10, 'RJ45')
    ],
    defaults: { vlanId: 40 },
    note: 'Les deux entrées 10G sont à auto-commutation fibre/cuivre. Puissance en watts non publiée par le fabricant : 0,4 à 0,2 A sur 100–240 V ; la fiche ne précise pas la vitesse du port de gestion.'
  },
  // Source : manuel ROE « Black Onyx & Pearl » V1.8 (2023-10-08), copie hébergée par LED Wall Central : https://www.ledwallcentral.com/manuals/led_wall_manual_series_102.pdf
  // (tableau 3.1 : BP2V2, 190 W max / 95 W moyenne ; prises « Data in / Data out » ; câbles de données etherCON) et brochure du fabricant
  // https://www.roevisual.com/uploads/files/Product%20File/Black%20Pearl/bp2v2-brochure-en-feb.-3-2024.pdf (190 W / 95 W) (consultés le 2026-10-14)
  {
    id: 'roe-black-pearl-bp2v2',
    category: 'video',
    name: 'Dalle LED ROE Visual Black Pearl BP2 V2',
    code: 'DAL',
    vendor: 'ROE Visual',
    model: 'ROE Visual Black Pearl BP2 V2',
    icon: ic('led-panel'),
    ports: [simple('pixel', 'DATA-IN', 'DATA IN'), simple('pixel', 'DATA-OUT', 'DATA OUT')],
    powerW: 190,
    note: 'Puissance maximale d’une dalle (95 W en moyenne) ; une ancienne fiche indiquait 160 W. Câble de données etherCON.'
  },
  // Source : https://download.disguise.one/media/5833/disguise-vx4_specsheet.pdf et https://disguise.one/sites/default/files/2024-08/vx%204%20specs%20and%20playback%20data.pdf
  // (fiches du fabricant, consultées le 2026-10-14) : pointe 858 W ; 4 sorties 4K par cartes VFC (HDMI 2.0 en standard) ; 16 entrées 3G-SDI ;
  // 1 Ethernet 1 Gb/s, 2 Ethernet 10 Gb/s, 2 ports 25 Gb/s SFP28, 1 port de gestion Ethernet.
  {
    id: 'disguise-vx-4',
    category: 'video',
    name: 'Serveur média disguise vx 4',
    code: 'MS',
    vendor: 'disguise',
    model: 'disguise vx 4',
    icon: ic('media-server'),
    ports: [
      rj45('ETH1', { label: 'ETH 1G' }),
      rj45('ETH10-1', { label: 'ETH 10G 1', speedMbps: 10000 }),
      rj45('ETH10-2', { label: 'ETH 10G 2', speedMbps: 10000 }),
      { id: 'SFP28-1', label: 'SFP28 1 (25G)', connector: 'sfp+', speedMbps: 25000 },
      { id: 'SFP28-2', label: 'SFP28 2 (25G)', connector: 'sfp+', speedMbps: 25000 },
      rj45('MGMT', { label: 'Gestion' }),
      ...range('OUT', 1, 4).map((id, i) => simple('hdmi', id, `OUT ${i + 1} (HDMI)`)),
      ...range('SDI-IN', 1, 4).map((id, i) => simple('sdi', id, `SDI IN ${i + 1}`))
    ],
    powerW: 858,
    defaults: { vlanId: 40 },
    note: 'Puissance de pointe. Sorties par cartes VFC (HDMI 2.0 en standard, autres cartes en option) ; 16 entrées 3G-SDI, 4 dessinées. Connecteur des ports 10 Gb/s non précisé par la fiche (RJ45 supposé) ; SFP28 dessinés en SFP+ ; la fiche ne précise pas la vitesse du port de gestion.'
  },
  // Source : https://avstumpfl.com/fileadmin/user_upload/downloads/en/pixera/Technical_Specifications/2024-04-04%20PIXERA%20two%20Technical%20Specifications.pdf
  // (fiche du fabricant, PIXERA two Gen. 2, consultée le 2026-10-14) : pointe 800 W ; 4 sorties physiques DisplayPort 1.4a ; réseau 2 × 10 Gbps ; 1 IPMI LAN.
  {
    id: 'pixera-two',
    category: 'video',
    name: 'Serveur média Pixera two',
    code: 'MS',
    vendor: 'AV Stumpfl',
    model: 'Pixera two',
    icon: ic('media-server'),
    ports: [
      rj45('ETH1', { label: 'ETH 10G 1', speedMbps: 10000 }),
      rj45('ETH2', { label: 'ETH 10G 2', speedMbps: 10000 }),
      ...range('OUT', 1, 4).map((id, i) => simple('hdmi', id, `OUT ${i + 1} (DP 1.4a)`))
    ],
    powerW: 800,
    defaults: { vlanId: 40 },
    note: 'Pixera two Gen. 2, puissance de pointe. Sorties DisplayPort 1.4a (adaptateur pour HDMI) ; connecteur des 2 ports 10 Gbps non précisé par la fiche (RJ45 supposé) ; port IPMI et entrées vidéo optionnelles non dessinés.'
  },
  // Source : https://www.blackmagicdesign.com/products/atemmini/techspecs/W-APS-14 (fiche du fabricant, section « ATEM Mini Pro », consultée le 2026-10-14)
  // 4 entrées HDMI, 1 sortie HDMI programme, 1 USB-C, Ethernet 10/100/1000 ; alimentation externe 12 V, 30 W.
  {
    id: 'bmd-atem-mini-pro',
    category: 'video',
    name: 'Mélangeur Blackmagic ATEM Mini Pro',
    code: 'ATM',
    vendor: 'Blackmagic Design',
    model: 'Blackmagic ATEM Mini Pro',
    icon: ic('encoder'),
    ports: [
      rj45('ETH'),
      ...range('HDMI-IN', 1, 4).map((id, i) => simple('hdmi', id, `HDMI IN ${i + 1}`)),
      simple('hdmi', 'HDMI-OUT', 'HDMI OUT'),
      simple('usb', 'USB-C', 'USB-C'),
      simple('dc', 'DC-IN', 'DC IN')
    ],
    powerW: 30,
    defaults: { vlanId: 40 },
    note: 'Alimentation externe 12 V DC.'
  },
  // Source : https://www.blackmagicdesign.com/products/microconverters/techspecs/W-CONU-10 (fiche du fabricant, section « Micro Converter BiDirectional SDI/HDMI 3G », consultée le 2026-10-14)
  // 1 entrée et 1 sortie SDI, 1 entrée et 1 sortie HDMI, USB-C pour mises à jour, réglages et alimentation (4,4 à 5,25 V DC) ; 2,5 W.
  {
    id: 'bmd-micro-converter-bidi-sdi-hdmi-3g',
    category: 'video',
    name: 'Convertisseur Blackmagic Micro Converter BiDirectional SDI/HDMI 3G',
    code: 'CNV',
    vendor: 'Blackmagic Design',
    model: 'Blackmagic Micro Converter BiDirectional SDI/HDMI 3G',
    icon: ic('converter'),
    ports: [
      simple('sdi', 'SDI-IN', 'SDI IN'),
      simple('sdi', 'SDI-OUT', 'SDI OUT'),
      simple('hdmi', 'HDMI-IN', 'HDMI IN'),
      simple('hdmi', 'HDMI-OUT', 'HDMI OUT'),
      simple('usb', 'USB-C', 'USB-C')
    ],
    powerW: 2.5,
    note: 'Alimenté par l’USB-C (4,4 à 5,25 V DC) ; le bloc secteur est vendu avec une autre version.'
  },
  // Source : https://www.blackmagicdesign.com/products/hyperdeckstudio/techspecs/W-HDK-05 (fiche du fabricant, section « HyperDeck Studio HD Mini », consultée le 2026-10-14)
  // 1 entrée et 1 sortie SDI, 1 sortie HDMI, Ethernet 1 Gb/s, 1 USB-C ; 50 W maximum, alimentation interne 100–240 V AC ou 12 V DC.
  {
    id: 'bmd-hyperdeck-studio-hd-mini',
    category: 'video',
    name: 'Enregistreur Blackmagic HyperDeck Studio HD Mini',
    code: 'REC',
    vendor: 'Blackmagic Design',
    model: 'Blackmagic HyperDeck Studio HD Mini',
    icon: ic('media-server'),
    ports: [
      rj45('ETH', { speedMbps: 1000 }),
      simple('sdi', 'SDI-IN', 'SDI IN'),
      simple('sdi', 'SDI-OUT', 'SDI OUT'),
      simple('hdmi', 'HDMI-OUT', 'HDMI OUT'),
      simple('usb', 'USB-C', 'USB-C')
    ],
    powerW: 50,
    defaults: { vlanId: 40 },
    note: 'Puissance maximale ; secteur interne 100–240 V AC (entrée 12 V DC en option, non dessinée). Pas d’entrée HDMI.'
  }
]
