// Éclairage nommé (spec patch-puissance-catalogue § 7). Chaque valeur vient de la source citée au-dessus du gabarit.
// Le `model` d’un gabarit fait partie de la clé des listes de canaux des utilisateurs : le garder stable (le changer détache leurs listes modifiées).
import type { DeviceTemplate } from '../../model/types'
import { ic } from '../ic'
import { dmxThru, range, rj45, simple } from '../ports'

// Sorties DMX d’un nœud : DMX-1, DMX-2… (la colonne Univers s’en sert).
const dmxOutputs = (count: number) => range('DMX-', 1, count).map((id, i) => simple('dmx', id, `DMX ${i + 1}`))

export const LIGHTING_MODELS: readonly DeviceTemplate[] = [
  // Source : https://chauvetprofessional.com/wp-content/uploads/2018/10/ROGUE_R2X_Spot_UM_Rev6.pdf (manuel du fabricant, rév. 6)
  // et https://chauvetprofessional.com/products/rogue-r2x-spot (consultés le 2026-10-14)
  // Deux personnalités, 18CH et 21CH ; DMX par XLR 3 et 5 broches, aucune entrée réseau ; 488 W à 120 V (480–488 W selon la tension).
  // Noms des canaux : https://chauvetprofessional.com/wp-content/uploads/2018/10/ROGUE_R2X_Spot_UM_Rev6.pdf (Rogue R2X Spot User Manual, rév. 6), section « DMX Values », tableaux 18CH (pp. 23–25) et 21CH (pp. 20–23), consulté le 2026-10-15
  {
    id: 'chauvet-rogue-r2x-spot',
    category: 'eclairage',
    name: { fr: 'Lyre spot Chauvet Rogue R2X Spot', en: 'Moving head spot Chauvet Rogue R2X Spot' },
    code: 'MH',
    vendor: 'Chauvet Professional',
    model: 'Chauvet Rogue R2X Spot',
    icon: ic('moving-head'),
    ports: dmxThru(),
    powerW: 488,
    dmx: {
      footprint: 18,
      modes: [
        { name: '18CH', channels: 18, params: ['Pan', 'Fine Pan', 'Tilt', 'Fine Tilt', 'Pan/Tilt Speed', 'Dimmer', 'Shutter', 'Color Wheel 2', 'Color Wheel 1', 'Gobo Wheel 1', 'Gobo Wheel 1 Rotate', 'Gobo Wheel 2', 'Focus', 'Prism', 'Prism Rotate', 'Iris', 'Frost', 'Control'] },
        { name: '21CH', channels: 21, params: ['Pan', 'Fine Pan', 'Tilt', 'Fine Tilt', 'Pan/Tilt Speed', 'Dimmer', 'Fine Dimmer', 'Shutter', 'Color Wheel 2', 'Color Wheel 1', 'Gobo Wheel 1', 'Gobo Wheel 1 Rotate', 'Gobo Wheel 2', 'Focus', 'Prism', 'Prism Rotate', 'Iris', 'Frost', 'Movement Macros', 'Movement Macro Speed', 'Control'] }
      ]
    },
    note: { fr: 'Puissance maximale relevée à 120 V (480 à 488 W selon la tension). Ordre des modes (18CH d’abord) : choix, le manuel ne désigne pas de mode par défaut.', en: 'Maximum power measured at 120 V (480 to 488 W depending on voltage). Mode order (18CH first): a choice, the manual does not designate a default mode.' }
  },
  // Source : https://www.martin.com/en/products/mac-aura-xb (page produit du fabricant)
  // et manuel https://www.martin.com/en/site_elements/martin-mac-aura-xb-user-manual (v. C) et fiche https://www.martin.com/en/site_elements/mac-aura-xb-spec-sheet-english (consultés le 2026-10-14)
  // Modes STD (14 canaux) et EXT (25 canaux) ; 400 W maximum ; DMX par XLR 5 broches, aucune entrée réseau.
  // Noms des canaux : manuel https://www.martin.com/en/site_elements/martin-mac-aura-xb-user-manual (P/N 35000280, rév. C), « DMX protocol », Table 2 « MAC Aura XB DMX Protocol », pp. 23–27 (colonnes Std. et Ext.), consulté le 2026-10-15
  {
    id: 'martin-mac-aura-xb',
    category: 'eclairage',
    name: { fr: 'Lyre wash Martin MAC Aura XB', en: 'Moving head wash Martin MAC Aura XB' },
    code: 'WSH',
    vendor: 'Martin',
    model: 'Martin MAC Aura XB',
    icon: ic('moving-head'),
    ports: dmxThru(),
    powerW: 400,
    dmx: {
      footprint: 14,
      modes: [
        { name: 'Standard (STD)', channels: 14, params: ['Beam electronic shutter effect', 'Beam dimmer', 'Zoom', 'Pan', 'Pan fine', 'Tilt', 'Tilt fine', 'Fixture control settings', 'Beam color wheel effect', 'Beam red', 'Beam green', 'Beam blue', 'Beam white', 'Beam CTC (Color Temperature Control)'] },
        // i18n-ignore : clé de liste DMX
        { name: 'Étendu (EXT)', channels: 25, params: ['Beam electronic shutter effect', 'Beam dimmer', 'Zoom', 'Pan', 'Pan fine', 'Tilt', 'Tilt fine', 'Fixture control settings', 'Beam color wheel effect', 'Beam red', 'Beam green', 'Beam blue', 'Beam white', 'Beam CTC (Color Temperature Control)', 'FX1 select', 'FX1 adjust, sync speed adjust', 'FX2 select', 'FX2 adjust', 'Sync (FX synchronization)', 'Aura shutter and strobe effect', 'Aura dimmer', 'Aura color wheel effect', 'Aura red', 'Aura green', 'Aura blue'] }
      ]
    }
  },
  // Source : fiche technique Clay Paky Sharpy C61375 https://e-assist.tech/servlet/checkDocumentsFile?Id=2030 (fiche du fabricant, 08/2023)
  // et manuel d’instructions C61375, copie hébergée par 4Wall : https://cdn01.4wall.com/cms/rentals/files/f60ef02cea55e4.pdf (tableau « Channel function », consultés le 2026-10-14)
  // Modes Standard (16 canaux) et Vector (20 canaux) ; Art-Net / RDM annoncés mais aucune prise réseau nommée (ni fiche, ni manuel, ni page claypaky.it) ; 350 VA à 230 V (pas de puissance en watts publiée).
  // Noms des canaux : manuel d’instructions C61375 IST005/001 – EN – Rev.G 05/2016, copie 4Wall https://cdn01.4wall.com/cms/rentals/files/f60ef02cea55e4.pdf, « Channel function », tableau « CHANNEL MODE » (colonnes STANDARD et VECTOR), p. 23, consulté le 2026-10-15
  {
    id: 'claypaky-sharpy',
    category: 'eclairage',
    name: { fr: 'Lyre beam Clay Paky Sharpy', en: 'Moving head beam Clay Paky Sharpy' },
    code: 'BM',
    vendor: 'Clay Paky',
    model: 'Clay Paky Sharpy',
    icon: ic('moving-head'),
    ports: dmxThru(),
    dmx: {
      footprint: 16,
      modes: [
        { name: 'Standard', channels: 16, params: ['Colour wheel', 'Stop / strobe', 'Dimmer', 'Static gobo change', 'Prism insertion', 'Prism rotation', 'Effects movement', 'Frost', 'Focus', 'Pan', 'Pan fine', 'Tilt', 'Tilt fine', 'Function', 'Reset', 'Lamp control (Lamp Dmx option ON)'] },
        { name: 'Vector', channels: 20, params: ['Colour wheel', 'Stop / strobe', 'Dimmer', 'Static gobo change', 'Prism insertion', 'Prism rotation', 'Effects movement', 'Frost', 'Focus', 'Pan', 'Pan fine', 'Tilt', 'Tilt fine', 'Function', 'Reset', 'Lamp control (Lamp Dmx option ON)', 'Pan - tilt time', 'Colour time', 'Beam time', 'Gobo time'] }
      ]
    },
    note: { fr: 'Modèle d’origine (C61375, lampe 189 W). Puissance en watts non publiée par le fabricant : 350 VA à 230 V. Art-Net/RDM annoncés ; prise réseau non précisée par le fabricant.', en: 'Original model (C61375, 189 W lamp). Wattage not published by the manufacturer: 350 VA at 230 V. Art-Net/RDM announced; network port not specified by the manufacturer.' }
  },
  // Source : https://www.robe.cz/res/downloads/catalogues/ROBE_MegaPointe_leaflet.pdf (fiche du fabricant : 2 modes, 39 et 34 canaux, 670 W, RJ45 Ethernet, Art-Net/sACN)
  // et table DMX Robe v1.5 « Mode 1 – Standard 16 bits, Mode 2 – Réduit 8 bits », copie hébergée par Storm Lighting :
  // https://cdn.stormltd.co.uk/content/2018/09/Robe_megaPointe_DMX.pdf (dernier canal : 39 en mode 1, 34 en mode 2) (consultées le 2026-10-14)
  // Noms des canaux : « Robin MegaPointe – DMX protocol » version 1.5, copie Storm Lighting https://cdn.stormltd.co.uk/content/2018/09/Robe_megaPointe_DMX.pdf, colonnes de mode 1 et 2, pp. 1–11, consulté le 2026-10-15
  {
    id: 'robe-megapointe',
    category: 'eclairage',
    name: { fr: 'Lyre hybride Robe MegaPointe', en: 'Hybrid moving head Robe MegaPointe' },
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
        // i18n-ignore : clé de liste DMX
        { name: 'Mode 1 – Standard 16 bits', channels: 39, params: ['Pan', 'Pan Fine', 'Tilt', 'Tilt fine', 'Pan/Tilt speed, Pan/Tilt time', 'Power/Special functions', 'Cyan', 'Magenta', 'Yellow', 'Colour wheel', 'Colour wheel - fine positioning', 'Virtual colour wheel', 'Effect Speed', 'CMY & Colour wheel time', 'Zoom & Focus & Frost & Prism time', 'Effect wheel positioning', 'Effect wheel rotation', 'Effect wheel animations', 'Static gobo wheel', 'Rotating gobo wheel', 'Rot. gobo indexing and rotation', 'Rot. gobo indexing/rotation - fine', 'Prism wheel 1', 'Prism wheel 1 indexing/rotation', 'Prism wheel 2', 'Prism wheel 2 indexing/rotation', 'Pattern selection', 'Pattern rotation and indexing', 'Beam shaper selection', 'Beam shaper rotation and indexing', 'Frost', 'Zoom', 'Zoom - fine', 'Focus', 'Focus Fine', 'Hot-Spot control', 'Shutter/ strobe', 'Dimmer intensity', 'Dimmer intensity - fine'] },
        // i18n-ignore : clé de liste DMX
        { name: 'Mode 2 – Réduit 8 bits', channels: 34, params: ['Pan', 'Pan Fine', 'Tilt', 'Tilt fine', 'Pan/Tilt speed, Pan/Tilt time', 'Power/Special functions', 'Cyan', 'Magenta', 'Yellow', 'Colour wheel', 'Virtual colour wheel', 'Effect Speed', 'CMY & Colour wheel time', 'Zoom & Focus & Frost & Prism time', 'Effect wheel positioning', 'Effect wheel rotation', 'Effect wheel animations', 'Static gobo wheel', 'Rotating gobo wheel', 'Rot. gobo indexing and rotation', 'Prism wheel 1', 'Prism wheel 1 indexing/rotation', 'Prism wheel 2', 'Prism wheel 2 indexing/rotation', 'Pattern selection', 'Pattern rotation and indexing', 'Beam shaper selection', 'Beam shaper rotation and indexing', 'Frost', 'Zoom', 'Focus', 'Hot-Spot control', 'Shutter/ strobe', 'Dimmer intensity'] }
      ]
    },
    note: { fr: 'Entrée Ethernet RJ45 (Art-Net, sACN) ; la fiche ne précise pas la vitesse du port.', en: 'RJ45 Ethernet input (Art-Net, sACN); the datasheet does not state the port speed.' }
  },
  // Source : guide d’installation ETC ColorSource PAR v1.5 https://www.etcconnect.com/workarea/DownloadAsset.aspx?id=10737478060 (fabricant, consulté le 2026-10-14)
  // 4 modes DMX (tableau « DMX control channels ») ; consommation maximale 120 W ; « not Ethernet/data network compatible ».
  // Noms des canaux : guide d’installation ColorSource PAR v1.5 (7412M2100-1.5 Rev A), https://www.etcconnect.com/workarea/DownloadAsset.aspx?id=10737478060, tableau « DMX control channels », p. 8 sur 12, consulté le 2026-10-15
  {
    id: 'etc-colorsource-par',
    category: 'eclairage',
    name: { fr: 'PAR LED ETC ColorSource PAR', en: 'PAR LED ETC ColorSource PAR' },
    code: 'PAR',
    vendor: 'ETC',
    model: 'ETC ColorSource PAR',
    icon: ic('par'),
    ports: dmxThru(),
    powerW: 120,
    dmx: {
      footprint: 5,
      modes: [
        // i18n-ignore : clé de liste DMX
        { name: '5 canaux', channels: 5, params: ['Intensity', 'Red', 'Green', 'Blue', 'Strobe'] },
        { name: 'Direct', channels: 6, params: ['Intensity', 'Red', 'Green', 'Blue/Indigo', 'Lime', 'Strobe'] },
        { name: 'RGB', channels: 3, params: ['Red', 'Green', 'Blue'] },
        // i18n-ignore : clé de liste DMX
        { name: '1 canal', channels: 1, params: ['Intensity'] }
      ]
    },
    note: { fr: 'Consommation maximale 120 W ; pas de réseau (les versions à RJ45 portent du DMX, pas de l’Ethernet).', en: 'Maximum consumption 120 W; no network (the RJ45 versions carry DMX, not Ethernet).' }
  },
  // Source : manuel ETC Source Four LED Series 3 v1.2.0 (tableau « DMX Modes », colonne Lustr X8 ; « Maximum power consumption is 375 W »),
  // copie hébergée par UsedLighting : https://cdn01.usedlighting.com/products/files/f63fff00240f21.pdf
  // et page du fabricant https://shop.etcconnect.com/s4-s3-lustr-x8-etl-lteng-w-barl-svr (5 modes, 1–12 canaux ; XLR 5 broches, Multiverse sans fil) (consultés le 2026-10-14)
  // Noms des canaux : manuel Source Four LED Series 3 v1.2.0 (7462M1200-1.2.0 Rev A), copie UsedLighting https://cdn01.usedlighting.com/products/files/f63fff00240f21.pdf, tableau « DMX Modes » (colonne Lustr X8 pour Direct), p. 14, consulté le 2026-10-15
  {
    id: 'etc-source-four-led-s3-lustr-x8',
    category: 'eclairage',
    name: { fr: 'Découpe LED ETC Source Four LED Series 3 Lustr X8', en: 'LED profile ETC Source Four LED Series 3 Lustr X8' },
    code: 'PRF',
    vendor: 'ETC',
    model: 'ETC Source Four LED Series 3 Lustr X8',
    icon: ic('fixture'),
    ports: dmxThru(),
    powerW: 375,
    dmx: {
      footprint: 12,
      modes: [
        { name: 'Direct', channels: 12, params: ['Intensity', 'Deep Red', 'Red', 'Amber', 'Lime', 'Green', 'Cyan', 'Blue', 'Indigo', 'Strobe', 'Curve', 'Fan'] },
        { name: 'Expanded', channels: 11, params: ['Intensity', 'CCT', 'Tint', 'Tuning', 'Mix', 'Red', 'Green', 'Blue', 'Strobe', 'Curve', 'Fan'] },
        { name: 'Studio', channels: 7, params: ['Intensity', 'CCT', 'Tint', 'Tuning', 'Strobe', 'Curve', 'Fan'] },
        { name: '3 Ch RGB', channels: 3, params: ['Red', 'Green', 'Blue'] },
        { name: '1 Channel', channels: 1, params: ['Intensity'] }
      ]
    },
    note: { fr: 'Mode Direct par défaut. Consommation maximale 375 W (≈ 307 W typique à pleine intensité sur 120 V).', en: 'Direct mode by default. Maximum consumption 375 W (≈ 307 W typical at full intensity on 120 V).' }
  },
  // Source : https://www.martin.com/en/products/atomic-3000-led, manuel https://www.martin.com/en/site_elements/martin-manuals-atomic-3000-led-user-manual (v. C)
  // et fiche https://www.martin.com/en/site_elements/atomic-3000-led-spec-sheet-english (consultés le 2026-10-14)
  // Modes 3 canaux, 4 canaux et Extended (14 canaux) ; 740 W maximum ; DMX par XLR 5 broches, pas de réseau.
  // Noms des canaux : manuel https://www.martin.com/en/site_elements/martin-manuals-atomic-3000-led-user-manual (P/N 35000290, rév. C), « DMX protocol », tableaux 2 (3 canaux), 3 (4 canaux, p. 26) et 4 (Extended, pp. 27–29), consulté le 2026-10-15
  {
    id: 'martin-atomic-3000-led',
    category: 'eclairage',
    name: { fr: 'Stroboscope Martin Atomic 3000 LED', en: 'Strobe Martin Atomic 3000 LED' },
    code: 'STR',
    vendor: 'Martin',
    model: 'Martin Atomic 3000 LED',
    icon: ic('strobe'),
    ports: dmxThru(),
    powerW: 740,
    dmx: {
      footprint: 4,
      modes: [
        // i18n-ignore : clé de liste DMX
        { name: '4 canaux', channels: 4, params: ['Beam flash intensity', 'Beam flash duration', 'Beam flash rate', 'Beam special effects'] },
        // i18n-ignore : nom de canal DMX du fabricant (anglais)
        { name: 'Extended', channels: 14, params: ['Beam flash intensity', 'Beam flash duration', 'Beam flash rate', 'Beam special effects', 'Control / settings', 'FX select', 'FX adjustment', 'FX synchronization', 'Aura strobe/shutter effect', 'Aura dimmer', 'Aura red', 'Aura green', 'Aura blue', 'Aura color presets (‘color wheel’ effect)'] },
        // i18n-ignore : clé de liste DMX
        { name: '3 canaux', channels: 3, params: ['Beam flash intensity', 'Beam flash duration', 'Beam flash rate'] }
      ]
    },
    note: { fr: 'Le mode 4 canaux est celui de l’Atomic 3000 xénon d’origine ; le fabricant ne désigne pas de mode par défaut.', en: 'The 4-channel mode is that of the original xenon Atomic 3000; the manufacturer does not designate a default mode.' }
  },
  // Source (brochure du fabricant, copie hébergée par CCS Light & Sound, pas de page fabricant accessible) : https://www.ccslightsound.com.au/assets/brochures/KIT-358.pdf (consultée le 2026-10-14)
  // DMX 512 sur deux canaux consécutifs (pompe et ventilateur), « Power requirement 1500 Watt » ; pas de réseau.
  // Noms des canaux (ordre pompe puis ventilateur) : manuel d’utilisation https://www.looksolutions.com/uploads/pdf/en_fr/bed_unique21_1e.pdf (version 05/2021), § 5.4.1 « Operating via DMX 512 », p. 11, confirmé § 5.4.1.2 p. 12, consulté le 2026-10-15
  {
    id: 'look-unique-2-1',
    category: 'eclairage',
    name: { fr: 'Machine à brume Look Solutions Unique 2.1', en: 'Haze machine Look Solutions Unique 2.1' },
    code: 'HZ',
    vendor: 'Look Solutions',
    model: 'Look Solutions Unique 2.1',
    icon: ic('fog'),
    ports: dmxThru(),
    powerW: 1500,
    // i18n-ignore : clé de liste DMX
    dmx: { footprint: 2, modes: [{ name: 'Pompe et ventilateur', channels: 2, params: ['Pump', 'Fan'] }] },
    note: { fr: 'Deux canaux consécutifs : pompe, puis ventilateur. Une seule configuration DMX annoncée.', en: 'Two consecutive channels: pump, then fan. Only one DMX configuration announced.' }
  },
  // Source : fiche technique MDG theONE https://goknight.com/content/documentation/Product-data-sheet_theONE.pdf (fiche du fabricant MDG, copie hébergée par Knight)
  // et guide de démarrage rapide MDG https://goknight.com/content/documentation/theONE_Quick_Start_Rev_Ba.pdf (copie hébergée par Knight) (consultés le 2026-10-14)
  // « The Interface uses five (5) DMX channels » ; 1100–1480 W ; DMX XLR 5 broches et nœud RJ45 (Art-Net, sACN).
  // Noms des canaux : guide de démarrage rapide MDG, rév. B/a, février 2022 (déjà cité), « Working with DMX/RDM Control », p. 2 ; le guide ne donne que les libellés de valeurs, les noms en sont tirés, consulté le 2026-10-15
  {
    id: 'mdg-theone',
    category: 'eclairage',
    name: { fr: 'Machine à brume MDG theONE', en: 'Haze machine MDG theONE' },
    code: 'HZ',
    vendor: 'MDG',
    model: 'MDG theONE',
    icon: ic('fog'),
    ports: [...dmxThru(), rj45('ETH')],
    powerW: 1480,
    defaults: { vlanId: 50 },
    dmx: { footprint: 5, modes: [{ name: 'Standard', channels: 5, params: ['Unit off / on', 'Mode haze / fog', 'Fog output', 'Fog off / on', 'External fan'] }] },
    note: { fr: 'Puissance de 1 100 à 1 480 W (valeur maximale retenue) ; la fiche ne précise pas la vitesse du port RJ45.', en: 'Power from 1,100 to 1,480 W (maximum value used); the datasheet does not state the RJ45 port speed.' }
  },

  // Sources d’univers : non patchables (pas de champ dmx).
  // Source : https://www.enttec.com/sku/70407 et fiche https://cdn.enttec.com/pdf/assets/70407/70407_ODE_MK3_DATASHEET.pdf (fabricant, consultées le 2026-10-14)
  // 2 DMX bidirectionnels (XLR 5 broches femelle), 1 EtherCon 10/100 avec PoE IEEE 802.3af, entrée DC 12–24 V optionnelle, 2,3 W maximum.
  {
    id: 'enttec-ode-mk3',
    category: 'eclairage',
    name: { fr: 'Nœud DMX ENTTEC ODE Mk3', en: 'DMX node ENTTEC ODE Mk3' },
    code: 'DMX',
    vendor: 'ENTTEC',
    model: 'ENTTEC ODE Mk3',
    icon: ic('dmx-node'),
    ports: [rj45('ETH', { speedMbps: 100, poeIn: 'af', poeDrawW: 2.3 }), ...dmxOutputs(2), simple('dc', 'DC-IN', 'DC IN')],
    powerW: 2.3,
    defaults: { vlanId: 50 },
    note: { fr: 'Alimenté par PoE (802.3af) ou par une alimentation 12–24 V DC en option ; chaque sortie DMX est bidirectionnelle.', en: 'Powered by PoE (802.3af) or by an optional 12–24 V DC supply; each DMX output is bidirectional.' }
  },
  // Source : https://luminex.be/products/luminode/luminode-4 (page produit du fabricant, version demi-rack LU 01 00071, consultée le 2026-10-14)
  // 4 DMX XLR 5 broches (entrée ou sortie), 2 EtherCon 10/100/1000, PoE 802.3af classe 0 ou 100–240 V AC, 13 W maximum.
  {
    id: 'luminex-luminode-4',
    category: 'eclairage',
    name: { fr: 'Nœud DMX Luminex LumiNode 4', en: 'DMX node Luminex LumiNode 4' },
    code: 'DMX',
    vendor: 'Luminex',
    model: 'Luminex LumiNode 4',
    icon: ic('dmx-node'),
    ports: [rj45('ETH-1', { poeIn: 'af', poeDrawW: 13 }), rj45('ETH-2'), ...dmxOutputs(4)],
    powerW: 13,
    defaults: { vlanId: 50 },
    note: { fr: 'Version demi-rack : PoE 802.3af ou secteur 100–240 V ; la fiche ne dit pas lequel des deux ports Ethernet reçoit le PoE (ETH-1 retenu). Existe aussi en DIN et en mural.', en: 'Half-rack version: 802.3af PoE or 100–240 V mains; the datasheet does not say which of the two Ethernet ports receives PoE (ETH-1 used). Also available in DIN and wall-mount versions.' }
  },
  // Source : manuel https://dmxking.com/downloads/eDMX4%20PRO%20User%20Manual%20(EN).pdf (fabricant, réf. 0104-700-3.13, consulté le 2026-10-14)
  // 4 DMX en entrée ou sortie (XLR 3 ou 5 broches selon l’option), 1 etherCON 10/100, PoE 802.3af, « maximum power budget 8W ».
  {
    id: 'dmxking-edmx4-pro',
    category: 'eclairage',
    name: { fr: 'Nœud DMX DMXking eDMX4 PRO', en: 'DMX node DMXking eDMX4 PRO' },
    code: 'DMX',
    vendor: 'DMXking',
    model: 'DMXking eDMX4 PRO',
    icon: ic('dmx-node'),
    ports: [rj45('ETH', { speedMbps: 100, poeIn: 'af', poeDrawW: 8 }), ...dmxOutputs(4)],
    powerW: 8,
    defaults: { vlanId: 50 },
    note: { fr: 'Alimenté uniquement par PoE ; 8 W : budget de puissance maximal publié par le fabricant, pas une consommation mesurée. Pas d’entrée DC sur cette version (les versions DIN en ont une).', en: 'Powered by PoE only; 8 W: maximum power budget published by the manufacturer, not a measured consumption. No DC input on this version (the DIN versions have one).' }
  },
  // Source : fiche technique https://www.ac-et.com/storage/product_images/advatek/a4_s_mk3/pixlite-a4-s-mk3-datasheet_20250225.pdf (Advatek, copie hébergée par AC Entertainment Technologies, consultée le 2026-10-14)
  // 4 sorties pixels alimentées (7 A chacune, 28 A au total), 2 Ethernet 10/100/1000, port auxiliaire RS485 DMX en entrée ou sortie, entrée 5–24 V DC, pas de PoE.
  {
    id: 'advatek-pixlite-a4s-mk3',
    category: 'eclairage',
    name: { fr: 'Contrôleur de pixels Advatek PixLite A4-S Mk3', en: 'Pixel controller Advatek PixLite A4-S Mk3' },
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
    note: { fr: 'Alimentation 5–24 V DC qui alimente aussi les pixels (7 A par sortie). Puissance en watts non publiée : elle dépend des pixels raccordés.', en: '5–24 V DC supply that also powers the pixels (7 A per output). Wattage not published: it depends on the connected pixels.' }
  },
  // Source : fiche technique https://www.ac-et.com/storage/product_images/advatek/t8_s_mk3/pixlite-t8-s-mk3-datasheet_20250225.pdf (Advatek, copie hébergée par AC Entertainment Technologies, consultée le 2026-10-14)
  // 8 sorties de données RJ45 (émetteur longue portée, non alimentées), 2 Ethernet 10/100/1000, port auxiliaire RS485 DMX en entrée ou sortie, secteur 100–240 V AC.
  {
    id: 'advatek-pixlite-t8s-mk3',
    category: 'eclairage',
    name: { fr: 'Contrôleur de pixels Advatek PixLite T8-S Mk3', en: 'Pixel controller Advatek PixLite T8-S Mk3' },
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
    note: { fr: 'Émetteur longue portée : chaque sortie RJ45 alimente un récepteur. Secteur 100–240 V AC ; puissance en watts non publiée.', en: 'Long-range transmitter: each RJ45 output feeds a receiver. 100–240 V AC mains; wattage not published.' }
  },
  // Source : fiche https://enttec.com.cn/wp-content/uploads/2020/09/70304_DMX-USB-PRO_DS.pdf (ENTTEC, site chinois du fabricant ; même fiche que celle copiée par Thomann) (consultée le 2026-10-14)
  // USB 1.1/2.0, entrée DMX et sortie DMX en XLR 5 broches, « Power requirements 300mA supplied by USB ».
  {
    id: 'enttec-dmx-usb-pro',
    category: 'eclairage',
    name: { fr: 'Interface DMX ENTTEC DMX USB Pro', en: 'DMX interface ENTTEC DMX USB Pro' },
    code: 'USB',
    vendor: 'ENTTEC',
    model: 'ENTTEC DMX USB Pro',
    icon: ic('dmx-node'),
    ports: [simple('usb', 'USB'), simple('dmx', 'DMX-IN', 'DMX IN'), simple('dmx', 'DMX-1', 'DMX 1')],
    powerW: 1.5,
    note: { fr: '≈ 1,5 W (5 V × 300 mA, calculé d’après la fiche). Alimentée par le port USB de l’ordinateur.', en: '≈ 1.5 W (5 V × 300 mA, calculated from the datasheet). Powered by the computer’s USB port.' }
  }
]
