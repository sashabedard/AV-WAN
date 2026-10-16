import { ProjectSchema } from './schema'
import type { Project } from './types'
import { CURRENT_SCHEMA_VERSION, migrate, type RawDoc } from './migrations'
import { sanitizeProject } from './sanitize'
import type { Messages } from '../../../shared/i18n/messages'

export type ParseResult =
  | { ok: true; project: Project; readOnly: boolean; migratedFrom?: number; warnings: string[] }
  | { ok: false; error: string }

export function serializeProject(project: Project): string {
  return `${JSON.stringify(project, null, 2)}\n`
}

// `m` : langue des messages d'erreur et d'avertissement (celle de l'interface à l'ouverture).
export function parseProjectFile(text: string, m: Messages): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: m.model.file.notJson }
  }
  if (typeof raw !== 'object' || raw === null || typeof (raw as { schemaVersion?: unknown }).schemaVersion !== 'number') {
    return { ok: false, error: m.model.file.notProject }
  }
  let doc = raw as RawDoc
  const original = doc.schemaVersion
  const readOnly = original > CURRENT_SCHEMA_VERSION
  if (readOnly) {
    doc = { ...doc, schemaVersion: CURRENT_SCHEMA_VERSION }
  } else if (original < CURRENT_SCHEMA_VERSION) {
    try {
      doc = migrate(doc, m)
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  }
  const parsed = ProjectSchema.safeParse(doc)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const where = issue ? `${issue.path.join('.')} — ${issue.message}` : m.model.file.unexpectedStructure
    return { ok: false, error: m.model.file.invalid({ where }) }
  }
  const { project, warnings } = sanitizeProject(parsed.data, m)
  return { ok: true, project, readOnly, ...(original < CURRENT_SCHEMA_VERSION ? { migratedFrom: original } : {}), warnings }
}
