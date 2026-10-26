// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { ReactFlowProvider, type NodeProps } from '@xyflow/react'
import { SwitchNode } from './SwitchNode'
import { StaticViewContext } from './staticView'
import { uiStore } from '../store/uiStore'
import { projectStore } from '../store/projectStore'
import { sampleProject } from '../model/__fixtures__/sample'
import { patchPanelPorts } from '../catalog/ports'
import { switchFacade } from './switchFacade'
import type { Device } from '../model/types'
import type { DeviceFlowNode, PortInfo } from './toFlow'

const panel: Device = {
  id: 'pp1',
  templateId: 'patch-panel-24',
  name: 'PP-1',
  position: { x: 0, y: 0 },
  portSide: 'auto',
  ports: patchPanelPorts(24),
  portState: {}
}
const info = (linkId: string): PortInfo => ({ linkId, color: '#2a9d8f', poe: false })

function renderPanel(ports: Record<string, PortInfo>, staticView = false) {
  const props = { id: 'pp1', selected: false, data: { device: panel, template: undefined, sides: {}, ports, vlans: [], line2: '', vms: [] } } as unknown as NodeProps<DeviceFlowNode>
  const tree = (
    <ReactFlowProvider>
      <SwitchNode {...props} />
    </ReactFlowProvider>
  )
  return render(staticView ? <StaticViewContext.Provider value={true}>{tree}</StaticViewContext.Provider> : tree)
}
const handle = (c: HTMLElement, id: string): HTMLElement => c.querySelector(`.react-flow__handle[data-handleid="${id}"]`) as HTMLElement
const tieClasses = (c: HTMLElement): string[] => [...c.querySelectorAll('.sw__tie')].map((t) => t.getAttribute('class') ?? '')

beforeEach(() => {
  projectStore.getState().loadProject(sampleProject(), null)
  act(() => uiStore.getState().setLang('fr'))
})
afterEach(cleanup)

describe('SwitchNode — panneau de brassage', () => {
  const cabled = { A1: info('l1'), A3: info('l2'), R3: info('l3') }

  it('trait par position : partiel, vide, complet', () => {
    const { container } = renderPanel(cabled)
    const ties = tieClasses(container)
    expect(ties).toHaveLength(24)
    expect(ties[0]).toContain('sw__tie--partial')
    expect(ties[1]).toContain('sw__tie--empty')
    expect(ties[2]).toContain('sw__tie--complete')
  })

  it('étiquettes de rangée AVANT / ARRIÈRE, FRONT / BACK en anglais', () => {
    const fr = renderPanel(cabled)
    expect(fr.container.textContent).toContain('AVANT')
    expect(fr.container.textContent).toContain('ARRIÈRE')
    expect(handle(fr.container, 'A3').title).toBe('Port 3 avant')
    cleanup()
    act(() => uiStore.getState().setLang('en'))
    const en = renderPanel(cabled)
    expect(en.container.textContent).toContain('FRONT')
    expect(en.container.textContent).toContain('BACK')
    expect(handle(en.container, 'A3').title).toBe('Port 3 front')
  })

  it('un seul numéro par position, de 1 à 24', () => {
    const { container } = renderPanel(cabled)
    const nums = [...container.querySelectorAll('.sw__num')].map((t) => t.textContent)
    expect(nums).toEqual(Array.from({ length: 24 }, (_, i) => String(i + 1)))
  })

  it('la LED de la rangée arrière passe sous la prise, hors du trait', () => {
    const { container } = renderPanel(cabled)
    const f = switchFacade(panel.ports, { patchPanel: true })
    const r1 = f.ports.find((p) => p.id === 'R1')!
    const leds = [...container.querySelectorAll('.sw__led')]
    const led = leds[f.ports.findIndex((p) => p.id === 'R1')]
    expect(Number(led.getAttribute('cy'))).toBeGreaterThan(r1.y + r1.h)
  })

  it('survol de A1 : R1 reçoit port--twin, retiré à la sortie', () => {
    const { container } = renderPanel(cabled)
    expect(handle(container, 'R1').className).not.toContain('port--twin')
    fireEvent.mouseEnter(handle(container, 'A1'))
    expect(handle(container, 'R1').className).toContain('port--twin')
    expect(handle(container, 'A1').className).not.toContain('port--twin')
    fireEvent.mouseLeave(handle(container, 'A1'))
    expect(handle(container, 'R1').className).not.toContain('port--twin')
  })

  it('vue figée : traits dessinés, survol sans effet', () => {
    const { container } = renderPanel(cabled, true)
    expect(tieClasses(container)).toHaveLength(24)
    fireEvent.mouseEnter(handle(container, 'A1'))
    expect(handle(container, 'R1').className).not.toContain('port--twin')
  })
})
