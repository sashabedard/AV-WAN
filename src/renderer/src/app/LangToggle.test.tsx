// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LangToggle } from './LangToggle'
import { uiStore } from '../store/uiStore'

afterEach(() => {
  cleanup()
  act(() => uiStore.getState().setLang('fr'))
  delete (window as { avwan?: unknown }).avwan
})

describe('LangToggle', () => {
  it('demande la langue au main, puis suit sa confirmation', async () => {
    const setLang = vi.fn(async () => undefined)
    ;(window as { avwan?: unknown }).avwan = { settings: { setLang } }
    render(<LangToggle />)
    expect(screen.getByRole('group', { name: 'Langue : français' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'EN' }))
    expect(setLang).toHaveBeenCalledWith('en')
    // Rien ne change tant que le main n'a pas confirmé (une seule source de vérité).
    expect(screen.getByRole('button', { name: 'FR' }).getAttribute('aria-pressed')).toBe('true')
    act(() => uiStore.getState().setLang('en'))
    expect(screen.getByRole('button', { name: 'EN' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('group', { name: 'Language: English' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'FR' }).getAttribute('title')).toBe('French')
    expect(screen.getByRole('button', { name: 'FR' }).getAttribute('lang')).toBe('fr')
  })

  it('sans pont vers le main (navigateur), change la langue directement', async () => {
    render(<LangToggle />)
    await userEvent.click(screen.getByRole('button', { name: 'EN' }))
    expect(uiStore.getState().lang).toBe('en')
  })
})
