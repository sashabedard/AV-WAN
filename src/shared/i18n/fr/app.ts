// Application : fichiers, bandeaux, toasts, temps écoulé.
export const app = {
  untitled: 'Sans titre',
  defaultFileName: 'projet',
  ago: {
    seconds: 'il y a quelques secondes',
    minutes: (p: { n: number }) => `il y a ${p.n} min`,
    hours: (p: { n: number }) => `il y a ${p.n} h`,
    days: (p: { n: number }) => `il y a ${p.n} j`
  },
  shell: { leftPanel: 'Panneau de gauche', inspector: 'Inspecteur' },
  sidebar: {
    resizerLabel: 'Largeur du panneau de gauche',
    resizerTitle: 'Glisser pour élargir · double-clic : largeur d’origine'
  },
  updateBanner: {
    ready: (p: { version: string }) => `AV·WAN ${p.version} est prête.`,
    restart: 'Redémarrer maintenant',
    later: 'Plus tard',
    laterTitle: 'Plus tard : elle s’installera à la fermeture'
  },
  file: {
    discardQuestion: 'Des modifications ne sont pas enregistrées. Continuer quand même ?',
    dropHint: 'Pour ouvrir un projet, utilisez Fichier › Ouvrir…',
    openedReadOnly: 'Ce fichier vient d’une version plus récente d’AV·WAN : ouvert en lecture seule.',
    backupKept: (p: { name: string }) => ` Copie de sauvegarde conservée : ${p.name}`,
    restoreFailed: (p: { reason: string }) => `Restauration impossible : ${p.reason}`,
    restoredAuto: (p: { target: string }) => `Version récupérée restaurée : elle sera enregistrée dans ${p.target}.`,
    restoredSaveTo: (p: { target: string }) => `Version récupérée restaurée. Enregistrez pour la garder dans ${p.target}.`,
    restoredSave: 'Version récupérée restaurée. Enregistrez-la pour la garder.',
    restoredReadOnly: 'Version récupérée restaurée en lecture seule : elle vient d’une version plus récente d’AV·WAN. Utilisez « Enregistrer sous… ».',
    newerRecovery: (p: { name: string; ago: string }) => `Une version récupérée de ${p.name}, plus récente que le fichier (${p.ago}), existe. Restaurer cette version ?`,
    openFailed: (p: { reason: string }) => `Ouverture impossible : ${p.reason}`,
    saveFailed: (p: { reason: string }) => `Échec de l’enregistrement : ${p.reason}`,
    noOpenedVersion: 'Aucune version d’ouverture pour ce fichier.',
    revertFailed: (p: { reason: string }) => `Retour impossible : ${p.reason}`,
    revertConfirm: (p: { name: string }) => `Revenir à la version d’ouverture de ${p.name} ? Les modifications faites depuis seront remplacées (⌘Z permet d’annuler).`,
    autoSavedAt: (p: { name: string }) => `Enregistré dans Documents › AV·WAN › ${p.name}`,
    autoSaveFailed: (p: { reason: string }) => `Enregistrement automatique impossible : ${p.reason}`,
    dmxListsUnreadable: (p: { reason: string }) => `Listes de canaux illisibles : ${p.reason}`,
    libraryUnreadable: (p: { reason: string }) => `Bibliothèque illisible : ${p.reason}`
  },
  toast: {
    readOnly: 'Ce fichier vient d’une version plus récente d’AV·WAN : il est en lecture seule. Utilisez « Enregistrer sous… ».',
    zoneNeedsSelection: 'Sélectionnez au moins un appareil pour créer une zone autour.',
    connectBlocked: (p: { family: string }) => `Branchement impossible : port occupé ou connecteurs ${p.family} incompatibles.`,
    connectImpossible: 'Branchement impossible.',
    reconnectImpossible: 'Rebranchement impossible : port occupé ou connecteurs incompatibles.',
    cableUnplugged: (p: { undo: string }) => `Câble débranché · ${p.undo} pour annuler`,
    vlanExists: (p: { id: number }) => `Le VLAN ${p.id} existe déjà.`,
    vlanInvalid: 'Numéro de VLAN invalide : choisissez un nombre de 1 à 4094.',
    rackNoRoom: 'Pas assez de U libres à cet endroit.',
    rackTooShort: 'La baie est trop courte pour ses appareils.'
  }
} as const
