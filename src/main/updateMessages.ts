// Messages de la vérification manuelle des mises à jour (menu Aide). Sans Electron : testable.
import { mainMessages } from './lang'

export type ManualCheck =
  | { kind: 'not-packaged' }
  | { kind: 'store' }
  | { kind: 'up-to-date'; current: string }
  | { kind: 'downloading'; version: string }
  | { kind: 'ready'; version: string }
  | { kind: 'error'; message: string }

export function manualCheckMessage(r: ManualCheck): { message: string; detail?: string } {
  const m = mainMessages().update
  switch (r.kind) {
    case 'not-packaged':
      return { message: m.notPackaged }
    case 'store':
      return { message: m.store, detail: m.storeDetail }
    case 'up-to-date':
      return { message: m.upToDate({ current: r.current }) }
    case 'downloading':
      return { message: m.downloading({ version: r.version }), detail: m.downloadingDetail }
    case 'ready':
      return { message: m.ready({ version: r.version }), detail: m.readyDetail }
    case 'error':
      return { message: m.checkFailed, detail: r.message }
  }
}

export function updateErrorMessage(e: unknown): string {
  const m = mainMessages().update
  const raw = e instanceof Error ? e.message : String(e)
  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|net::ERR_/.test(raw)) return m.offline
  if (/\b404\b/.test(raw)) return m.noRelease
  if (/\b403\b/.test(raw)) return m.rateLimited
  return m.unexpected({ reason: (raw.split('\n')[0] ?? raw).slice(0, 80) })
}
