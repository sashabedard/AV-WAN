// Boîte d'export et messages des exports. Les libellés des sections sont dans la langue de l'interface.
export const exportMessages = {
  sections: {
    schema: 'Schéma',
    appareils: 'Fiches par appareil',
    ports: 'Carte des ports par switch',
    branchement: 'Liste de branchement',
    vlans: 'Fiches VLAN',
    ip: 'Plan d’adressage IP',
    patch: 'Patch DMX',
    canaux: 'Canaux DMX',
    puissance: 'Bilan de puissance',
    nomenclature: 'Nomenclature',
    baies: 'Élévations de baie',
    'baies-cables': 'Élévations de baie avec câbles'
  },
  formats: { na: 'Tabloïd 11×17 + Lettre', iso: 'A3 + A4' },
  dialog: {
    title: 'Exporter le PDF',
    sections: 'Sections',
    zonePages: (p: { n: number }) => `Pages de zone agrandies (${p.n})`,
    format: 'Format',
    formatAria: 'Format des pages',
    noRacks: 'Aucune baie dans le projet : ces deux sections sont indisponibles.',
    docLang: 'Langue des documents',
    lists: 'Listes (branchement, plan IP, nomenclature)',
    csv: 'CSV…',
    xlsx: 'Excel…',
    submit: 'Exporter le PDF…'
  },
  toast: {
    preparing: 'Préparation du PDF…',
    pdfExported: (p: { name: string }) => `PDF exporté : ${p.name}`,
    pdfFailed: (p: { reason: string }) => `Échec de l’export PDF : ${p.reason}`,
    csvExported: (p: { n: number; names: string }) => `${p.n} fichiers CSV exportés : ${p.names}`,
    csvFailed: (p: { reason: string }) => `Échec de l’export CSV : ${p.reason}`,
    xlsxExported: (p: { name: string }) => `Classeur Excel exporté : ${p.name}`,
    xlsxFailed: (p: { reason: string }) => `Échec de l’export Excel : ${p.reason}`
  }
} as const
