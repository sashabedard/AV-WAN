import { describe, expect, it } from 'vitest'
import { ipcErrorMessage } from './ipcError'

describe('ipcErrorMessage', () => {
  it('retire le préfixe IPC d’Electron', () => {
    const e = new Error("Error invoking remote method 'file:open': Error: Accès refusé (EACCES).")
    expect(ipcErrorMessage(e)).toBe('Accès refusé (EACCES).')
  })

  it('garde un message simple', () => {
    expect(ipcErrorMessage(new Error('Fichier invalide'))).toBe('Fichier invalide')
    expect(ipcErrorMessage('panne')).toBe('panne')
  })
})
