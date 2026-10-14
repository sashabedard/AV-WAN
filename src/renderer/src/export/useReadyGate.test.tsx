// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useReadyGate } from './useReadyGate'

afterEach(cleanup)

function Probe({ count, onReady }: { count: number; onReady: () => void }) {
  const done = useReadyGate(count, onReady)
  return (
    <button type="button" onClick={done}>
      schéma prêt
    </button>
  )
}

const pause = (): Promise<void> => new Promise((r) => setTimeout(r, 60))

describe('useReadyGate', () => {
  it('attend chaque schéma, puis ne se déclare prêt qu’une fois', async () => {
    const user = userEvent.setup()
    const onReady = vi.fn()
    render(<Probe count={2} onReady={onReady} />)
    await user.click(screen.getByRole('button'))
    await pause()
    expect(onReady).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button'))
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button'))
    await pause()
    expect(onReady).toHaveBeenCalledTimes(1)
  })

  it('se déclare prêt tout de suite quand il n’y a aucun schéma', async () => {
    const onReady = vi.fn()
    render(<Probe count={0} onReady={onReady} />)
    await waitFor(() => expect(onReady).toHaveBeenCalledTimes(1))
  })
})
