export type MenuAction = 'new' | 'open' | 'save' | 'saveAs' | 'undo' | 'redo' | 'search'

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
  onMenu(callback: (action: MenuAction) => void): () => void
}

export const IPC = {
  open: 'file:open',
  read: 'file:read',
  save: 'file:save',
  saveAs: 'file:saveAs',
  backup: 'file:backup',
  menu: 'menu'
} as const
