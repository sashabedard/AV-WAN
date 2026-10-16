// Capteurs nommés (spec patch-puissance-catalogue § 7). Chaque valeur vient de la source citée au-dessus du gabarit.
import type { DeviceTemplate } from '../../model/types'
import { ic } from '../ic'
import { rj45, simple } from '../ports'

export const SENSOR_MODELS: readonly DeviceTemplate[] = [
  // Source : https://www.livoxtech.com/mid-360/specs (fiche technique du fabricant, consultée le 2026-10-14)
  // Ethernet 100BASE-TX, 9–27 V DC, 6,5 W en moyenne (pointe à 14 W par temps froid). La fiche ne mentionne pas de PoE.
  {
    id: 'livox-mid-360',
    category: 'capteur',
    name: { fr: 'LiDAR Livox Mid-360', en: 'LiDAR Livox Mid-360' },
    code: 'LDR',
    vendor: 'Livox',
    model: 'Livox Mid-360',
    icon: ic('lidar'),
    ports: [rj45('ETH', { speedMbps: 100 }), simple('dc', 'DC-IN', 'DC IN')],
    powerW: 6.5,
    defaults: { vlanId: 60 },
    note: { fr: 'Alimentation 9–27 V DC séparée ; 6,5 W en moyenne, jusqu’à 14 W par temps froid.', en: 'Separate 9–27 V DC power supply; 6.5 W on average, up to 14 W in cold weather.' }
  },
  // Source (tiers, pas de fiche fabricant) : https://derivative.ca/UserGuide/Kinect1 (consultée le 2026-10-14)
  // Bloc secteur indispensable ; USB 2.0 conseillé. Aucune puissance publiée.
  {
    id: 'kinect-v1',
    category: 'capteur',
    name: { fr: 'Caméra de profondeur Microsoft Kinect v1 (Xbox 360)', en: 'Depth camera Microsoft Kinect v1 (Xbox 360)' },
    code: 'DEP',
    vendor: 'Microsoft',
    model: 'Microsoft Kinect v1',
    icon: ic('depth-camera'),
    ports: [simple('usb', 'USB')],
    note: { fr: 'Nécessite l’adaptateur secteur/USB Kinect pour PC ; puissance non publiée.', en: 'Requires the Kinect AC/USB adapter for PC; power not published.' }
  },
  // Source : https://support.xbox.com/en-US/help/hardware-network/kinect/kinect-for-windows-v2-setup-with-adapter
  // et https://learn.microsoft.com/en-us/archive/blogs/kinectforwindows/revealing-kinect-for-windows-v2-hardware (consultées le 2026-10-14)
  {
    id: 'kinect-v2',
    category: 'capteur',
    name: { fr: 'Caméra de profondeur Microsoft Kinect v2 (Xbox One)', en: 'Depth camera Microsoft Kinect v2 (Xbox One)' },
    code: 'DEP',
    vendor: 'Microsoft',
    model: 'Microsoft Kinect v2',
    icon: ic('depth-camera'),
    ports: [simple('usb', 'USB')],
    note: { fr: 'Discontinuée (2017). Sur PC : « Kinect Adapter for Windows » (hub USB 3.0 + bloc secteur) obligatoire. Puissance non publiée par le fabricant.', en: 'Discontinued (2017). On PC: the “Kinect Adapter for Windows” (USB 3.0 hub + power supply) is required. Power not published by the manufacturer.' }
  },
  // Source : https://learn.microsoft.com/en-us/previous-versions/azure/kinect-dk/hardware-specification (fiche du fabricant, consultée le 2026-10-14)
  // « consumes up to 5.9 W » ; alimentation par prise coaxiale 4,5/3,0 mm ou par câble USB-C (tension non publiée).
  {
    id: 'azure-kinect-dk',
    category: 'capteur',
    name: { fr: 'Caméra de profondeur Microsoft Azure Kinect DK', en: 'Depth camera Microsoft Azure Kinect DK' },
    code: 'DEP',
    vendor: 'Microsoft',
    model: 'Microsoft Azure Kinect DK',
    icon: ic('depth-camera'),
    ports: [simple('usb', 'USB-C'), simple('dc', 'DC-IN', 'DC IN')],
    powerW: 5.9,
    note: { fr: 'Discontinuée. Alimentée par son bloc (prise coaxiale) ou par un câble USB-C data + alimentation (1,5 A minimum).', en: 'Discontinued. Powered by its power supply (coaxial jack) or by a USB-C data + power cable (1.5 A minimum).' }
  },
  // Source : https://doc.orbbec.com/documentation/Orbbec Femto Mega Documentation/Femto Mega Hardware Specifications
  // et copie de la fiche technique v1.1, hébergée par DigiKey : https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/6348/Femto-Mega.pdf (consultées le 2026-10-14)
  // Fiche : PoE+/802.3at, DC 12 V 2 A, USB-C ; 17 W en pointe sur PoE (16 W sur DC, 14 W sur USB).
  {
    id: 'orbbec-femto-mega',
    category: 'capteur',
    name: { fr: 'Caméra de profondeur Orbbec Femto Mega', en: 'Depth camera Orbbec Femto Mega' },
    code: 'DEP',
    vendor: 'Orbbec',
    model: 'Orbbec Femto Mega',
    icon: ic('depth-camera'),
    ports: [rj45('ETH', { poeIn: 'at', poeDrawW: 17 }), simple('usb', 'USB-C'), simple('dc', 'DC-IN', 'DC IN')],
    powerW: 17,
    defaults: { vlanId: 60 },
    note: { fr: 'Alimentation au choix : PoE+ (802.3at), bloc DC 12 V ou USB-C ; 17 W en pointe sur PoE.', en: 'Power from your choice of PoE+ (802.3at), 12 V DC supply or USB-C; 17 W peak on PoE.' }
  },
  // Source : https://doc.orbbec.com/documentation/Orbbec Femto Bolt Documentation/Femto Bolt Hardware Specifications
  // et https://www.orbbec.com/wp-content/uploads/2023/08/ORBBEC_Datasheet_Femto-Bolt-0816-v01.pdf (consultées le 2026-10-14)
  // Fiche : DC 12 V 2 A ou USB-C ; 8,7 W en pointe sur DC (7,7 W sur USB-C).
  {
    id: 'orbbec-femto-bolt',
    category: 'capteur',
    name: { fr: 'Caméra de profondeur Orbbec Femto Bolt', en: 'Depth camera Orbbec Femto Bolt' },
    code: 'DEP',
    vendor: 'Orbbec',
    model: 'Orbbec Femto Bolt',
    icon: ic('depth-camera'),
    ports: [simple('usb', 'USB-C'), simple('dc', 'DC-IN', 'DC IN')],
    powerW: 8.7,
    note: { fr: 'Alimentation par bloc DC 12 V ou par le câble USB-C (1,5 A minimum) ; 8,7 W en pointe sur DC.', en: 'Powered by a 12 V DC supply or by the USB-C cable (1.5 A minimum); 8.7 W peak on DC.' }
  },
  // Source : https://www.realsenseai.com/download/21345/ (fiche technique D400, doc. 337029-017, consultée le 2026-10-14)
  // Carte D4 USB Type-C alimentée par le bus : 5 V, 700 mA maximum (tableau 3-46).
  {
    id: 'realsense-d435i',
    category: 'capteur',
    name: { fr: 'Caméra de profondeur Intel RealSense D435i', en: 'Depth camera Intel RealSense D435i' },
    code: 'DEP',
    vendor: 'Intel',
    model: 'Intel RealSense D435i',
    icon: ic('depth-camera'),
    ports: [simple('usb', 'USB-C')],
    note: { fr: 'Puissance non publiée ; le bus USB-C fournit au plus 5 V × 700 mA.', en: 'Power not published; the USB-C bus supplies at most 5 V × 700 mA.' }
  },
  // Source : https://www.realsenseai.com/download/21345/ (fiche technique D400, doc. 337029-017, consultée le 2026-10-14)
  // Même carte D4 USB Type-C que la D435i : 5 V, 700 mA maximum.
  {
    id: 'realsense-d455',
    category: 'capteur',
    name: { fr: 'Caméra de profondeur Intel RealSense D455', en: 'Depth camera Intel RealSense D455' },
    code: 'DEP',
    vendor: 'Intel',
    model: 'Intel RealSense D455',
    icon: ic('depth-camera'),
    ports: [simple('usb', 'USB-C')],
    note: { fr: 'Puissance non publiée ; le bus USB-C fournit au plus 5 V × 700 mA.', en: 'Power not published; the USB-C bus supplies at most 5 V × 700 mA.' }
  },
  // Source : https://www.stereolabs.com/en-sg/store/products/zed-2i (page produit du fabricant, consultée le 2026-10-14)
  // « Power via USB 5V / 380mA », USB 3.0 Type-C à vis de verrouillage ; 5 V × 0,38 A = 1,9 W.
  {
    id: 'zed-2i',
    category: 'capteur',
    name: { fr: 'Caméra stéréo Stereolabs ZED 2i', en: 'Stereo camera Stereolabs ZED 2i' },
    code: 'DEP',
    vendor: 'Stereolabs',
    model: 'Stereolabs ZED 2i',
    icon: ic('depth-camera'),
    ports: [simple('usb', 'USB-C')],
    powerW: 1.9,
    note: { fr: '≈ 1,9 W (5 V × 380 mA, calculé d’après la fiche).', en: '≈ 1.9 W (5 V × 380 mA, calculated from the datasheet).' }
  },
  // Source : https://ouster.com/os-overview (10 à 20 W, 12/24 V, 1000BASE-T)
  // et https://static.ouster.dev/sensor-docs/hw_user_manual/hw_common_sections_OS0/electrical-interface.html (pointe 28 W à -40 °C ;
  // boîtier d’interface : RJ45 gigabit + bloc 24 V DC) (consultées le 2026-10-14)
  {
    id: 'ouster-os1',
    category: 'capteur',
    name: { fr: 'LiDAR Ouster OS1', en: 'LiDAR Ouster OS1' },
    code: 'LDR',
    vendor: 'Ouster',
    model: 'Ouster OS1',
    icon: ic('lidar'),
    ports: [rj45('ETH'), simple('dc', 'DC-IN', 'DC IN')],
    powerW: 20,
    defaults: { vlanId: 60 },
    note: { fr: 'Boîtier d’interface (RJ45 gigabit + bloc 24 V DC) pour l’intérieur ; 10 à 20 W, jusqu’à 28 W par grand froid.', en: 'Interface box (gigabit RJ45 + 24 V DC supply) for indoor use; 10 to 20 W, up to 28 W in extreme cold.' }
  },
  // Source : https://www.hokuyo-aut.jp/search/single.php?serial=167 et copie de la fiche, hébergée par l’université de Brême : https://www.ai.uni-bremen.de/wiki/_media/software/ust-10lx_specification.pdf (consultées le 2026-10-14)
  // 12/24 V DC (plage 10–30 V), 150 mA (450 mA au démarrage), Ethernet 100BASE-TX ; aucune puissance en watts publiée.
  {
    id: 'hokuyo-ust-10lx',
    category: 'capteur',
    name: { fr: 'LiDAR Hokuyo UST-10LX', en: 'LiDAR Hokuyo UST-10LX' },
    code: 'LDR',
    vendor: 'Hokuyo',
    model: 'Hokuyo UST-10LX',
    icon: ic('lidar'),
    ports: [rj45('ETH', { speedMbps: 100 }), simple('dc', 'DC-IN', 'DC IN')],
    defaults: { vlanId: 60 },
    note: { fr: 'Alimentation 12 ou 24 V DC (150 mA, 450 mA au démarrage). Puissance en watts non publiée par le fabricant.', en: '12 or 24 V DC supply (150 mA, 450 mA at startup). Wattage not published by the manufacturer.' }
  },
  // Source : https://optitrack.com/cameras/primex-22/specs et https://docs.optitrack.com/hardware/cabling-and-wiring/cabling-and-load-balancing (consultées le 2026-10-14)
  // Alimentation PoE+, Ethernet gigabit ; 30 W réservés par port pour le bilan du switch, consommation réelle non publiée.
  {
    id: 'optitrack-primex-22',
    category: 'capteur',
    name: { fr: 'Caméra de capture de mouvement OptiTrack PrimeX 22', en: 'Motion-capture camera OptiTrack PrimeX 22' },
    code: 'MOC',
    vendor: 'OptiTrack',
    model: 'OptiTrack PrimeX 22',
    icon: ic('camera'),
    ports: [rj45('ETH', { poeIn: 'at' })],
    defaults: { vlanId: 60 },
    note: { fr: 'PoE+ requis ; consommation non publiée, OptiTrack réserve 30 W par port de switch.', en: 'PoE+ required; consumption not published, OptiTrack reserves 30 W per switch port.' }
  },
  // Source : fiche technique Ultraleap UL-006511-SP (copie https://cdn.robotshop.com/media/L/Lep/RB-Lep-12/pdf/Leap Motion Controller 2 Datasheet.pdf, consultée le 2026-10-14)
  // « 5VDC via USB, 500 mA », USB 3.0 par connecteur Type-C ; 5 V × 0,5 A = 2,5 W.
  {
    id: 'leap-motion-2',
    category: 'capteur',
    name: { fr: 'Ultraleap Leap Motion Controller 2', en: 'Ultraleap Leap Motion Controller 2' },
    code: 'HND',
    vendor: 'Ultraleap',
    model: 'Ultraleap Leap Motion Controller 2',
    icon: ic('depth-camera'),
    ports: [simple('usb', 'USB-C')],
    powerW: 2.5,
    note: { fr: '≈ 2,5 W (5 V × 500 mA, calculé d’après la fiche).', en: '≈ 2.5 W (5 V × 500 mA, calculated from the datasheet).' }
  }
]
