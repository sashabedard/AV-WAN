// Éclairage nommé (spec patch-puissance-catalogue § 7). Chaque valeur vient de la source citée au-dessus du gabarit.
import type { DeviceTemplate } from '../../model/types'
import { ic } from '../ic'
import { dmxThru, range, rj45, simple } from '../ports'

// Sorties DMX d’un nœud : DMX-1, DMX-2… (la colonne Univers s’en sert).
const dmxOutputs = (count: number) => range('DMX-', 1, count).map((id, i) => simple('dmx', id, `DMX ${i + 1}`))

export const LIGHTING_MODELS: readonly DeviceTemplate[] = [
  // Source : https://chauvetprofessional.com/wp-content/uploads/2018/10/ROGUE_R2X_Spot_UM_Rev6.pdf (manuel du fabricant, rév. 6)
  // et https://chauvetprofessional.com/products/rogue-r2x-spot (consultés le 2026-10-14)
  // Deux personnalités, 18CH et 21CH ; DMX par XLR 3 et 5 broches, aucune entrée réseau ; 488 W à 120 V (480–488 W selon la tension).
  {
    id: 'chauvet-rogue-r2x-spot',
    category: 'eclairage',
    name: 'Lyre spot Chauvet Rogue R2X Spot',
    code: 'MH',
    vendor: 'Chauvet Professional',
    model: 'Chauvet Rogue R2X Spot',
    icon: ic('moving-head'),
    ports: dmxThru(),
    powerW: 488,
    dmx: {
      footprint: 18,
      modes: [
        { name: '18CH', channels: 18 },
        { name: '21CH', channels: 21 }
      ]
    },
    note: 'Puissance maximale relevée à 120 V (480 à 488 W selon la tension).'
  },
  // Source : https://www.martin.com/en/products/mac-aura-xb (page produit du fabricant)
  // et manuel https://www.martin.com/en/site_elements/martin-mac-aura-xb-user-manual (v. C) et fiche https://www.martin.com/en/site_elements/mac-aura-xb-spec-sheet-english (consultés le 2026-10-14)
  // Modes STD (14 canaux) et EXT (25 canaux) ; 400 W maximum ; DMX par XLR 5 broches, aucune entrée réseau.
  {
    id: 'martin-mac-aura-xb',
    category: 'eclairage',
    name: 'Lyre wash Martin MAC Aura XB',
    code: 'WSH',
    vendor: 'Martin',
    model: 'Martin MAC Aura XB',
    icon: ic('moving-head'),
    ports: dmxThru(),
    powerW: 400,
    dmx: {
      footprint: 14,
      modes: [
        { name: 'Standard (STD)', channels: 14 },
        { name: 'Étendu (EXT)', channels: 25 }
      ]
    }
  },
  // Source : fiche technique Clay Paky Sharpy C61375 https://e-assist.tech/servlet/checkDocumentsFile?Id=2030 (fiche du fabricant, 08/2023)
  // et manuel d’instructions C61375, copie hébergée par 4Wall : https://cdn01.4wall.com/cms/rentals/files/f60ef02cea55e4.pdf (tableau « Channel function », consultés le 2026-10-14)
  // Modes Standard (16 canaux) et Vector (20 canaux) ; Art-Net / RDM annoncés ; 350 VA à 230 V (pas de puissance en watts publiée).
  {
    id: 'claypaky-sharpy',
    category: 'eclairage',
    name: 'Lyre beam Clay Paky Sharpy',
    code: 'BM',
    vendor: 'Clay Paky',
    model: 'Clay Paky Sharpy',
    icon: ic('moving-head'),
    ports: [...dmxThru(), rj45('ETH')],
    defaults: { vlanId: 50 },
    dmx: {
      footprint: 16,
      modes: [
        { name: 'Standard', channels: 16 },
        { name: 'Vector', channels: 20 }
      ]
    },
    note: 'Modèle d’origine (C61375, lampe 189 W). Puissance en watts non publiée par le fabricant : 350 VA à 230 V. Le type de prise Ethernet et sa vitesse ne sont pas précisés par la fiche.'
  },
  // Source : https://www.robe.cz/res/downloads/catalogues/ROBE_MegaPointe_leaflet.pdf (fiche du fabricant : 2 modes, 39 et 34 canaux, 670 W, RJ45 Ethernet, Art-Net/sACN)
  // et table DMX Robe v1.5 « Mode 1 – Standard 16 bits, Mode 2 – Réduit 8 bits », copie hébergée par Storm Lighting :
  // https://cdn.stormltd.co.uk/content/2018/09/Robe_megaPointe_DMX.pdf (dernier canal : 39 en mode 1, 34 en mode 2) (consultées le 2026-10-14)
  {
    id: 'robe-megapointe',
    category: 'eclairage',
    name: 'Lyre hybride Robe MegaPointe',
    code: 'MH',
    vendor: 'Robe',
    model: 'Robe MegaPointe',
    icon: ic('moving-head'),
    ports: [...dmxThru(), rj45('ETH')],
    powerW: 670,
    defaults: { vlanId: 50 },
    dmx: {
      footprint: 39,
      modes: [
        { name: 'Mode 1 – Standard 16 bits', channels: 39 },
        { name: 'Mode 2 – Réduit 8 bits', channels: 34 }
      ]
    },
    note: 'Entrée Ethernet RJ45 (Art-Net, sACN) ; la fiche ne précise pas la vitesse du port.'
  },
  // Source : guide d’installation ETC ColorSource PAR v1.5 https://www.etcconnect.com/workarea/DownloadAsset.aspx?id=10737478060 (fabricant, consulté le 2026-10-14)
  // 4 modes DMX (tableau « DMX control channels ») ; consommation maximale 120 W ; « not Ethernet/data network compatible ».
  {
    id: 'etc-colorsource-par',
    category: 'eclairage',
    name: 'PAR LED ETC ColorSource PAR',
    code: 'PAR',
    vendor: 'ETC',
    model: 'ETC ColorSource PAR',
    icon: ic('par'),
    ports: dmxThru(),
    powerW: 120,
    dmx: {
      footprint: 5,
      modes: [
        { name: '5 canaux', channels: 5 },
        { name: 'Direct', channels: 6 },
        { name: 'RGB', channels: 3 },
        { name: '1 canal', channels: 1 }
      ]
    },
    note: 'Consommation maximale 120 W ; pas de réseau (les versions à RJ45 portent du DMX, pas de l’Ethernet).'
  },
  // Source : manuel ETC Source Four LED Series 3 v1.2.0 (tableau « DMX Modes », colonne Lustr X8 ; « Maximum power consumption is 375 W »),
  // copie hébergée par UsedLighting : https://cdn01.usedlighting.com/products/files/f63fff00240f21.pdf
  // et page du fabricant https://shop.etcconnect.com/s4-s3-lustr-x8-etl-lteng-w-barl-svr (5 modes, 1–12 canaux ; XLR 5 broches, Multiverse sans fil) (consultés le 2026-10-14)
  {
    id: 'etc-source-four-led-s3-lustr-x8',
    category: 'eclairage',
    name: 'Découpe LED ETC Source Four LED Series 3 Lustr X8',
    code: 'PRF',
    vendor: 'ETC',
    model: 'ETC Source Four LED Series 3 Lustr X8',
    icon: ic('fixture'),
    ports: dmxThru(),
    powerW: 375,
    dmx: {
      footprint: 12,
      modes: [
        { name: 'Direct', channels: 12 },
        { name: 'Expanded', channels: 11 },
        { name: 'Studio', channels: 7 },
        { name: '3 Ch RGB', channels: 3 },
        { name: '1 Channel', channels: 1 }
      ]
    },
    note: 'Mode Direct par défaut. Consommation maximale 375 W (≈ 307 W typique à pleine intensité sur 120 V).'
  },
  // Source : https://www.martin.com/en/products/atomic-3000-led, manuel https://www.martin.com/en/site_elements/martin-manuals-atomic-3000-led-user-manual (v. C)
  // et fiche https://www.martin.com/en/site_elements/atomic-3000-led-spec-sheet-english (consultés le 2026-10-14)
  // Modes 3 canaux, 4 canaux et Extended (14 canaux) ; 740 W maximum ; DMX par XLR 5 broches, pas de réseau.
  {
    id: 'martin-atomic-3000-led',
    category: 'eclairage',
    name: 'Stroboscope Martin Atomic 3000 LED',
    code: 'STR',
    vendor: 'Martin',
    model: 'Martin Atomic 3000 LED',
    icon: ic('strobe'),
    ports: dmxThru(),
    powerW: 740,
    dmx: {
      footprint: 4,
      modes: [
        { name: '4 canaux', channels: 4 },
        { name: 'Extended', channels: 14 },
        { name: '3 canaux', channels: 3 }
      ]
    },
    note: 'Le mode 4 canaux est celui de l’Atomic 3000 xénon d’origine ; le fabricant ne désigne pas de mode par défaut.'
  },
  // Source (brochure du fabricant, copie hébergée par CCS Light & Sound, pas de page fabricant accessible) : https://www.ccslightsound.com.au/assets/brochures/KIT-358.pdf (consultée le 2026-10-14)
  // DMX 512 sur deux canaux consécutifs (pompe et ventilateur), « Power requirement 1500 Watt » ; pas de réseau.
  {
    id: 'look-unique-2-1',
    category: 'eclairage',
    name: 'Machine à brume Look Solutions Unique 2.1',
    code: 'HZ',
    vendor: 'Look Solutions',
    model: 'Look Solutions Unique 2.1',
    icon: ic('fog'),
    ports: dmxThru(),
    powerW: 1500,
    dmx: { footprint: 2, modes: [{ name: 'Pompe et ventilateur', channels: 2 }] },
    note: 'Deux canaux consécutifs : pompe, puis ventilateur. Une seule configuration DMX annoncée.'
  },
  // Source : fiche technique MDG theONE https://goknight.com/content/documentation/Product-data-sheet_theONE.pdf (fiche du fabricant MDG, copie hébergée par Knight)
  // et guide de démarrage rapide MDG https://goknight.com/content/documentation/theONE_Quick_Start_Rev_Ba.pdf (copie hébergée par Knight) (consultés le 2026-10-14)
  // « The Interface uses five (5) DMX channels » ; 1100–1480 W ; DMX XLR 5 broches et nœud RJ45 (Art-Net, sACN).
  {
    id: 'mdg-theone',
    category: 'eclairage',
    name: 'Machine à brume MDG theONE',
    code: 'HZ',
    vendor: 'MDG',
    model: 'MDG theONE',
    icon: ic('fog'),
    ports: [...dmxThru(), rj45('ETH')],
    powerW: 1480,
    defaults: { vlanId: 50 },
    dmx: { footprint: 5, modes: [{ name: 'Standard', channels: 5 }] },
    note: 'Puissance de 1 100 à 1 480 W (valeur maximale retenue) ; la fiche ne précise pas la vitesse du port RJ45.'
  },

  // Sources d’univers : non patchables (pas de champ dmx).
  // Source : https://www.enttec.com/sku/70407 et fiche https://cdn.enttec.com/pdf/assets/70407/70407_ODE_MK3_DATASHEET.pdf (fabricant, consultées le 2026-10-14)
  // 2 DMX bidirectionnels (XLR 5 broches femelle), 1 EtherCon 10/100 avec PoE IEEE 802.3af, entrée DC 12–24 V optionnelle, 2,3 W maximum.
  {
    id: 'enttec-ode-mk3',
    category: 'eclairage',
    name: 'Nœud DMX ENTTEC ODE Mk3',
    code: 'DMX',
    vendor: 'ENTTEC',
    model: 'ENTTEC ODE Mk3',
    icon: ic('dmx-node'),
    ports: [rj45('ETH', { speedMbps: 100, poeIn: 'af', poeDrawW: 2.3 }), ...dmxOutputs(2), simple('dc', 'DC-IN', 'DC IN')],
    powerW: 2.3,
    defaults: { vlanId: 50 },
    note: 'Alimenté par PoE (802.3af) ou par une alimentation 12–24 V DC en option ; chaque sortie DMX est bidirectionnelle.'
  },
  // Source : https://luminex.be/products/luminode/luminode-4 (page produit du fabricant, version demi-rack LU 01 00071, consultée le 2026-10-14)
  // 4 DMX XLR 5 broches (entrée ou sortie), 2 EtherCon 10/100/1000, PoE 802.3af classe 0 ou 100–240 V AC, 13 W maximum.
  {
    id: 'luminex-luminode-4',
    category: 'eclairage',
    name: 'Nœud DMX Luminex LumiNode 4',
    code: 'DMX',
    vendor: 'Luminex',
    model: 'Luminex LumiNode 4',
    icon: ic('dmx-node'),
    ports: [rj45('ETH-1', { poeIn: 'af', poeDrawW: 13 }), rj45('ETH-2'), ...dmxOutputs(4)],
    powerW: 13,
    defaults: { vlanId: 50 },
    note: 'Version demi-rack : PoE 802.3af ou secteur 100–240 V ; la fiche ne dit pas lequel des deux ports Ethernet reçoit le PoE (ETH-1 retenu). Existe aussi en DIN et en mural.'
  },
  // Source : manuel https://dmxking.com/downloads/eDMX4%20PRO%20User%20Manual%20(EN).pdf (fabricant, réf. 0104-700-3.13, consulté le 2026-10-14)
  // 4 DMX en entrée ou sortie (XLR 3 ou 5 broches selon l’option), 1 etherCON 10/100, PoE 802.3af, « maximum power budget 8W ».
  {
    id: 'dmxking-edmx4-pro',
    category: 'eclairage',
    name: 'Nœud DMX DMXking eDMX4 PRO',
    code: 'DMX',
    vendor: 'DMXking',
    model: 'DMXking eDMX4 PRO',
    icon: ic('dmx-node'),
    ports: [rj45('ETH', { speedMbps: 100, poeIn: 'af', poeDrawW: 8 }), ...dmxOutputs(4)],
    powerW: 8,
    defaults: { vlanId: 50 },
    note: 'Alimenté uniquement par PoE ; 8 W est le « maximum power budget » annoncé par le fabricant. Pas d’entrée DC sur cette version (les versions DIN en ont une).'
  },
  // Source : fiche technique https://www.ac-et.com/storage/product_images/advatek/a4_s_mk3/pixlite-a4-s-mk3-datasheet_20250225.pdf (Advatek, copie hébergée par AC Entertainment Technologies, consultée le 2026-10-14)
  // 4 sorties pixels alimentées (7 A chacune, 28 A au total), 2 Ethernet 10/100/1000, port auxiliaire RS485 DMX en entrée ou sortie, entrée 5–24 V DC, pas de PoE.
  {
    id: 'advatek-pixlite-a4s-mk3',
    category: 'eclairage',
    name: 'Contrôleur de pixels Advatek PixLite A4-S Mk3',
    code: 'PIX',
    vendor: 'Advatek',
    model: 'Advatek PixLite A4-S Mk3',
    icon: ic('pixel-controller'),
    ports: [
      rj45('ETH-1'),
      rj45('ETH-2'),
      ...range('OUT', 1, 4).map((id, i) => simple('pixel', id, `OUT ${i + 1}`)),
      simple('dmx', 'DMX-1', 'DMX 1'),
      simple('dc', 'DC-IN', 'DC IN')
    ],
    defaults: { vlanId: 50 },
    note: 'Alimentation 5–24 V DC qui alimente aussi les pixels (7 A par sortie). Puissance en watts non publiée : elle dépend des pixels raccordés.'
  },
  // Source : fiche technique https://www.ac-et.com/storage/product_images/advatek/t8_s_mk3/pixlite-t8-s-mk3-datasheet_20250225.pdf (Advatek, copie hébergée par AC Entertainment Technologies, consultée le 2026-10-14)
  // 8 sorties de données RJ45 (émetteur longue portée, non alimentées), 2 Ethernet 10/100/1000, port auxiliaire RS485 DMX en entrée ou sortie, secteur 100–240 V AC.
  {
    id: 'advatek-pixlite-t8s-mk3',
    category: 'eclairage',
    name: 'Contrôleur de pixels Advatek PixLite T8-S Mk3',
    code: 'PIX',
    vendor: 'Advatek',
    model: 'Advatek PixLite T8-S Mk3',
    icon: ic('pixel-controller'),
    ports: [
      rj45('ETH-1'),
      rj45('ETH-2'),
      ...range('OUT', 1, 8).map((id, i) => simple('pixel', id, `OUT ${i + 1} (RJ45)`)),
      simple('dmx', 'DMX-1', 'DMX 1')
    ],
    defaults: { vlanId: 50 },
    note: 'Émetteur longue portée : chaque sortie RJ45 alimente un récepteur. Secteur 100–240 V AC ; puissance en watts non publiée.'
  },
  // Source : fiche https://enttec.com.cn/wp-content/uploads/2020/09/70304_DMX-USB-PRO_DS.pdf (ENTTEC, site chinois du fabricant ; même fiche que celle copiée par Thomann) (consultée le 2026-10-14)
  // USB 1.1/2.0, entrée DMX et sortie DMX en XLR 5 broches, « Power requirements 300mA supplied by USB ».
  {
    id: 'enttec-dmx-usb-pro',
    category: 'eclairage',
    name: 'Interface DMX ENTTEC DMX USB Pro',
    code: 'USB',
    vendor: 'ENTTEC',
    model: 'ENTTEC DMX USB Pro',
    icon: ic('dmx-node'),
    ports: [simple('usb', 'USB'), simple('dmx', 'DMX-IN', 'DMX IN'), simple('dmx', 'DMX-1', 'DMX 1')],
    powerW: 1.5,
    note: '≈ 1,5 W (5 V × 300 mA, calculé d’après la fiche). Alimentée par le port USB de l’ordinateur.'
  }
]
