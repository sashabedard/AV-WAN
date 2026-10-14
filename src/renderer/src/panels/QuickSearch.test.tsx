// src/renderer/src/panels/QuickSearch.test.tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuickSearch } from './QuickSearch'
import { libraryStore } from '../store/libraryStore'
import { blankDraft, templateFromDraft } from '../model/customTemplate'

afterEach(() => {
  cleanup()
  libraryStore.setState({ templates: [] })
})

function setup() {
  const onPick = vi.fn()
  const onClose = vi.fn()
  render(<QuickSearch onPick={onPick} onClose={onClose} />)
  return { onPick, onClose, input: screen.getByRole('textbox', { name: 'Rechercher' }) }
}

describe('QuickSearch', () => {
  it('a le focus, montre le meilleur résultat en premier et le place avec Entrée', async () => {
    const user = userEvent.setup()
    const { onPick, input } = setup()
    expect(document.activeElement).toBe(input)
    await user.keyboard('ptz')
    const first = screen.getAllByRole('option')[0]!
    expect(first.textContent).toContain('Caméra PTZ NDI')
    expect(first.getAttribute('aria-selected')).toBe('true')
    await user.keyboard('{Enter}')
    expect(onPick).toHaveBeenCalledWith('ptz-ndi')
  })

  it('se déplace avec les flèches et se ferme avec Échap ou un clic à côté', async () => {
    const user = userEvent.setup()
    const { onPick, onClose } = setup()
    await user.keyboard('dante{ArrowDown}{ArrowDown}{ArrowUp}{Enter}')
    expect(onPick).toHaveBeenCalledWith(screen.getAllByRole('option')[1]!.dataset['id'])
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.mouseDown(document.querySelector('.qs__backdrop')!)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('dit quand rien ne correspond', async () => {
    const user = userEvent.setup()
    setup()
    await user.keyboard('zzzq')
    expect(screen.getByText('Aucun appareil ne correspond.')).toBeTruthy()
  })
})

it('trouve aussi mes composantes', async () => {
  const user = userEvent.setup()
  const onPick = vi.fn()
  libraryStore.setState({ templates: [templateFromDraft({ ...blankDraft(), name: 'Balise Wi-Fi', code: 'BAL' }, 'custom-balise0001')] })
  render(<QuickSearch onPick={onPick} onClose={() => undefined} />)
  await user.type(screen.getByLabelText('Rechercher'), 'balise')
  await user.keyboard('{Enter}')
  expect(onPick).toHaveBeenCalledWith('custom-balise0001')
})
