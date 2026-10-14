import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { projectFileName, uniqueProjectPath } from './defaultLocation'

describe('dossier par défaut', () => {
  it('tire un nom de fichier sûr du titre', () => {
    expect(projectFileName('Salle B')).toBe('Salle B')
    expect(projectFileName('  ')).toBe('Nouveau projet')
    expect(projectFileName('a/b:c*?"<>|d')).toBe('a-b-c-d')
    expect(projectFileName('x'.repeat(100))).toHaveLength(80)
    expect(projectFileName('.cache')).toBe('cache')
  })

  it('ajoute « 2 », « 3 »… plutôt que d’écraser', () => {
    const taken = new Set([join('/d', 'Nouveau projet.avwan'), join('/d', 'Nouveau projet 2.avwan')])
    expect(uniqueProjectPath('/d', '', (p) => taken.has(p))).toBe(join('/d', 'Nouveau projet 3.avwan'))
    expect(uniqueProjectPath('/d', 'Régie', (p) => taken.has(p))).toBe(join('/d', 'Régie.avwan'))
  })
})
