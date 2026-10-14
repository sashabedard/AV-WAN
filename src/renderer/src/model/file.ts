import { ProjectSchema } from './schema'
import type { Project } from './types'
import { CURRENT_SCHEMA_VERSION, migrate, type RawDoc } from './migrations'
import { sanitizeProject } from './sanitize'

export type ParseResult =
  | { ok: true; project: Project; readOnly: boolean; migratedFrom?: number; warnings: string[] }
  | { ok: false; error: string }

export function serializeProject(project: Project): string {
  return `${JSON.stringify(project, null, 2)}\n`
}

export function parseProjectFile(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Fichier illisible : ce n’est pas du JSON valide.' }
  }
  if (typeof raw !== 'object' || raw === null || typeof (raw as { schemaVersion?: unknown }).schemaVersion !== 'number') {
    return { ok: false, error: 'Ce fichier n’est pas un projet AV·WAN (schemaVersion manquant).' }
  }
  let doc = raw as RawDoc
  const original = doc.schemaVersion
  const readOnly = original > CURRENT_SCHEMA_VERSION
  if (readOnly) {
    doc = { ...doc, schemaVersion: CURRENT_SCHEMA_VERSION }
  } else if (original < CURRENT_SCHEMA_VERSION) {
    try {
      doc = migrate(doc)
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  }
  const parsed = ProjectSchema.safeParse(doc)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const where = issue ? `${issue.path.join('.')} — ${issue.message}` : 'structure inattendue'
    return { ok: false, error: `Fichier invalide : ${where}` }
  }
  const { project, warnings } = sanitizeProject(parsed.data)
  return { ok: true, project, readOnly, ...(original < CURRENT_SCHEMA_VERSION ? { migratedFrom: original } : {}), warnings }
}
