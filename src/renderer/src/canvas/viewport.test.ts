import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FIT_OPTIONS, centerOn, fitAll, pinCurrentView, registerViewport, unpinView, zoomIn, zoomOut } from './viewport'
import { uiStore } from '../store/uiStore'

function fakeInstance(viewport = { x: 0, y: 0, zoom: 1 }) {
  return {
    fitView: vi.fn().mockResolvedValue(true),
    zoomIn: vi.fn().mockResolvedValue(true),
    zoomOut: vi.fn().mockResolvedValue(true),
    getViewport: vi.fn(() => viewport),
    setCenter: vi.fn().mockResolvedValue(true)
  }
}
const canvasOf = (width: number, height: number): HTMLElement => ({ getBoundingClientRect: () => ({ width, height }) }) as unknown as HTMLElement

beforeEach(() => {
  registerViewport(null)
  uiStore.getState().setPinned(null)
})

describe('viewport', () => {
  it('relaie les commandes du menu à l’instance React Flow', () => {
    const instance = fakeInstance()
    registerViewport(instance)
    fitAll()
    zoomIn()
    zoomOut()
    expect(instance.fitView).toHaveBeenCalledWith(FIT_OPTIONS)
    expect(instance.zoomIn).toHaveBeenCalledTimes(1)
    expect(instance.zoomOut).toHaveBeenCalledTimes(1)
    registerViewport(null)
    expect(() => fitAll()).not.toThrow()
  })

  it('épingle le rectangle visible du canvas principal, en coordonnées du schéma, puis le retire', () => {
    registerViewport(fakeInstance({ x: -100, y: 50, zoom: 0.5 }), canvasOf(800, 600))
    pinCurrentView()
    expect(uiStore.getState().pinnedRect).toEqual({ x: 200, y: -100, w: 1600, h: 1200 })
    unpinView()
    expect(uiStore.getState().pinnedRect).toBeNull()
  })

  it('n’épingle rien sans canvas enregistré ou sans taille mesurée', () => {
    registerViewport(fakeInstance(), null)
    pinCurrentView()
    registerViewport(fakeInstance(), canvasOf(0, 0))
    pinCurrentView()
    expect(uiStore.getState().pinnedRect).toBeNull()
  })

  it('recentre la vue principale sans changer le zoom', () => {
    const instance = fakeInstance({ x: 0, y: 0, zoom: 1.5 })
    registerViewport(instance, canvasOf(800, 600))
    centerOn(920, 300)
    expect(instance.setCenter).toHaveBeenCalledWith(920, 300, { zoom: 1.5, duration: 200 })
  })
})
