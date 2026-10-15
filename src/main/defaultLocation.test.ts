import { describe, expect, it } from 'vitest'
import { existsSync, linkSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { discardAutoCreated, projectFileName, uniqueProjectPath } from './defaultLocation'

describe('dossier par défaut', () => {
  it('tire un nom de fichier sûr du titre', () => {
    expect(projectFileName('Salle B')).toBe('Salle B')
    expect(projectFileName('  ')).toBe('Nouveau projet')
    expect(projectFileName('a/b:c*?"<>|d')).toBe('a-b-c-d')
    expect(projectFileName('x'.repeat(100))).toHaveLength(80)
    expect(projectFileName('.cache')).toBe('cache')
  })

  it('remplace les caractères de contrôle comme les autres caractères interdits', () => {
    expect(projectFileName('Salle\tB')).toBe('Salle-B')
    expect(projectFileName('a\nb\rc\u0000d\u001fe\u007ff')).toBe('a-b-c-d-e-f')
    expect(projectFileName('\u0007Régie')).toBe('Régie')
  })

  it('un nom réservé par Windows reçoit « (projet) »', () => {
    expect(projectFileName('AUX')).toBe('AUX (projet)')
    expect(projectFileName('con')).toBe('con (projet)')
    expect(projectFileName(' Nul ')).toBe('Nul (projet)')
    expect(projectFileName('PRN')).toBe('PRN (projet)')
    expect(projectFileName('COM1')).toBe('COM1 (projet)')
    expect(projectFileName('lpt9')).toBe('lpt9 (projet)')
    expect(projectFileName('COM10')).toBe('COM10')
    expect(projectFileName('LPT0')).toBe('LPT0')
    expect(projectFileName('Console')).toBe('Console')
    expect(projectFileName('AUX 2')).toBe('AUX 2')
  })

  it('ajoute « 2 », « 3 »… plutôt que d’écraser', () => {
    const taken = new Set([join('/d', 'Nouveau projet.avwan'), join('/d', 'Nouveau projet 2.avwan')])
    expect(uniqueProjectPath('/d', '', (p) => taken.has(p))).toBe(join('/d', 'Nouveau projet 3.avwan'))
    expect(uniqueProjectPath('/d', 'Régie', (p) => taken.has(p))).toBe(join('/d', 'Régie.avwan'))
  })
})

describe('« Enregistrer sous » depuis un fichier créé automatiquement', () => {
  const setup = (): { dir: string; created: Set<string>; auto: string } => {
    const dir = mkdtempSync(join(tmpdir(), 'avwan-auto-'))
    const auto = join(dir, 'salle b.avwan')
    writeFileSync(auto, 'projet')
    return { dir, created: new Set([auto]), auto }
  }

  it('l’ancien fichier, créé par l’app, est supprimé : le projet est déplacé', async () => {
    const { dir, created, auto } = setup()
    const target = join(dir, 'Régie.avwan')
    writeFileSync(target, 'projet')
    expect(await discardAutoCreated(created, auto, target)).toBe(true)
    expect(existsSync(auto)).toBe(false)
    expect(existsSync(target)).toBe(true)
    expect(created.has(auto)).toBe(false)
  })

  it('un fichier que l’app n’a pas créé n’est jamais supprimé', async () => {
    const { dir, auto } = setup()
    const target = join(dir, 'Régie.avwan')
    writeFileSync(target, 'projet')
    expect(await discardAutoCreated(new Set(), auto, target)).toBe(false)
    expect(existsSync(auto)).toBe(true)
  })

  it('la cible est introuvable : rien n’est supprimé', async () => {
    const { dir, created, auto } = setup()
    expect(await discardAutoCreated(created, auto, join(dir, 'absent.avwan'))).toBe(false)
    expect(existsSync(auto)).toBe(true)
  })

  it('requête invalide : rien n’est supprimé', async () => {
    const { created, auto } = setup()
    expect(await discardAutoCreated(created, auto, 42)).toBe(false)
    expect(await discardAutoCreated(created, null, auto)).toBe(false)
    expect(existsSync(auto)).toBe(true)
  })

  it('« Enregistrer sous » sur le fichier lui-même, écrit autrement (casse) : il n’est pas supprimé', async () => {
    const { dir, created, auto } = setup()
    const sameOtherCase = join(dir, 'Salle B.avwan')
    // Système insensible à la casse : c'est le même fichier. Sinon, on en fait un deuxième nom du même fichier.
    if (!existsSync(sameOtherCase)) linkSync(auto, sameOtherCase)
    expect(await discardAutoCreated(created, auto, sameOtherCase)).toBe(false)
    expect(existsSync(auto)).toBe(true)
    expect(existsSync(sameOtherCase)).toBe(true)
  })
})
