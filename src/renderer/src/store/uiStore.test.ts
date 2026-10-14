import { beforeEach, describe, expect, it } from 'vitest'
import { uiStore } from './uiStore'
import { isDirty, projectStore } from './projectStore'
import { sampleProject } from '../model/__fixtures__/sample'

const RECT = { x: 10, y: 20, w: 300, h: 200 }

beforeEach(() => {
  uiStore.getState().setPinned(null)
  uiStore.getState().setPointerOverPinned(false)
})

describe('uiStore · vue épinglée', () => {
  it('pose puis retire le cadre, sans modifier le projet ni son historique', () => {
    projectStore.getState().loadProject(sampleProject(), null)
    uiStore.getState().setPinned(RECT)
    expect(uiStore.getState().pinnedRect).toEqual(RECT)
    expect(projectStore.getState().history.past).toHaveLength(0)
    expect(isDirty(projectStore.getState())).toBe(false)
    uiStore.getState().setPinned(null)
    expect(uiStore.getState().pinnedRect).toBeNull()
  })

  it('Nouveau et Ouvrir retirent la vignette', () => {
    uiStore.getState().setPinned(RECT)
    projectStore.getState().newProject()
    expect(uiStore.getState().pinnedRect).toBeNull()
    uiStore.getState().setPinned(RECT)
    projectStore.getState().loadProject(sampleProject(), null)
    expect(uiStore.getState().pinnedRect).toBeNull()
  })

  it('retient si le pointeur survole la vignette', () => {
    expect(uiStore.getState().pointerOverPinned).toBe(false)
    uiStore.getState().setPointerOverPinned(true)
    expect(uiStore.getState().pointerOverPinned).toBe(true)
  })
})
