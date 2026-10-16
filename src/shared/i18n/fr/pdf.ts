import { frPlural } from '../plural'

// Textes de la vue d'impression du PDF (rendue dans la langue des documents).
export const pdf = {
  overview: 'Vue d’ensemble',
  zoneTitle: (p: { name: string }) => `Zone : ${p.name}`,
  detailPage: (p: { page: number }) => `Détail p. ${p.page}`,
  emptyDiagram: 'Aucun appareil sur le schéma.',
  field: (p: { label: string; value: string }) => `${p.label} : ${p.value}`,
  fields: { ip: 'IP', hostname: 'Nom d’hôte', zone: 'Zone' },
  footer: { revision: 'Rév.', page: 'Page' },
  status: { conception: 'Conception', 'tel-que-construit': 'Tel que construit' },
  titleBlock: { course: 'Cours', authors: 'Auteurs', revision: 'Révision', date: 'Date', status: 'Statut' },
  legend: {
    label: 'Légende',
    colorVlan: 'Couleur : VLAN',
    colorType: 'Couleur : type de câble',
    colorPort: 'Couleur : ports',
    trunk: 'Trunk (bagues = VLAN)',
    noVlan: 'Sans VLAN',
    portNote: 'Câbles neutres ; le port est indiqué aux deux bouts.',
    strokes: 'Traits',
    copper: 'Cuivre',
    fiber: 'Fibre',
    dac: 'DAC',
    wifi: 'Wi-Fi',
    simple: 'Liens simples',
    poe: 'PoE actif'
  },
  rack: {
    title: (p: { name: string; zone?: string; heightU: number }) => `Élévation · ${p.name}${p.zone ? ` · ${p.zone}` : ''} · ${p.heightU}U`,
    tooMany: 'Trop de câbles pour cette échelle — voir la liste de branchement.'
  },
  empty: {
    cabling: 'Aucun câble dans le projet.',
    ip: 'Aucune adresse IP dans le projet.',
    bom: 'Projet vide : rien à commander.',
    devices: 'Aucun appareil hors switch dans le projet.',
    noCable: 'Aucun câble branché.',
    patch: 'Aucun appareil patchable dans le projet.',
    channels: 'Aucun canal nommé. Les canaux se nomment dans l’inspecteur, section Patch DMX.',
    switches: 'Aucun switch dans le projet.',
    vlans: 'Aucun VLAN dans le projet.',
    power: 'Aucune puissance renseignée dans le projet.'
  },
  headings: {
    devices: 'Fiches par appareil',
    channels: 'Canaux DMX',
    portMaps: 'Carte des ports',
    vlans: 'Fiches VLAN',
    psus: 'Alimentations'
  },
  portMap: {
    title: (p: { name: string }) => `Carte des ports · ${p.name}`,
    facadeAria: (p: { name: string }) => `Façade de ${p.name}`,
    key: 'Couleur = VLAN natif · contour épais = trunk · éclair = PoE actif',
    port: 'Port',
    connectedTo: 'Branché à'
  },
  vlanMembers: (p: { count: number; list: string; cables: number }) => `Membres (${p.count}) : ${p.list} · ${p.cables} câble${frPlural(p.cables, '', 's')}`,
  power: {
    total: (p: { watts: string; amps: string; voltage: number }) => `Total : ${p.watts} W · ${p.amps} A à ${p.voltage} V`,
    missing: (p: { n: number; list: string; more: number }) =>
      `${p.n} appareil${frPlural(p.n, '', 's')} sans puissance renseignée : ${p.list}${p.more > 0 ? ` et ${p.more} autre${frPlural(p.more, '', 's')}` : ''}`,
    note: 'Facteur de puissance supposé égal à 1. Alimentations comptées à leur puissance nominale ; appareils PoE comptés dans leur switch.',
    percent: (p: { n: number }) => `${p.n} %`
  }
} as const
