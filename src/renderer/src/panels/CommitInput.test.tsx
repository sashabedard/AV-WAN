// src/renderer/src/panels/CommitInput.test.tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommitInput } from './CommitInput'

afterEach(cleanup)

describe('CommitInput', () => {
  it("ne valide qu'en quittant le champ, et Échap annule", async () => {
    const user = userEvent.setup()
    const onCommit = vi.fn()
    render(<CommitInput aria-label="Nom" value="SW-1" onCommit={onCommit} />)
    const input = screen.getByLabelText('Nom')
    await user.clear(input)
    await user.type(input, 'SW-CORE')
    expect(onCommit).not.toHaveBeenCalled()
    await user.tab()
    expect(onCommit).toHaveBeenCalledWith('SW-CORE')
    await user.click(input)
    await user.type(input, 'X{Escape}')
    expect(onCommit).toHaveBeenCalledTimes(1)
  })

  it('Entrée valide une seule fois', async () => {
    const user = userEvent.setup()
    const onCommit = vi.fn()
    render(<CommitInput aria-label="IP" value="" onCommit={onCommit} />)
    await user.type(screen.getByLabelText('IP'), '10.40.0.21{Enter}')
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith('10.40.0.21')
  })

  it('revient à la valeur du projet quand la validation est refusée', async () => {
    const user = userEvent.setup()
    const onCommit = vi.fn()
    render(<CommitInput aria-label="Nom" value="SW-1" onCommit={onCommit} />)
    const input = screen.getByLabelText<HTMLInputElement>('Nom')
    await user.clear(input)
    await user.type(input, 'REFUSE{Enter}')
    expect(onCommit).toHaveBeenCalledWith('REFUSE')
    expect(input.value).toBe('SW-1')
  })
})
