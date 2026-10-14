import type { BrowserWindow } from 'electron'
import { join } from 'node:path'

// Charge l'interface : serveur de développement (electron-vite dev) ou fichiers construits.
// `query` sert à la fenêtre d'impression (?print=1).
export function loadRenderer(win: BrowserWindow, query: Record<string, string> = {}): Promise<void> {
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    const url = new URL(devUrl)
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
    return win.loadURL(url.toString())
  }
  return win.loadFile(join(__dirname, '../renderer/index.html'), { query })
}
