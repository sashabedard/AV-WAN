// Canvas : légende, tuiles, cordons, aides.
export const canvas = {
  legend: {
    label: 'Légende',
    title: 'Couleur',
    modeLabel: 'Mode de couleur',
    modes: { vlan: 'VLAN', type: 'Type', port: 'Port' },
    highlightVlan: (p: { id: number }) => `Mettre en évidence le VLAN ${p.id}`,
    trunk: 'Trunk (bagues = VLAN)',
    noVlan: 'Sans VLAN',
    portNote: 'Câbles neutres, ports et étiquettes toujours affichés.'
  },
  mediumKinds: {
    copper: 'Cuivre',
    multimode: 'Fibre multimode',
    singlemode: 'Fibre monomode',
    dac: 'DAC',
    wifi: 'Wi-Fi',
    simple: 'Liens simples'
  },
  tile: {
    device: 'Appareil',
    ipUnset: 'IP non définie',
    fixed: 'FIXE',
    dhcp: 'DHCP',
    poweredBy: (p: { label: string }) => `alimenté ${p.label}`,
    deviceNameLabel: 'Nom de l’appareil',
    zoneNameLabel: 'Nom de la zone',
    renameDevice: (p: { title: string }) => `${p.title} · double-clic pour renommer`,
    renameZone: (p: { name: string }) => `${p.name} · glisser pour déplacer la zone et ses appareils · double-clic pour renommer`,
    portTitle: (p: { label: string }) => `Port ${p.label}`,
    gb: 'Go',
    vmTitle: (p: { name: string }) => `${p.name} · clic pour ouvrir la VM dans l’inspecteur`
  },
  cord: {
    elbowGrip: 'Glisser pour déplacer le coude · double-clic pour le recentrer'
  },
  connect: {
    noFreePort: (p: { family: string; name: string }) => `Aucun port ${p.family} libre sur ${p.name}.`
  },
  view: {
    pin: 'Épingler cette vue',
    pinWithKey: 'Épingler cette vue (⇧⌘P)',
    minimap: 'Minicarte',
    create: 'Créer',
    templateGone: 'Cet appareil n’existe plus dans votre bibliothèque.'
  },
  pinned: {
    title: 'Vue épinglée',
    repinHint: 'Épingler la vue actuelle du canvas',
    repin: 'Recadrer',
    remove: 'Retirer la vue épinglée'
  }
} as const
