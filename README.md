<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/banniere-sombre.png">
    <img alt="AV·WAN — Audio-Vidéo · Wiring, Addressing, Networking" src=".github/assets/banniere-claire.png" width="100%">
  </picture>
</p>

<p align="center">
  <b>Planifier. Brancher. Documenter.</b>
</p>

<p align="center">
  <img alt="Statut : plan 3 terminé" src="https://img.shields.io/badge/statut-plan%203%20termin%C3%A9-F2A93B?style=flat-square&labelColor=1D2125">
  <img alt="macOS et Windows, hors ligne" src="https://img.shields.io/badge/macOS%20%C2%B7%20Windows-hors%20ligne-8E969F?style=flat-square&labelColor=1D2125">
  <img alt="Electron, React, React Flow" src="https://img.shields.io/badge/Electron%20%C2%B7%20React%20%C2%B7%20React%20Flow-3E8EF7?style=flat-square&labelColor=1D2125">
  <img alt="Interface en français" src="https://img.shields.io/badge/interface-fran%C3%A7ais-3DBE6E?style=flat-square&labelColor=1D2125">
</p>

---

## Pourquoi AV·WAN

Un projet d'installation interactive met en réseau des choses très différentes : des caméras PTZ en NDI, une carte Dante, des contrôleurs de pixels, des ESP32, un broker MQTT, une régie. Il faut ensuite remettre un **schéma de branchement** et une **liste de branchement** fiables, et les outils existants compliquent la tâche :

- **Les outils de dessin** (draw.io, Visio) ne savent pas ce qu'est un port, un VLAN ou le PoE. Chaque information est ressaisie à la main, et le schéma et le tableau finissent par se contredire.
- **Les outils AV professionnels** qui génèrent ces listes coûtent de 15 à 170 $ US par mois ou ne tournent que sous Windows.
- **Les simulateurs réseau** (Packet Tracer, GNS3) ne connaissent ni Dante, ni NDI, ni l'éclairage.

AV·WAN est gratuit, fonctionne hors ligne sur macOS et Windows, et est en français. Chaque câble est attaché à **un port précis**. La documentation est générée à partir du schéma, donc les deux ne se contredisent jamais.

## Aperçu

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/capture-sombre.png">
    <img alt="AV·WAN : le projet exemple, avec une régie, une salle et une scène, des cordons colorés par VLAN et l'inspecteur d'une caméra" src=".github/assets/capture-clair.png" width="100%">
  </picture>
</p>

<p align="center"><sub>Le projet exemple livré avec l'app : régie, salle et scène, deux switchs reliés en fibre, cordons colorés par VLAN. L'app suit le thème clair ou sombre du système, ou celui choisi en haut à droite.</sub></p>

## Ce que fait la v1

| | |
|---|---|
| **Dessiner** | Canvas infini. Glisser un appareil depuis la palette (40 gabarits avec leurs icônes : switch, AP, caméras PTZ NDI, Dante AVIO, ESP32-POE, PixLite, broker MQTT, panneau de brassage…) ou le trouver avec `⌘K`, puis glisser pour le déplacer, avec alignement sur une grille de 8 px. |
| **Organiser** | Zones (régie, salle, scène) qui emportent leurs appareils, `⌘G` pour en créer une autour de la sélection. Copier, coller, dupliquer, renommer d'un double-clic. |
| **Voir** | Couleur des cordons par VLAN, par type de câble ou par port. Un clic sur un VLAN de la légende met ses appareils en évidence. Minicarte, `⌘0` pour tout cadrer. **Vue épinglée** (`⇧⌘P`) : une vignette figée sur un cadre du schéma, à jour en direct, pendant que la vue principale reste libre ; un clic y sélectionne, un double-clic y recentre la vue principale. |
| **Configurer un switch** | 4, 5, 8, 12, 16, 24 ou 48 ports, PoE / PoE+ / PoE++ avec budget en watts, 0, 2 ou 4 cages SFP+. La façade est dessinée comme le vrai matériel. |
| **Brancher** | Glisser d'un port à un autre, ou lâcher le câble sur l'appareil : AV·WAN choisit un port libre compatible, et un port PoE pour un appareil alimenté. Un port n'accepte qu'un seul câble. On rebranche un bout de câble en le glissant, et on déplace son coude. |
| **Régler** | IP de chaque appareil (bascule *Statique / DHCP*), VLAN en accès ou en trunk, médium (Cat6, fibre OM4, DAC, Wi-Fi…), longueur. |
| **Documenter** | Liste de branchement, fiches par appareil, carte des ports de chaque switch, fiches VLAN avec les réglages UniFi (IGMP Snooping, Querier, profil ProAV…), plan d'adressage IP, nomenclature. |
| **Exporter** | PDF vectoriel en Tabloïd + Lettre (ou A3 + A4) avec un cartouche sur chaque page, CSV et Excel. |

### Exports

`⌘E` (ou le bouton **Exporter** en haut) ouvre la boîte d'export :

- **PDF vectoriel**, texte sélectionnable, cartouche et « page x / y » sur chaque page :
  1. schéma en Tabloïd (ou A3) paysage, avec sa légende, plus une page agrandie par zone marquée « page séparée » ;
  2. fiches par appareil, une ligne par branchement (« ETH › SW-2 · port 1 · PoE+ actif (25 W) · VLAN 40 NDI · C-010 Cat6 12 m ») ;
  3. carte des ports de chaque switch : la façade colorée par VLAN natif, puis le tableau port par port ;
  4. liste de branchement ;
  5. fiches VLAN avec les réglages UniFi sous leurs noms exacts ;
  6. plan d'adressage IP, trié par VLAN puis par adresse ;
  7. nomenclature : appareils, câbles par longueur arrondie au mètre, modules SFP+ déduits.
- **CSV** pour Excel en français (séparateur « ; », UTF-8) : liste de branchement, plan IP et nomenclature, un fichier chacun.
- **Classeur Excel** : les trois mêmes listes, une feuille chacune, en-têtes figés et filtres activés.

Le PDF, le CSV et le classeur lisent les mêmes tableaux : ils ne se contredisent jamais.

## Lire un schéma AV·WAN

| Ce que vous voyez | Ce que ça veut dire |
|---|---|
| **Couleur du cordon** | Son VLAN : Dante en rouge, NDI en bleu, IoT en jaune… |
| **Trait** | Le médium : cuivre en trait plein, fibre avec un liseré tireté, Wi-Fi en pointillé, USB/DMX/HDMI en tirets avec une pastille. |
| **Cordon neutre avec des bagues de couleur** | Un trunk. Chaque bague est un VLAN étiqueté qui passe sur ce câble. |
| **DEL d'un port** | Ambre : le port alimente un appareil (PoE). Vert : lien sans PoE. Éteinte : port libre. |
| **Fiche de couleur enfoncée dans un port** | Le port est occupé. |
| **Éclair ⚡ près d'un bout** | Le côté qui fournit l'alimentation PoE. |
| **Cadre teinté avec un titre** | Une zone : régie, salle, scène… |
| **Étiquette ruban** | Le nom de l'appareil (`CAM-PTZ-1`). Le code encadré (`CAM`, `DNT`, `IOT`) donne son type. |

## VLAN prédéfinis

Ils s'ajoutent en un clic. Tout reste modifiable : numéros, couleurs, sous-réseaux et réglages.

| | ID | Nom | Sous-réseau | Réglages UniFi clés |
|---|---|---|---|---|
| <img src="https://img.shields.io/badge/%20-%20-8E969F?style=flat-square" height="14"> | 10 | Gestion | 10.10.10.0/24 | Network Isolation |
| <img src="https://img.shields.io/badge/%20-%20-A78BFA?style=flat-square" height="14"> | 20 | Contrôle / OSC | 10.20.0.0/24 | IGMP Snooping, Querier, mDNS |
| <img src="https://img.shields.io/badge/%20-%20-E5484D?style=flat-square" height="14"> | 30 | Dante A | 10.30.0.0/24 | IGMP, Querier, Fast Leave, Flood Known Protocols, profil ProAV « Dante Audio » |
| <img src="https://img.shields.io/badge/%20-%20-E86FB0?style=flat-square" height="14"> | 31 | Dante B | 172.31.0.0/16 | Comme Dante A, sans DHCP, jamais routé |
| <img src="https://img.shields.io/badge/%20-%20-3E8EF7?style=flat-square" height="14"> | 40 | NDI | 10.40.0.0/23 | IGMP, Querier, trames jumbo désactivées |
| <img src="https://img.shields.io/badge/%20-%20-3DBE6E?style=flat-square" height="14"> | 50 | Éclairage | 10.50.0.0/24 | sACN / Art-Net isolés |
| <img src="https://img.shields.io/badge/%20-%20-F2C94C?style=flat-square" height="14"> | 60 | IoT / MQTT | 10.60.0.0/24 | Network Isolation, Wi-Fi 2,4 GHz |
| <img src="https://img.shields.io/badge/%20-%20-F08A3C?style=flat-square" height="14"> | 70 | Caméras | 10.70.0.0/24 | Network Isolation |
| <img src="https://img.shields.io/badge/%20-%20-36C2C9?style=flat-square" height="14"> | 80 | Médias | 10.80.0.0/24 | Trames jumbo possibles |
| <img src="https://img.shields.io/badge/%20-%20-C9B28A?style=flat-square" height="14"> | 99 | Invités | 10.99.0.0/24 | Isolation, accès Internet |

Pourquoi séparer Dante, NDI et l'éclairage ? Leurs flux multicast tombent tous dans la plage `239.255.x.x`. Sur un même VLAN, ils se marchent dessus.

## Feuille de route

- [x] **Plan 1 — Fondations** : canvas, palette, façade de switch, cordons, branchement, inspecteur, fichier `.avwan`, annuler/rétablir, test de bout en bout et mesure de fluidité (150 appareils, 400 câbles).
- [x] **Plan 2 — Canvas complet et identité** : **logo et icône d'app**, jeu d'icônes maison, zones (régie, salle, scène), panneau VLAN, modes de couleur *Type* et *Port*, recherche `⌘K`, projet exemple, **captures d'écran de ce README**.
- [x] **Plan 3 — Rapports et exports** : PDF vectoriel (schéma, pages de zone, fiches, cartes des ports, branchement, VLAN, plan IP, nomenclature), CSV et Excel, VLAN à travers le panneau de brassage.
- [ ] **Plan 4 — Distribution** : `.dmg` universel et `.exe` avec leurs icônes, autosauvegarde et récupération, composantes perso avec import d'icône.

## Démarrer (développement)

Il faut Node.js 24 ou plus récent (testé avec Node 26) et npm 11.

```bash
npm install          # installe aussi le binaire Electron (postinstall)
npm run dev          # lance l'app avec rechargement à chaud
npm test             # tests unitaires et de composants (Vitest)
npm run typecheck    # TypeScript strict
npm run e2e          # build, puis tests de bout en bout (Playwright + Electron)
npm run peek         # capture d'écran de l'app, fenêtre jamais visible (test-results/peek.png)
npm run captures     # régénère les captures du README depuis le projet exemple
npm run rendu:maj    # met à jour les captures de référence du canvas (e2e/rendu.spec.ts-snapshots)
npm run brand        # régénère l'icône d'app et les logos depuis build/icon.svg (macOS)
npm run build        # build de production dans out/
```

## Installer

Les installeurs `.dmg` et `.exe` arrivent avec le plan 4. L'app n'est pas signée, donc il faut une étape de plus au premier lancement :

- **macOS** : Réglages Système › Confidentialité et sécurité › **Ouvrir quand même**.
- **Windows** : dans la fenêtre SmartScreen, **Informations complémentaires › Exécuter quand même**.

## Architecture

```
src/main/        processus Electron : fichiers .avwan (écriture atomique), menu natif, IPC,
                 export PDF (fenêtre d'impression cachée), CSV et Excel
src/preload/     pont sécurisé (sandbox, contextIsolation)
src/shared/      types communs : API IPC, tableaux de données, options du PDF
src/renderer/    l'interface React
  model/         le projet : schéma zod, règles de branchement, VLAN et PoE dérivés
  catalog/       gabarits d'appareils, configurateur de switch, VLAN prédéfinis
  reports/       rapports purs : branchement, fiches, ports, VLAN, IP, nomenclature
  export/        vue d'impression du PDF et boîte d'export
  store/         état du projet, historique d'annulation, sélection
  canvas/        React Flow : façade de switch, tuiles, cordons
  panels/        palette, inspecteur
```

**Une seule source de vérité.** Le projet est un fichier JSON validé. Le canvas, l'inspecteur et le PDF n'en sont que des *vues*, ce qui les empêche de se contredire. `model/`, `catalog/` et `reports/` ne dépendent ni de l'interface ni d'Electron, et sont testés en quelques millisecondes.

Pour aller plus loin :

## Le nom

<img src=".github/assets/icone-app.png" alt="Icône d'AV·WAN : trois cordons de couleur branchés sur une façade de switch" width="96" align="right">

**AV·WAN** se prononce « Avi-Wan ». Oui, ça sonne comme vous le pensez.

C'est l'acronyme d'**A**udio-**V**idéo · **W**iring, **A**ddressing, **N**etworking. Chaque lettre de WAN correspond à une partie de l'app : les câbles, les adresses IP et les VLAN.

## Crédits

- Canvas : [React Flow](https://reactflow.dev) (MIT).
- Typographie : [Archivo Narrow](https://fonts.google.com/specimen/Archivo+Narrow) et [IBM Plex Mono](https://github.com/IBM/plex) (SIL Open Font License), incluses dans l'app pour fonctionner hors ligne.
- Construit avec Electron, React, zustand, zod et Vitest.

## Licence

À définir.
