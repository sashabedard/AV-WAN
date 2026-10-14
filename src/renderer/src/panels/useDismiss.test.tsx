// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useRef } from 'react'
import { useDismissOnOutside } from './useDismiss'

afterEach(cleanup)

function Probe({ active, onDismiss }: { active: boolean; onDismiss: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useDismissOnOutside(ref, active, onDismiss)
  return (
    <div>
      <div ref={ref} data-testid="inside" />
      <div data-testid="outside" />
    </div>
  )
}

describe('useDismissOnOutside', () => {
  it('ferme sur un clic à côté, pas sur un clic dedans, et seulement si actif', () => {
    const onDismiss = vi.fn()
    const { getByTestId, rerender } = render(<Probe active onDismiss={onDismiss} />)
    fireEvent.mouseDown(getByTestId('inside'))
    expect(onDismiss).not.toHaveBeenCalled()
    fireEvent.mouseDown(getByTestId('outside'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
    rerender(<Probe active={false} onDismiss={onDismiss} />)
    fireEvent.mouseDown(getByTestId('outside'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
