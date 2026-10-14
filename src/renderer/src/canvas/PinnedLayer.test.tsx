// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { uiStore } from '../store/uiStore'
import { PinnedLayer } from './PinnedLayer'

vi.mock('./PinnedDiagram', () => ({ PinnedDiagram: () => <div data-testid="schema" /> }))

let observed: (() => void) | null = null
let layerSize = { width: 1000, height: 500 }

beforeEach(() => {
  observed = null
  layerSize = { width: 1000, height: 500 }
  class FakeObserver {
    constructor(cb: () => void) {
      observed = cb
    }
    observe(): void {}
    disconnect(): void {}
  }
  vi.stubGlobal('ResizeObserver', FakeObserver)
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => layerSize.width })
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => layerSize.height })
})

afterEach(() => {
  cleanup()
  act(() => uiStore.getState().setPinned(null))
  vi.unstubAllGlobals()
})

const RECT = { x: 0, y: 0, w: 400, h: 300 }
const region = (): HTMLElement => screen.getByRole('region', { name: 'Vue épinglée' })

describe('PinnedLayer : place par défaut', () => {
  it('s’ouvre en haut à droite, à 12 px des bords', () => {
    render(<PinnedLayer />)
    act(() => uiStore.getState().setPinned(RECT))
    expect(region().style.left).toBe('668px')
    expect(region().style.top).toBe('12px')
  })

  it('refait le calcul à la réouverture si le canvas a changé de taille entre-temps', () => {
    render(<PinnedLayer />)
    act(() => uiStore.getState().setPinned(RECT))
    act(() => uiStore.getState().setPinned(null))
    layerSize = { width: 1600, height: 500 }
    act(() => observed?.())
    act(() => uiStore.getState().setPinned(RECT))
    expect(region().style.left).toBe('1268px')
  })

  it('garde sa place quand on épingle de nouveau pendant qu’elle est ouverte', () => {
    render(<PinnedLayer />)
    act(() => uiStore.getState().setPinned(RECT))
    act(() => uiStore.getState().setPinned({ x: 50, y: 50, w: 200, h: 100 }))
    expect(region().style.left).toBe('668px')
    expect(region().style.top).toBe('12px')
  })
})
