import { describe, expect, it } from 'vitest'
import { fsErrorMessage, withFsErrors } from './errors'
import { setMainLang } from './lang'

const errno = (code: string): Error => Object.assign(new Error(`${code}: some english text`), { code })

describe('fsErrorMessage', () => {
  it('traduit les erreurs de fichier courantes et garde le code', () => {
    expect(fsErrorMessage(errno('ENOENT'))).toBe('Fichier ou dossier introuvable (ENOENT).')
    expect(fsErrorMessage(errno('EACCES'))).toBe('Accès refusé (EACCES).')
    expect(fsErrorMessage(errno('ENOSPC'))).toBe('Plus d’espace sur le disque (ENOSPC).')
  })

  it('traduit les autres codes courants', () => {
    expect(fsErrorMessage(errno('EINVAL'))).toBe('Nom ou chemin invalide (EINVAL).')
    expect(fsErrorMessage(errno('ENAMETOOLONG'))).toBe('Nom de fichier trop long (ENAMETOOLONG).')
    expect(fsErrorMessage(errno('ENOTEMPTY'))).toBe('Le dossier n’est pas vide (ENOTEMPTY).')
    expect(fsErrorMessage(errno('EXDEV'))).toBe('Déplacement impossible entre deux disques (EXDEV).')
  })

  it('reste en français pour un code inconnu et pour une erreur de chargement', () => {
    expect(fsErrorMessage(errno('EWHATEVER'))).toBe('Erreur du système de fichiers (EWHATEVER).')
    expect(fsErrorMessage(new Error('ERR_FILE_NOT_FOUND (-6) loading \'file:///x\''))).toBe(
      'Chargement de la fenêtre d’impression impossible (ERR_FILE_NOT_FOUND).'
    )
  })

  it('garde tel quel un message déjà écrit par l’app', () => {
    expect(fsErrorMessage(new Error('Extension attendue : .avwan'))).toBe('Extension attendue : .avwan')
    expect(fsErrorMessage('texte')).toBe('texte')
  })
})

describe('withFsErrors', () => {
  it('rejette avec le message français', async () => {
    await expect(withFsErrors(async () => Promise.reject(errno('EROFS')))).rejects.toThrow('Disque en lecture seule (EROFS).')
  })

  it('rend la valeur quand tout va bien', async () => {
    await expect(withFsErrors(async () => 42)).resolves.toBe(42)
  })
})

describe('fsErrorMessage en anglais', () => {
  it('dit les erreurs du système de fichiers en anglais quand le main est en anglais', () => {
    setMainLang('en')
    try {
      expect(fsErrorMessage(errno('ENOENT'))).toBe('File or folder not found (ENOENT).')
      expect(fsErrorMessage(errno('EWHATEVER'))).toBe('File system error (EWHATEVER).')
    } finally {
      setMainLang('fr')
    }
  })
})
