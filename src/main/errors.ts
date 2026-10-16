import { mainMessages } from './lang'

// Les erreurs du système de fichiers arrivent en anglais (« ENOENT: no such file… ») : on les dit dans la langue de l'app.
export function fsErrorMessage(e: unknown): string {
  const m = mainMessages().errors
  const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : ''
  const reasons: Record<string, string> = m.fs
  if (Object.hasOwn(reasons, code)) return m.fsKnown({ reason: reasons[code]!, code })
  if (/^E[A-Z0-9]+$/.test(code)) return m.fsUnknown({ code })
  const load = e instanceof Error ? /ERR_[A-Z0-9_]+/.exec(e.message) : null
  if (load) return m.printLoad({ code: load[0] })
  return e instanceof Error ? e.message : String(e)
}

export async function withFsErrors<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (e) {
    throw new Error(fsErrorMessage(e))
  }
}
