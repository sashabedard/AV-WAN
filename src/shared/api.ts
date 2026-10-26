import type { Lang } from './i18n/lang'
import type { PdfOptions } from './pdfOptions'
import type { DataTable } from './tables'

export type MenuAction = 'new' | 'open' | 'save' | 'saveAs' | 'undo' | 'redo' | 'search' | 'fitView' | 'zoomIn' | 'zoomOut' | 'duplicate' | 'groupZone' | 'exportPdf' | 'exportCsv' | 'exportXlsx' | 'pinView' | 'unpinView' | 'revertToOpened' | 'whatsNew'
export interface OpenedFile {
  path: string
  text: string
}

// Fichier à ouvrir envoyé par le processus principal (double-clic, Dock, 2e instance).
export type OpenRequest = { path: string; text: string } | { path: string; error: string }

// Copies de récupération (autosauvegarde) : un fichier par document dans userData/recovery/.
export interface RecoveryEntry {
  key: string
  path: string | null
  title: string
  savedAt: string
}
export interface RecoveryWrite {
  path: string | null
  untitledId: string
  title: string
  text: string
}
export interface RestoredRecovery {
  key: string
  path: string | null
  text: string
}

// Composante de la bibliothèque perso, telle qu'écrite sur le disque (validée par le renderer).
export interface LibraryFile {
  id: string
  text: string
}

// Travail confié à la fenêtre d'impression cachée : le projet sérialisé et les options choisies.
export interface PrintJob {
  projectText: string
  options: PdfOptions
}

// Réglages vus par la fenêtre : la langue est toujours la langue effective (choisie, ou celle du système).
export interface SettingsView {
  autoSave: boolean
  lang: Lang
}

export interface AvwanApi {
  platform: string
  // Langue effective au chargement de la fenêtre (passée par le main en argument de lancement).
  initialLang: Lang
  isE2E: boolean
  autosaveMs: number
  file: {
    open(): Promise<OpenedFile | null>
    read(path: string): Promise<OpenedFile>
    save(path: string, text: string): Promise<string>
    saveAs(text: string, suggestedName: string): Promise<string | null>
    backup(path: string): Promise<string>
    createDefault(title: string, text: string): Promise<string>
    saveSync(path: string, text: string): { ok: true } | { ok: false; error: string }
    // « Enregistrer sous » : previous (quitté) est supprimé s'il a été créé par l'app et n'est pas current.
    discardAutoCreated(previous: string, current: string): Promise<void>
    openedVersion(path: string): Promise<string | null>
  }
  recent: {
    list(): Promise<string[]>
    open(path: string): Promise<OpenedFile>
    remember(path: string): Promise<void>
  }
  recovery: {
    write(doc: RecoveryWrite): Promise<string>
    discard(key: string): Promise<void>
    list(): Promise<RecoveryEntry[]>
    restore(key: string): Promise<RestoredRecovery>
    findNewer(path: string): Promise<RecoveryEntry | null>
  }
  library: {
    list(): Promise<LibraryFile[]>
    save(id: string, text: string): Promise<void>
    remove(id: string): Promise<void>
  }
  // Listes de canaux DMX des réglages (userData/dmx-channels.json), validées par le renderer.
  dmxChannels: {
    read(): Promise<string | null>
    write(text: string): Promise<void>
  }
  export: {
    pdf(projectText: string, options: PdfOptions, suggestedName: string): Promise<string | null>
    csv(tables: DataTable[], suggestedName: string, lang: Lang): Promise<string[] | null>
    xlsx(tables: DataTable[], suggestedName: string, lang: Lang): Promise<string | null>
  }
  print: {
    job(): Promise<PrintJob>
    ready(): void
    failed(message: string): void
  }
  onMenu(callback: (action: MenuAction) => void): () => void
  onOpenRequest(callback: (request: OpenRequest) => void): () => void
  rendererReady(): void
  updates: {
    pending(): Promise<string | null>
    install(): void
  }
  onUpdateReady(callback: (version: string) => void): () => void
  // Réglages de l'app (menu Fichier › Enregistrement automatique).
  settings: {
    get(): Promise<SettingsView>
    onChange(callback: (settings: SettingsView) => void): () => void
    setLang(lang: Lang): Promise<void>
  }
  // Fenêtre sans barre de titre : couleurs des boutons Windows, menu ☰, plein écran (pastilles macOS masquées).
  window: {
    setTitleBarColors(colors: { color: string; symbolColor: string }): void
    showMenu(x: number, y: number): void
    onFullscreen(callback: (fullscreen: boolean) => void): () => void
  }
}

export const IPC = {
  open: 'file:open',
  read: 'file:read',
  save: 'file:save',
  saveAs: 'file:saveAs',
  backup: 'file:backup',
  fileCreateDefault: 'file:createDefault',
  fileSaveSync: 'file:saveSync',
  fileDiscardAutoCreated: 'file:discardAutoCreated',
  fileOpenedVersion: 'file:openedVersion',
  recentList: 'recent:list',
  recentOpen: 'recent:open',
  recentRemember: 'recent:remember',
  recoveryWrite: 'recovery:write',
  recoveryDiscard: 'recovery:discard',
  recoveryList: 'recovery:list',
  recoveryRestore: 'recovery:restore',
  recoveryFindNewer: 'recovery:findNewer',
  libraryList: 'library:list',
  librarySave: 'library:save',
  libraryRemove: 'library:remove',
  dmxChannelsRead: 'dmxChannels:read',
  dmxChannelsWrite: 'dmxChannels:write',
  exportPdf: 'export:pdf',
  exportCsv: 'export:csv',
  exportXlsx: 'export:xlsx',
  printJob: 'print:job',
  printReady: 'print:ready',
  printFailed: 'print:failed',
  openRequest: 'app:openRequest',
  rendererReady: 'app:rendererReady',
  updateReady: 'update:ready',
  updatePending: 'update:pending',
  updateInstall: 'update:install',
  settingsGet: 'settings:get',
  settingsChanged: 'settings:changed',
  settingsSetLang: 'settings:setLang',
  windowTitleBarColors: 'window:titleBarColors',
  windowShowMenu: 'window:showMenu',
  windowFullscreen: 'window:fullscreen',
  menu: 'menu'
} as const
