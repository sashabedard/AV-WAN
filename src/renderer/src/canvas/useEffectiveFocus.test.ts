import { beforeEach, describe, expect, it } from 'vitest'
import { effectiveFocus } from './useEffectiveFocus'
import { projectStore } from '../store/projectStore'
import { uiStore } from '../store/uiStore'
import { sampleProject } from '../model/__fixtures__/sample'

beforeEach(() => {
  projectStore.getState().loadProject(sampleProject(), null)
})

const vlanId = (): number => projectStore.getState().history.present.vlans[0]!.id
const present = () => projectStore.getState().history.present

describe('focus VLAN', () => {
  it('n’atténue qu’en mode VLAN et pour un VLAN existant', () => {
    const id = vlanId()
    projectStore.getState().setColorMode('vlan')
    expect(effectiveFocus(present(), id)).toBe(id)
    expect(effectiveFocus(present(), 4093)).toBeNull()
    projectStore.getState().setColorMode('type')
    expect(effectiveFocus(present(), id)).toBeNull()
  })

  it('retirer le VLAN focalisé remet le focus à zéro', () => {
    const id = vlanId()
    uiStore.getState().setFocusVlan(id)
    projectStore.getState().removeVlan(id)
    expect(uiStore.getState().focusVlan).toBeNull()
  })

  it('renuméroter le VLAN focalisé déplace le focus', () => {
    const id = vlanId()
    uiStore.getState().setFocusVlan(id)
    expect(projectStore.getState().changeVlanId(id, 3999)).toBe(true)
    expect(uiStore.getState().focusVlan).toBe(3999)
  })

  it('un nouveau document remet à zéro l’état transitoire', () => {
    const ui = uiStore.getState()
    ui.setFocusVlan(40)
    ui.setInspectVlan(40)
    ui.setPendingZone(true)
    ui.openSearch(null)
    ui.setHoverDevice('x')
    ui.setReconnecting('l')
    for (const reload of [() => projectStore.getState().loadProject(sampleProject(), null), () => projectStore.getState().newProject()]) {
      ui.setFocusVlan(40)
      ui.setInspectVlan(40)
      ui.setPendingTemplate('dante-avio')
      ui.openSearch(null)
      reload()
      const s = uiStore.getState()
      expect([s.focusVlan, s.inspectVlanId, s.pendingZone, s.pendingTemplateId, s.search, s.hoverDeviceId, s.reconnectingLinkId]).toEqual([null, null, false, null, null, null, null])
    }
  })
})
