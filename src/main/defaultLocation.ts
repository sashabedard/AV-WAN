// Projet sans titre : fichier créé dans Documents/AV·WAN. Sans Electron : testable.
import { join } from 'node:path'

const MAX_NAME = 80

export function projectFileName(title: string): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/-{2,}/g, '-')
    .trim()
    .replace(/^[.\s-]+/, '')
    .slice(0, MAX_NAME)
    .trim()
  return cleaned || 'Nouveau projet'
}

export function uniqueProjectPath(dir: string, title: string, exists: (path: string) => boolean): string {
  const name = projectFileName(title)
  let candidate = join(dir, `${name}.avwan`)
  for (let k = 2; exists(candidate); k++) candidate = join(dir, `${name} ${k}.avwan`)
  return candidate
}
