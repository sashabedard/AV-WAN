// Textes du modèle : alertes DMX, familles de ports, lecture de fichier, nouveau projet, projet exemple.
export const model = {
  newProjectTitle: 'Nouveau projet',
  // Libellé d'un code de source d'univers (voir model/dmx.ts) : le code reste anglais, le libellé suit la langue.
  dmxSource: { typed: 'tapé' },
  dmx: {
    addressShort: 'Adr.',
    universeConflict: (p: { typed: number; cable: number }) => `Univers tapé ${p.typed} ; le câble donne ${p.cable}`,
    overlap: (p: { name: string; range: string }) => `Chevauche ${p.name} (${p.range})`,
    overflow: 'Dépasse 512'
  },
  family: {
    ethernet: 'RJ45',
    optical: 'SFP/SFP+',
    wifi: 'Wi-Fi',
    usb: 'USB',
    dmx: 'DMX',
    pixel: 'pixels',
    hdmi: 'HDMI',
    sdi: 'SDI',
    serial: 'série',
    dc: 'alim DC'
  },
  file: {
    notJson: 'Fichier illisible : ce n’est pas du JSON valide.',
    notProject: 'Ce fichier n’est pas un projet AV·WAN (schemaVersion manquant).',
    invalid: (p: { where: string }) => `Fichier invalide : ${p.where}`,
    unexpectedStructure: 'structure inattendue',
    noMigration: (p: { version: number }) => `Aucune migration depuis la version ${p.version}`
  },
  unknownTemplate: (p: { id: string }) => `Gabarit inconnu : ${p.id}`,
  sanitize: {
    duplicateDevice: (p: { name: string }) => `Appareil en double ignoré : ${p.name}.`,
    duplicateCable: (p: { label: string }) => `Câble en double ignoré : ${p.label}.`,
    cableMissingEnd: (p: { label: string }) => `Câble ${p.label} ignoré : il référence un appareil ou un port absent.`,
    cableBlocked: (p: { label: string }) => `Câble ${p.label} ignoré : port déjà occupé ou connecteurs incompatibles.`
  },
  example: {
    title: 'Installation interactive (exemple)',
    authors: 'Équipe technique',
    zones: { control: 'Régie', hall: 'Salle', stage: 'Scène' },
    unknownDevice: (p: { key: string }) => `Appareil exemple inconnu : ${p.key}`,
    models: {
      controlSwitch: 'Switch de régie 24 PoE+',
      hallSwitch: 'Switch de salle 8 PoE+',
      presenceSensor: 'Capteur de présence',
      wirelessButton: 'Bouton sans fil',
      pixelStrip: 'Bande pixels 5 m',
      movingFixture: 'Projecteur asservi',
      stageStrip: 'Ruban de scène'
    }
  }
} as const
