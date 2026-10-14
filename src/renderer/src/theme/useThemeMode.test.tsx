// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { useThemeMode } from './useThemeMode'

function Probe() {
  return <span data-testid="mode">{useThemeMode()}</span>
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
})
afterEach(() => {
  cleanup()
  delete document.documentElement.dataset['theme']
})

describe('useThemeMode', () => {
  it('suit le système, puis la bascule posée sur <html>', async () => {
    render(<Probe />)
    expect(screen.getByTestId('mode').textContent).toBe('light')
    act(() => {
      document.documentElement.dataset['theme'] = 'dark'
    })
    await waitFor(() => expect(screen.getByTestId('mode').textContent).toBe('dark'))
    act(() => {
      delete document.documentElement.dataset['theme']
    })
    await waitFor(() => expect(screen.getByTestId('mode').textContent).toBe('light'))
  })
})
