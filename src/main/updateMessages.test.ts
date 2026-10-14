import { describe, expect, it } from 'vitest'
import { manualCheckMessage, updateErrorMessage } from './updateMessages'

describe('manualCheckMessage', () => {
  it('donne un message clair pour chaque issue', () => {
    expect(manualCheckMessage({ kind: 'up-to-date', current: '1.0.0' })).toEqual({ message: 'AV·WAN est à jour (1.0.0).' })
    expect(manualCheckMessage({ kind: 'downloading', version: '1.1.0' })).toEqual({ message: 'La version 1.1.0 se télécharge.', detail: 'Un bandeau proposera de redémarrer quand elle sera prête.' })
    expect(manualCheckMessage({ kind: 'ready', version: '1.1.0' })).toEqual({ message: 'La version 1.1.0 est prête.', detail: 'Redémarrez AV·WAN pour l’installer.' })
    expect(manualCheckMessage({ kind: 'not-packaged' })).toEqual({ message: 'Les mises à jour ne sont vérifiées que dans l’app installée.' })
    expect(manualCheckMessage({ kind: 'error', message: 'Pas de connexion.' })).toEqual({ message: 'Impossible de vérifier les mises à jour.', detail: 'Pas de connexion.' })
  })
})

describe('updateErrorMessage', () => {
  it('traduit les erreurs de réseau et l’absence de version', () => {
    expect(updateErrorMessage(new Error('net::ERR_INTERNET_DISCONNECTED'))).toBe('Pas de connexion à Internet, ou GitHub est inaccessible.')
    expect(updateErrorMessage(new Error('getaddrinfo ENOTFOUND api.github.com'))).toBe('Pas de connexion à Internet, ou GitHub est inaccessible.')
    expect(updateErrorMessage(new Error('HttpError: 404 Not Found\n  at …'))).toBe('Aucune version publiée n’a été trouvée.')
    expect(updateErrorMessage(new Error('HttpError: 403 Forbidden'))).toBe('GitHub limite temporairement les vérifications. Réessayez plus tard.')
  })

  it('garde un repli en français pour une erreur inconnue, première ligne tronquée', () => {
    expect(updateErrorMessage(new Error('Autre chose\nsur deux lignes'))).toBe('Erreur inattendue du service de mises à jour. (Autre chose)')
    const long = updateErrorMessage(new Error('x'.repeat(200)))
    expect(long.startsWith('Erreur inattendue du service de mises à jour.')).toBe(true)
    expect(long).toBe(`Erreur inattendue du service de mises à jour. (${'x'.repeat(80)})`)
  })
})
