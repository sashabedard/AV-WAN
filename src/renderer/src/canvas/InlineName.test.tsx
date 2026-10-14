// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InlineName } from './InlineName'

afterEach(cleanup)

function setup(value = 'CAM-1') {
  const onCommit = vi.fn()
  const onDone = vi.fn()
  render(<InlineName value={value} label="Nom de l’appareil" onCommit={onCommit} onDone={onDone} />)
  return { onCommit, onDone, input: screen.getByRole('textbox', { name: 'Nom de l’appareil' }) as HTMLInputElement }
}

describe('InlineName', () => {
  it('prend le focus, sélectionne le texte et valide avec Entrée (texte nettoyé)', async () => {
    const user = userEvent.setup()
    const { onCommit, onDone, input } = setup()
    expect(document.activeElement).toBe(input)
    await user.keyboard('  CAM-PTZ-1  {Enter}')
    expect(onCommit).toHaveBeenCalledWith('CAM-PTZ-1')
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('annule avec Échap, et ignore un nom vide ou inchangé', async () => {
    const user = userEvent.setup()
    const first = setup()
    await user.keyboard('Autre{Escape}')
    expect(first.onCommit).not.toHaveBeenCalled()
    expect(first.onDone).toHaveBeenCalledTimes(1)
    cleanup()
    const second = setup()
    await user.clear(second.input)
    await user.keyboard('{Enter}')
    expect(second.onCommit).not.toHaveBeenCalled()
    cleanup()
    const third = setup()
    await user.keyboard('{Enter}')
    expect(third.onCommit).not.toHaveBeenCalled()
  })
})
