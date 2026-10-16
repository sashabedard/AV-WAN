// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { Inspector } from '../Inspector'
import { projectStore } from '../../store/projectStore'
import { uiStore } from '../../store/uiStore'
import { createExampleProject } from '../../samples/exampleProject'
import { createDevice } from '../../model/project'
import { cableSchedule } from '../../reports/cableSchedule'
import { toCsv } from '../../../../shared/tables'
import { cordTag, toFlowEdges, analyzeLinks, createFlowCache } from '../../canvas/toFlow'
import { messages } from '../../../../shared/i18n/messages'

const base = createExampleProject(new Date(2026, 9, 13), 'fr')
const swId = base.devices.find((d) => d.name === 'SW-1')!.id
const project = {
  ...base,
  devices: [...base.devices, { ...createDevice(base, 'patch-panel-24', { x: 0, y: 0 }, { lang: 'fr', id: 'pp1' }), name: 'PP-1' }],
  links: [...base.links, { id: 'lpp', cableId: 'C-900', a: { deviceId: swId, portId: '5' }, b: { deviceId: 'pp1', portId: 'A3' }, medium: 'cat6' as const }]
}
const RAW = /\b[AR]\d{1,2}\b/

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  projectStore.getState().loadProject(project, null)
})
afterEach(() => {
  act(() => uiStore.getState().setLang('fr'))
  cleanup()
  vi.restoreAllMocks()
})

describe('prises de panneau dans l’inspecteur et le canvas', () => {
  it('l’en-tête du câble dit « PP-1 · 3 avant » (FR) et « PP-1 · 3 front » (EN)', () => {
    projectStore.getState().setSelection({ deviceIds: [], linkIds: ['lpp'] })
    render(<Inspector />)
    expect(screen.getByTestId('link-ends').textContent).toContain('PP-1 · 3 avant')
    act(() => uiStore.getState().setLang('en'))
    expect(screen.getByTestId('link-ends').textContent).toContain('PP-1 · 3 front')
  })

  it('le tableau des ports du panneau va de « 1 avant » à « 24 arrière »', () => {
    projectStore.getState().setSelection({ deviceIds: ['pp1'], linkIds: [] })
    const { container } = render(<Inspector />)
    const cells = [...container.querySelectorAll('td')].map((td) => td.textContent)
    expect(cells).toContain('1 avant')
    expect(cells).toContain('24 arrière')
  })

  it('Review Focus 3 : aucun A3 / R3 visible (câble, panneau, liste de branchement)', () => {
    for (const lang of ['fr', 'en'] as const) {
      act(() => uiStore.getState().setLang(lang))
      projectStore.getState().setSelection({ deviceIds: [], linkIds: ['lpp'] })
      const cable = render(<Inspector />)
      expect(cable.container.textContent).not.toMatch(RAW)
      cable.unmount()
      projectStore.getState().setSelection({ deviceIds: ['pp1'], linkIds: [] })
      const panel = render(<Inspector />)
      expect(panel.container.textContent).not.toMatch(RAW)
      expect([...panel.container.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).join(' ')).not.toMatch(RAW)
      panel.unmount()
      const table = cableSchedule(project, lang)
      expect(JSON.stringify(table.rows)).not.toMatch(RAW)
      expect(toCsv(table, lang)).not.toMatch(RAW)
    }
  })

  it('les cordons du canvas portent « 3 avant » / « 3 front »', () => {
    const link = project.links.find((l) => l.id === 'lpp')!
    expect(cordTag(project, link, messages('fr'))).toContain('PP-1:3 avant')
    expect(cordTag(project, link, messages('en'))).toContain('PP-1:3 front')
    const edge = toFlowEdges(project, analyzeLinks(project, 'dark', 'fr'), createFlowCache(), messages('fr')).find((e) => e.id === 'lpp')!
    expect(edge.data!.portLabels).toEqual(['5', '3 avant'])
  })
})
