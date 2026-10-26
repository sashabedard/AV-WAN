import type { Messages } from '../messages'

export const app: Messages['app'] = {
  untitled: 'Untitled',
  defaultFileName: 'project',
  ago: {
    seconds: 'a few seconds ago',
    minutes: (p) => `${p.n} min ago`,
    hours: (p) => `${p.n} h ago`,
    days: (p) => `${p.n} d ago`
  },
  shell: { leftPanel: 'Left panel', inspector: 'Inspector' },
  sidebar: {
    resizerLabel: 'Left panel width',
    resizerTitle: 'Drag to resize · double-click: default width'
  },
  updateBanner: {
    ready: (p) => `AV·WAN ${p.version} is ready.`,
    restart: 'Restart now',
    later: 'Later',
    laterTitle: 'Later: it will install when you quit'
  },
  file: {
    discardQuestion: 'Some changes are not saved. Continue anyway?',
    dropHint: 'To open a project, use File › Open…',
    openedReadOnly: 'This file comes from a newer version of AV·WAN: opened read-only.',
    backupKept: (p) => ` Backup copy kept: ${p.name}`,
    restoreFailed: (p) => `Could not restore: ${p.reason}`,
    restoredAuto: (p) => `Recovered version restored: it will be saved to ${p.target}.`,
    restoredSaveTo: (p) => `Recovered version restored. Save to keep it in ${p.target}.`,
    restoredSave: 'Recovered version restored. Save it to keep it.',
    restoredReadOnly: 'Recovered version restored as read-only: it comes from a newer version of AV·WAN. Use “Save As…”.',
    newerRecovery: (p) => `A recovered version of ${p.name} exists, newer than the file (${p.ago}). Restore it?`,
    openFailed: (p) => `Could not open: ${p.reason}`,
    saveFailed: (p) => `Save failed: ${p.reason}`,
    noOpenedVersion: 'There is no opened version for this file.',
    revertFailed: (p) => `Could not revert: ${p.reason}`,
    revertConfirm: (p) => `Revert to the opened version of ${p.name}? Changes made since will be replaced (⌘Z can undo this).`,
    autoSavedAt: (p) => `Saved to Documents › AV·WAN › ${p.name}`,
    autoSaveFailed: (p) => `Auto save failed: ${p.reason}`,
    dmxListsUnreadable: (p) => `DMX channel lists unreadable: ${p.reason}`,
    libraryUnreadable: (p) => `Library unreadable: ${p.reason}`
  },
  toast: {
    readOnly: 'This file comes from a newer version of AV·WAN: it is read-only. Use “Save As…”.',
    zoneNeedsSelection: 'Select at least one device to create a zone around.',
    cablesUnplugged: (p) => (p.n === 1 ? '1 cable unplugged' : `${p.n} cables unplugged`),
    connectBlocked: (p) => `Cannot connect: port in use or ${p.family} connectors incompatible.`,
    connectImpossible: 'Cannot connect.',
    reconnectImpossible: 'Cannot reconnect: port in use or connectors incompatible.',
    cableUnplugged: (p) => `Cable unplugged · ${p.undo} to undo`,
    vlanExists: (p) => `VLAN ${p.id} already exists.`,
    vlanInvalid: 'Invalid VLAN number: choose a number from 1 to 4094.',
    rackNoRoom: 'Not enough free U there.',
    rackTooShort: 'The rack is too short for its devices.'
  }
}
