// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Palette } from './Palette'
import { uiStore } from '../store/uiStore'

afterEach(() => {
  cleanup()
  uiStore.getState().setPendingTemplate(null)
  uiStore.getState().setPendingZone(false)
})

describe('Palette', () => {
  it('liste les catégories et les gabarits', () => {
    render(<Palette />)
    expect(screen.getByRole('heading', { name: 'Éclairage' })).toBeTruthy()
    expect(screen.getByTestId('palette-ptz-ndi').textContent).toContain('Caméra PTZ NDI')
  })

  it('un clic prépare un placement et un second clic l’annule', async () => {
    const user = userEvent.setup()
    render(<Palette />)
    await user.click(screen.getByTestId('palette-dante-avio'))
    expect(uiStore.getState().pendingTemplateId).toBe('dante-avio')
    await user.click(screen.getByTestId('palette-dante-avio'))
    expect(uiStore.getState().pendingTemplateId).toBeNull()
  })

  it('montre une icône par catégorie et par gabarit, et le code à droite', () => {
    const { container } = render(<Palette />)
    const item = screen.getByTestId('palette-ptz-ndi')
    expect(item.querySelector('svg.icon')).toBeTruthy()
    expect(item.lastElementChild?.textContent).toBe('CAM')
    expect(container.querySelectorAll('.palette__cat svg.icon')).toHaveLength(8)
  })

  it('filtre le catalogue par la même recherche que ⌘K', async () => {
    const user = userEvent.setup()
    render(<Palette />)
    await user.type(screen.getByRole('searchbox', { name: 'Filtrer les appareils' }), 'ptz')
    expect(screen.queryByRole('heading', { name: 'Éclairage' })).toBeNull()
    expect(screen.getByTestId('palette-ptz-ndi')).toBeTruthy()
    expect(screen.queryByTestId('palette-dante-avio')).toBeNull()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('heading', { name: 'Éclairage' })).toBeTruthy()
  })

  it('l’outil Zone s’arme d’un clic et s’exclut avec un gabarit', async () => {
    const user = userEvent.setup()
    render(<Palette />)
    const tool = screen.getByRole('button', { name: /^Zone/ })
    await user.click(tool)
    expect(uiStore.getState().pendingZone).toBe(true)
    expect(tool.getAttribute('aria-pressed')).toBe('true')
    await user.click(screen.getByTestId('palette-dante-avio'))
    expect(uiStore.getState().pendingZone).toBe(false)
    expect(uiStore.getState().pendingTemplateId).toBe('dante-avio')
  })
})
