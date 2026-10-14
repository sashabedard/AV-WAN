// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Palette } from './Palette'
import { uiStore } from '../store/uiStore'

afterEach(() => {
  cleanup()
  uiStore.getState().setPendingTemplate(null)
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
})
