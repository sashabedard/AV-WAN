// src/renderer/src/app/clipboardActions.test.ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { copySelection, cutSelection, duplicateSelection, pasteFragmentFrom, resetClipboard } from './clipboardActions'
import { FRAGMENT_MIME } from '../model/clipboard'
import { projectStore } from '../store/projectStore'
import { sampleProject } from '../model/__fixtures__/sample'

function fakeData(): DataTransfer {
  const store = new Map<string, string>()
  return { setData: (t: string, v: string) => void store.set(t, v), getData: (t: string) => store.get(t) ?? '' } as unknown as DataTransfer
}
const project = () => projectStore.getState().history.present
const select = (deviceIds: string[]) => projectStore.getState().setSelection({ deviceIds, linkIds: [] })

beforeEach(() => {
  projectStore.getState().loadProject(sampleProject(), null)
  resetClipboard()
})

describe('presse-papiers', () => {
  it('copie la sélection, puis colle avec un décalage qui grandit à chaque collage', () => {
    select(['sw1', 'cam1'])
    const data = fakeData()
    expect(copySelection(data)).toBe(true)
    expect(data.getData(FRAGMENT_MIME)).toContain('"avwanFragment":1')
    expect(pasteFragmentFrom(data)).toBe(true)
    expect(project().devices.slice(2).map((d) => d.position)).toEqual([{ x: 24, y: 24 }, { x: 24, y: 224 }])
    expect(project().links).toHaveLength(2)
    expect(projectStore.getState().selection.deviceIds).toEqual(project().devices.slice(2).map((d) => d.id))
    pasteFragmentFrom(data)
    expect(project().devices.slice(4).map((d) => d.position)).toEqual([{ x: 48, y: 48 }, { x: 48, y: 248 }])
  })

  it('ignore un presse-papiers invalide et colle la copie interne', () => {
    select(['cam1'])
    copySelection(null)
    const junk = fakeData()
    junk.setData(FRAGMENT_MIME, '{pas du json')
    expect(pasteFragmentFrom(junk)).toBe(true)
    expect(project().devices).toHaveLength(3)
  })

  it('ne colle rien sans copie, ni en lecture seule', () => {
    expect(pasteFragmentFrom(fakeData())).toBe(false)
    select(['cam1'])
    copySelection(null)
    projectStore.getState().loadProject(sampleProject(), null, { readOnly: true })
    expect(pasteFragmentFrom(null)).toBe(false)
    expect(project().devices).toHaveLength(2)
    expect(projectStore.getState().toast).toContain('lecture seule')
  })

  it('couper retire les originaux ; dupliquer colle aussitôt à côté', () => {
    select(['cam1'])
    expect(cutSelection(null)).toBe(true)
    expect(project().devices.map((d) => d.id)).toEqual(['sw1'])
    expect(pasteFragmentFrom(null)).toBe(true)
    expect(project().devices).toHaveLength(2)
    select(['sw1'])
    expect(duplicateSelection()).toBe(true)
    expect(project().devices.at(-1)).toMatchObject({ name: 'SW-2', position: { x: 24, y: 24 } })
  })
})
