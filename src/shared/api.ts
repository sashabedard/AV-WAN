export type MenuAction = 'new' | 'open' | 'save' | 'saveAs' | 'undo' | 'redo' | 'search' | 'fitView' | 'zoomIn' | 'zoomOut' | 'duplicate' | 'groupZone'
export interface OpenedFile {
  path: string
  text: string
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
  menu: 'menu'
} as const
