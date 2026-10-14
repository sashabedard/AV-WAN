// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PinnedFrame } from './PinnedFrame'
import type { Box } from './pinnedView'

afterEach(cleanup)

const BOX: Box = { left: 400, top: 12, width: 320, height: 200 }
const BOUNDS = { width: 1000, height: 600 } // maximum : 600 × 360

function setup() {
  const handlers = { onBoxChange: vi.fn(), onRepin: vi.fn(), onClose: vi.fn(), onPointerInside: vi.fn() }
  const view = render(
    <PinnedFrame box={BOX} bounds={BOUNDS} {...handlers}>
      <div data-testid="contenu" />
    </PinnedFrame>
  )
  return { ...handlers, view, bar: view.container.querySelector('.pinned__bar')!, grip: view.container.querySelector('.pinned__grip')! }
}

describe('PinnedFrame', () => {
  it('affiche la vignette en français, à la place et à la taille données', () => {
    setup()
    const region = screen.getByRole('region', { name: 'Vue épinglée' })
    expect(region.style.left).toBe('400px')
    expect(region.style.top).toBe('12px')
    expect(region.style.width).toBe('320px')
    expect(region.style.height).toBe('200px')
    expect(screen.getByRole('button', { name: 'Recadrer' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retirer la vue épinglée' })).toBeTruthy()
    expect(screen.getByTestId('contenu')).toBeTruthy()
  })

  it('« Recadrer » et ✕ appellent leur action, sans déplacer la boîte', () => {
    const h = setup()
    const repin = screen.getByRole('button', { name: 'Recadrer' })
    fireEvent.mouseDown(repin, { clientX: 10, clientY: 10 })
    fireEvent.mouseMove(window, { clientX: 200, clientY: 200 })
    fireEvent.mouseUp(window)
    fireEvent.click(repin)
    fireEvent.click(screen.getByRole('button', { name: 'Retirer la vue épinglée' }))
    expect(h.onRepin).toHaveBeenCalledTimes(1)
    expect(h.onClose).toHaveBeenCalledTimes(1)
    expect(h.onBoxChange).not.toHaveBeenCalled()
  })

  it('se déplace par la barre de titre, puis s’arrête au relâchement', () => {
    const h = setup()
    fireEvent.mouseDown(h.bar, { clientX: 100, clientY: 100 })
    fireEvent.mouseMove(window, { clientX: 60, clientY: 130 })
    expect(h.onBoxChange).toHaveBeenLastCalledWith({ left: 360, top: 42, width: 320, height: 200 })
    fireEvent.mouseUp(window)
    fireEvent.mouseMove(window, { clientX: 0, clientY: 0 })
    expect(h.onBoxChange).toHaveBeenCalledTimes(1)
  })

  it('reste dans le canvas quand on la pousse au-delà du bord', () => {
    const h = setup()
    fireEvent.mouseDown(h.bar, { clientX: 100, clientY: 100 })
    fireEvent.mouseMove(window, { clientX: 1100, clientY: 900 })
    expect(h.onBoxChange).toHaveBeenLastCalledWith({ left: 680, top: 400, width: 320, height: 200 })
  })

  it('se redimensionne par le coin, entre le minimum et 60 % du canvas', () => {
    const h = setup()
    fireEvent.mouseDown(h.grip, { clientX: 0, clientY: 0 })
    fireEvent.mouseMove(window, { clientX: -500, clientY: -500 })
    expect(h.onBoxChange).toHaveBeenLastCalledWith({ left: 400, top: 12, width: 200, height: 130 })
    fireEvent.mouseMove(window, { clientX: 1000, clientY: 1000 })
    expect(h.onBoxChange).toHaveBeenLastCalledWith({ left: 400, top: 12, width: 600, height: 360 })
  })

  it('signale le survol, et le retire quand la vignette disparaît sous le pointeur', () => {
    const h = setup()
    const region = screen.getByRole('region', { name: 'Vue épinglée' })
    fireEvent.mouseEnter(region)
    expect(h.onPointerInside).toHaveBeenLastCalledWith(true)
    fireEvent.mouseLeave(region)
    expect(h.onPointerInside).toHaveBeenLastCalledWith(false)
    fireEvent.mouseEnter(region)
    h.view.unmount()
    expect(h.onPointerInside).toHaveBeenLastCalledWith(false)
  })
})
