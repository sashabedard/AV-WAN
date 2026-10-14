// src/renderer/src/app/menuActions.test.ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { handleMenuAction } from './menuActions'
import { projectStore } from '../store/projectStore'
import { uiStore } from '../store/uiStore'
import { sampleProject } from '../model/__fixtures__/sample'

beforeEach(() => {
  projectStore.getState().loadProject(sampleProject(), null)
  uiStore.getState().closeSearch()
})

describe('handleMenuAction', () => {
  it('ouvre la recherche sous le curseur', () => {
    handleMenuAction('search')
    expect(uiStore.getState().search).toEqual({ at: null })
  })

  it('annule sur le canvas quand aucun champ texte n’a le focus', () => {
    projectStore.getState().addDevice('dante-avio', { x: 0, y: 0 })
    handleMenuAction('undo')
    expect(projectStore.getState().history.present.devices).toHaveLength(2)
    handleMenuAction('redo')
    expect(projectStore.getState().history.present.devices).toHaveLength(3)
  })
})
