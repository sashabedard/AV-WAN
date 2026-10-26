// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WhatsNew } from './WhatsNew'
import { uiStore } from '../store/uiStore'

beforeEach(() => uiStore.getState().setWhatsNewOpen(true))
afterEach(() => {
  act(() => uiStore.getState().setLang('fr'))
  uiStore.getState().setWhatsNewOpen(false)
  cleanup()
})

describe('WhatsNew', () => {
  it('présente les 6 nouveautés de la 1.5 et l’avertissement de retour en 1.4', () => {
    render(<WhatsNew />)
    expect(screen.getByRole('dialog', { name: /Quoi de neuf/ })).toBeTruthy()
    expect(screen.getAllByRole('listitem')).toHaveLength(6)
    const text = document.body.textContent ?? ''
    for (const word of ['IP', 'DisplayPort', 'Côté des prises', 'VM', 'Matériel', 'rapports']) expect(text).toContain(word)
    expect(text).toContain('ne s’ouvrent plus correctement dans la 1.4')
    expect(text).toContain('.bak')
  })

  it('le bouton et Échap ferment l’écran', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<WhatsNew />)
    await user.click(screen.getByRole('button', { name: 'C’est parti !' }))
    expect(uiStore.getState().whatsNewOpen).toBe(false)
    act(() => uiStore.getState().setWhatsNewOpen(true))
    rerender(<WhatsNew />)
    await user.keyboard('{Escape}')
    expect(uiStore.getState().whatsNewOpen).toBe(false)
  })

  it('fermé : rien n’est affiché', () => {
    uiStore.getState().setWhatsNewOpen(false)
    const { container } = render(<WhatsNew />)
    expect(container.innerHTML).toBe('')
  })

  it('en anglais', () => {
    act(() => uiStore.getState().setLang('en'))
    render(<WhatsNew />)
    expect(screen.getByRole('dialog', { name: /What’s new/ })).toBeTruthy()
    expect(document.body.textContent).toContain('no longer open correctly in 1.4')
    expect(screen.getByRole('button', { name: 'Let’s go!' })).toBeTruthy()
  })
})
