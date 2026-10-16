// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { fileTextOf, printTextOf } from './fileText'
import { dmxChannelsStore } from '../store/dmxChannelsStore'
import { createDevice, createProject } from '../model/project'
import type { Project } from '../model/types'

const WASH = { templateId: 'dmx-fixture', model: 'Wash', mode: '9CH' }

function project(): Project {
  const p = createProject(new Date(2026, 9, 15), 'fr')
  const d = { ...createDevice(p, 'dmx-fixture', { x: 0, y: 0 }, { lang: 'fr', id: 'w' }), model: 'Wash', dmx: { footprint: 9, mode: '9CH' } }
  return { ...p, devices: [d], dmxChannels: [{ templateId: 'parti', params: ['X'] }] }
}

afterEach(() => dmxChannelsStore.setState({ lists: [] }))

describe('texte écrit sur le disque', () => {
  it('enregistrement : listes des réglages embarquées, listes inutiles retirées', () => {
    dmxChannelsStore.setState({ lists: [{ ...WASH, params: ['Red'] }] })
    expect(JSON.parse(fileTextOf(project())).dmxChannels).toEqual([{ ...WASH, params: ['Red'] }])
  })

  it('impression : listes des réglages embarquées, rien d’autre ne change', () => {
    dmxChannelsStore.setState({ lists: [{ ...WASH, params: ['Red'] }] })
    expect(JSON.parse(printTextOf(project())).dmxChannels).toEqual([{ templateId: 'parti', params: ['X'] }, { ...WASH, params: ['Red'] }])
  })
})
