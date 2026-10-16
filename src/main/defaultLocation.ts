// Projet sans titre : fichier créé dans Documents/AV·WAN. Sans Electron : testable.
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { isSameFile } from './fileIO'
import { mainMessages } from './lang'

const MAX_NAME = 80
// Noms que Windows réserve à des périphériques, quelle que soit la casse : « AUX.avwan » ne s'écrit pas.
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

export function projectFileName(title: string): string {
  const cleaned = title
    // Caractères interdits par macOS ou Windows, et caractères de contrôle.
    .replace(/[\\/:*?"<>|\x00-\x1f\x7f]+/g, '-')
    .replace(/-{2,}/g, '-')
    .trim()
    .replace(/^[.\s-]+/, '')
    .slice(0, MAX_NAME)
    .trim()
  if (RESERVED.test(cleaned)) return `${cleaned} (${mainMessages().dialogs.reservedSuffix})`
  return cleaned || mainMessages().dialogs.defaultProjectName
}

export function uniqueProjectPath(dir: string, title: string, exists: (path: string) => boolean): string {
  const name = projectFileName(title)
  let candidate = join(dir, `${name}.avwan`)
  for (let k = 2; exists(candidate); k++) candidate = join(dir, `${name} ${k}.avwan`)
  return candidate
}

// « Enregistrer sous » depuis un fichier créé automatiquement le déplace : l'ancien fichier est supprimé,
// seulement si l'app l'a créé pendant cette session ET que ce n'est pas, sur le disque, le fichier qu'on
// vient d'écrire (« salle b.avwan » et « Salle B.avwan » sont le même fichier sous macOS et Windows).
export async function discardAutoCreated(created: Set<string>, previous: unknown, current: unknown): Promise<boolean> {
  if (typeof previous !== 'string' || typeof current !== 'string' || !created.has(previous)) return false
  if (await isSameFile(previous, current)) return false
  created.delete(previous)
  await fs.rm(previous, { force: true })
  return true
}
