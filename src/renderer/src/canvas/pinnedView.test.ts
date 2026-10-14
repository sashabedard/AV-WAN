import { describe, expect, it } from 'vitest'
import { clampVignette, clickSelection, defaultPlacement, visibleFlowRect } from './pinnedView'

describe('visibleFlowRect', () => {
  it('au zoom 1 sans décalage, le cadre a la taille du canvas', () => {
    expect(visibleFlowRect({ x: 0, y: 0, zoom: 1 }, { width: 800, height: 600 })).toEqual({ x: 0, y: 0, w: 800, h: 600 })
  })

  it('au zoom 0,5 avec un décalage, le cadre double et suit la vue', () => {
    expect(visibleFlowRect({ x: -100, y: 50, zoom: 0.5 }, { width: 800, height: 600 })).toEqual({ x: 200, y: -100, w: 1600, h: 1200 })
  })
})

describe('clampVignette (canvas 1000 × 500 : maximum 600 × 300)', () => {
  const canvas = { width: 1000, height: 500 }

  it('relève une boîte trop petite au minimum', () => {
    expect(clampVignette({ left: 10, top: 10, width: 100, height: 50 }, canvas)).toEqual({ left: 10, top: 10, width: 200, height: 130 })
  })

  it('plafonne une boîte trop grande à 60 % du canvas', () => {
    expect(clampVignette({ left: 10, top: 10, width: 900, height: 400 }, canvas)).toEqual({ left: 10, top: 10, width: 600, height: 300 })
  })

  it('ramène dans le canvas une boîte qui dépasse à droite et en bas', () => {
    expect(clampVignette({ left: 900, top: 450, width: 320, height: 200 }, canvas)).toEqual({ left: 680, top: 300, width: 320, height: 200 })
  })

  it('ramène dans le canvas une boîte sortie à gauche et en haut', () => {
    expect(clampVignette({ left: -50, top: -20, width: 320, height: 200 }, canvas)).toEqual({ left: 0, top: 0, width: 320, height: 200 })
  })

  it('dans un canvas minuscule, le minimum l’emporte et la boîte se colle en haut à gauche', () => {
    expect(clampVignette({ left: 40, top: 30, width: 320, height: 200 }, { width: 150, height: 100 })).toEqual({ left: 0, top: 0, width: 200, height: 130 })
  })
})

describe('defaultPlacement', () => {
  it('coin haut-droit, à 12 px des bords, en 320 × 200', () => {
    expect(defaultPlacement({ width: 1000, height: 500 })).toEqual({ left: 668, top: 12, width: 320, height: 200 })
  })

  it('dans un petit canvas, la taille par défaut est plafonnée avant de placer la boîte', () => {
    expect(defaultPlacement({ width: 400, height: 300 })).toEqual({ left: 148, top: 12, width: 240, height: 180 })
  })
})

describe('clickSelection', () => {
  const current = { deviceIds: ['a'], linkIds: ['l1'], zoneIds: [] }

  it('un clic simple remplace toute la sélection', () => {
    expect(clickSelection(current, { kind: 'device', id: 'b' }, false)).toEqual({ deviceIds: ['b'], linkIds: [], zoneIds: [] })
    expect(clickSelection(current, { kind: 'link', id: 'l2' }, false)).toEqual({ deviceIds: [], linkIds: ['l2'], zoneIds: [] })
  })

  it('avec Shift, ⌘ ou Ctrl, ajoute puis retire', () => {
    expect(clickSelection(current, { kind: 'device', id: 'b' }, true)).toEqual({ deviceIds: ['a', 'b'], linkIds: ['l1'], zoneIds: [] })
    expect(clickSelection(current, { kind: 'device', id: 'a' }, true)).toEqual({ deviceIds: [], linkIds: ['l1'], zoneIds: [] })
  })

  it('une zone s’ajoute même si la sélection n’avait pas encore de liste de zones', () => {
    expect(clickSelection({ deviceIds: [], linkIds: [] }, { kind: 'zone', id: 'z1' }, true)).toEqual({ deviceIds: [], linkIds: [], zoneIds: ['z1'] })
  })
})
