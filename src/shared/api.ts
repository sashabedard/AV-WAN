import type { PdfOptions } from './pdfOptions'

export type MenuAction = 'new' | 'open' | 'save' | 'saveAs' | 'undo' | 'redo' | 'search' | 'fitView' | 'zoomIn' | 'zoomOut' | 'duplicate' | 'groupZone'
export interface OpenedFile {
  path: string
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
  export: {
    pdf(projectText: string, options: PdfOptions, suggestedName: string): Promise<string | null>
  }
  print: {
    job(): Promise<PrintJob>
    ready(): void
    failed(message: string): void
  }
  onMenu(callback: (action: MenuAction) => void): () => void
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
  exportPdf: 'export:pdf',
  printJob: 'print:job',
  printReady: 'print:ready',
  printFailed: 'print:failed',
  menu: 'menu'
} as const
