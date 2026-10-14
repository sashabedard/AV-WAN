import type { PdfOptions } from './pdfOptions'
import type { DataTable } from './tables'

export type MenuAction = 'new' | 'open' | 'save' | 'saveAs' | 'undo' | 'redo' | 'search' | 'fitView' | 'zoomIn' | 'zoomOut' | 'duplicate' | 'groupZone' | 'exportPdf' | 'exportCsv' | 'exportXlsx' | 'pinView' | 'unpinView'
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

// Travail confié à la fenêtre d'impression cachée : le projet sérialisé et les options choisies.
export interface PrintJob {
  projectText: string
  options: PdfOptions
}

export interface AvwanApi {
  platform: string
  isE2E: boolean
  autosaveMs: number
  file: {
    open(): Promise<OpenedFile | null>
    read(path: string): Promise<OpenedFile>
    save(path: string, text: string): Promise<string>
    saveAs(text: string, suggestedName: string): Promise<string | null>
    backup(path: string): Promise<string>
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
  export: {
    pdf(projectText: string, options: PdfOptions, suggestedName: string): Promise<string | null>
    csv(tables: DataTable[], suggestedName: string): Promise<string[] | null>
    xlsx(tables: DataTable[], suggestedName: string): Promise<string | null>
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
}

export const IPC = {
  open: 'file:open',
  read: 'file:read',
  save: 'file:save',
  saveAs: 'file:saveAs',
  backup: 'file:backup',
  recentList: 'recent:list',
  recentOpen: 'recent:open',
  recentRemember: 'recent:remember',
  recoveryWrite: 'recovery:write',
  recoveryDiscard: 'recovery:discard',
  recoveryList: 'recovery:list',
  recoveryRestore: 'recovery:restore',
  recoveryFindNewer: 'recovery:findNewer',
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
  menu: 'menu'
} as const
