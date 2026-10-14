import { describe, expect, it } from 'vitest'
import { frenchErrors, frenchFsMessage } from './errors'

const errno = (code: string): Error => Object.assign(new Error(`${code}: some english text`), { code })

describe('frenchFsMessage', () => {
  it('traduit les erreurs de fichier courantes et garde le code', () => {
    expect(frenchFsMessage(errno('ENOENT'))).toBe('Fichier ou dossier introuvable (ENOENT).')
    expect(frenchFsMessage(errno('EACCES'))).toBe('Accès refusé (EACCES).')
    expect(frenchFsMessage(errno('ENOSPC'))).toBe('Plus d’espace sur le disque (ENOSPC).')
  })

  it('garde tel quel un message déjà écrit par l’app', () => {
    expect(frenchFsMessage(new Error('Extension attendue : .avwan'))).toBe('Extension attendue : .avwan')
    expect(frenchFsMessage('texte')).toBe('texte')
  })
})

describe('frenchErrors', () => {
  it('rejette avec le message français', async () => {
    await expect(frenchErrors(async () => Promise.reject(errno('EROFS')))).rejects.toThrow('Disque en lecture seule (EROFS).')
  })

  it('rend la valeur quand tout va bien', async () => {
    await expect(frenchErrors(async () => 42)).resolves.toBe(42)
  })
})
