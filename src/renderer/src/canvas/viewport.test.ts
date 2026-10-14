import { describe, expect, it, vi } from 'vitest'
import { FIT_OPTIONS, fitAll, registerViewport, zoomIn, zoomOut } from './viewport'

describe('viewport', () => {
  it('relaie les commandes du menu à l’instance React Flow', () => {
    const instance = { fitView: vi.fn().mockResolvedValue(true), zoomIn: vi.fn().mockResolvedValue(true), zoomOut: vi.fn().mockResolvedValue(true) }
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
})
