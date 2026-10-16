// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { RackView } from './RackView'
import { AppShell } from '../app/AppShell'
import { projectStore } from '../store/projectStore'
import { uiStore } from '../store/uiStore'
import { rackSample } from './__fixtures__/rackSample'
import { sampleProject } from '../model/__fixtures__/sample'
import type { AvwanApi } from '../../../shared/api'
import { registerFlowInstance } from '../dev/e2eHooks'
import { DEVICE_MIME } from './rackDelete'
import { RACK_TITLE_H, RACK_U_PX } from './rackLayout'

vi.mock('../dev/e2eHooks', async (orig) => ({ ...(await orig<typeof import('../dev/e2eHooks')>()), registerFlowInstance: vi.fn() }))

const selection = () => projectStore.getState().selection

beforeEach(() => {
  // jsdom n'a ni ResizeObserver ni DOMMatrixReadOnly (React Flow) ni matchMedia (thème) : thème imposé, doublures muettes.
  vi.stubGlobal('ResizeObserver', class { observe(): void {} unobserve(): void {} disconnect(): void {} })
  vi.stubGlobal('DOMMatrixReadOnly', class { m22 = 1 })
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: () => undefined, removeEventListener: () => undefined }))
  document.documentElement.dataset['theme'] = 'dark'
  projectStore.getState().loadProject(rackSample(), null)
  act(() => {
    uiStore.getState().setLang('fr')
    uiStore.getState().setView('schema')
    uiStore.getState().setWelcome(false)
  })
})
afterEach(() => {
  cleanup()
  act(() => uiStore.getState().resetForDocument())
  vi.unstubAllGlobals()
  delete document.documentElement.dataset['theme']
  act(() => uiStore.getState().setView('schema'))
})

describe('RackView', () => {
  it('rend la baie, sa façade de switch, le bloc MAC-1 et le bout de câble vers CAM-1', () => {
    render(<RackView />)
    expect(screen.getByText('BAIE-1')).toBeTruthy()
    expect(screen.getByText(/Régie · 12U/)).toBeTruthy()
    expect(screen.getByTestId('device-SW-1')).toBeTruthy()
    const mac = screen.getByTestId('rack-device-MAC-1')
    expect(mac.textContent).toContain('MAC-1')
    expect(mac.textContent).toContain('2U')
    expect(mac.querySelectorAll('.react-flow__handle')).toHaveLength(2)
    expect(screen.getByText('→ CAM-1 · ETH')).toBeTruthy()
    expect(screen.queryByTestId('device-CAM-1')).toBeNull()
    expect(screen.getByText('8U libres')).toBeTruthy()
    expect(screen.getByText('1U libre')).toBeTruthy()
  })

  it('en anglais : plages libres et titre en anglais', () => {
    act(() => uiStore.getState().setLang('en'))
    render(<RackView />)
    expect(screen.getByText('8U free')).toBeTruthy()
    expect(screen.getByText(/Régie · 12U/)).toBeTruthy()
  })

  it('vue vide : message et « + Baie » qui ajoute une baie', () => {
    projectStore.getState().loadProject(sampleProject(), null)
    render(<RackView />)
    expect(screen.getByText(/Aucune baie/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '+ Baie' }))
    expect(projectStore.getState().history.present.racks).toHaveLength(1)
    expect(screen.getByText('BAIE-1')).toBeTruthy()
  })

  it('clic sur le titre de la baie : la sélection devient rackIds', () => {
    render(<RackView />)
    fireEvent.click(screen.getByText('BAIE-1'))
    expect(selection()).toEqual({ deviceIds: [], linkIds: [], rackIds: ['r1'] })
  })

  it('la sélection du store devient celle de la vue', () => {
    projectStore.getState().setSelection({ deviceIds: ['mac'], linkIds: ['l1'] })
    render(<RackView />)
    expect(document.querySelector('.react-flow__node[data-id="mac"]')?.classList.contains('selected')).toBe(true)
    // jsdom ne mesure pas les poignées : React Flow n'y dessine pas les cordons ; la sélection du câble reste au store.
    expect(selection()).toEqual({ deviceIds: ['mac'], linkIds: ['l1'] })
    act(() => projectStore.getState().setSelection({ deviceIds: [], linkIds: [], rackIds: ['r1'] }))
    expect(document.querySelector('.react-flow__node[data-id="mac"]')?.classList.contains('selected')).toBe(false)
    expect(document.querySelector('.react-flow__node[data-id="r1"]')?.classList.contains('selected')).toBe(true)
  })

  it('le montage ne touche pas une sélection qui contient un appareil hors baie', () => {
    projectStore.getState().setSelection({ deviceIds: ['cam1', 'mac'], linkIds: [] })
    render(<RackView />)
    expect(selection()).toEqual({ deviceIds: ['cam1', 'mac'], linkIds: [] })
  })

  it('clic dans le vide : vide aussi la part de la sélection que la vue ne montre pas', () => {
    projectStore.getState().setSelection({ deviceIds: ['cam1'], linkIds: [] })
    render(<RackView />)
    fireEvent.click(document.querySelector('.react-flow__pane')!)
    expect(selection()).toEqual({ deviceIds: [], linkIds: [] })
  })

  it('lecture seule : « + Baie » désactivé', () => {
    projectStore.getState().loadProject(rackSample(), null, { readOnly: true })
    render(<RackView />)
    expect((screen.getByRole('button', { name: '+ Baie' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('cadrage : le cadrage gardé dans uiStore est rétabli au montage', () => {
    act(() => uiStore.getState().setRacksViewport({ x: 40, y: -20, zoom: 0.5 }))
    render(<RackView />)
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement
    expect(viewport.style.transform.replace(/\s/g, '')).toBe('translate(40px,-20px)scale(0.5)')
  })

})

describe('Review Focus 4 : basculer Schéma ↔ Baies garde la sélection et l’inspecteur', () => {
  beforeEach(() => {
    window.avwan = { platform: 'darwin', onUpdateReady: () => () => undefined, updates: { pending: () => Promise.resolve(null) } } as unknown as AvwanApi
  })
  afterEach(() => {
    delete (window as { avwan?: AvwanApi }).avwan
  })

  it('sélection { deviceIds: [mac] } : schéma → baies → schéma', () => {
    projectStore.getState().setSelection({ deviceIds: ['mac'], linkIds: [] })
    const before = selection()
    render(<AppShell />)
    const inspector = (): HTMLElement => screen.getByRole('complementary', { name: 'Inspecteur' })
    expect((within(inspector()).getByLabelText('Nom') as HTMLInputElement).value).toBe('MAC-1')
    act(() => uiStore.getState().setView('racks'))
    expect(screen.getByTestId('rack-device-MAC-1')).toBeTruthy()
    expect(selection()).toEqual(before)
    expect((within(inspector()).getByLabelText('Nom') as HTMLInputElement).value).toBe('MAC-1')
    act(() => uiStore.getState().setView('schema'))
    expect(screen.queryByTestId('rack-device-MAC-1')).toBeNull()
    expect(screen.getByTestId('device-MAC-1')).toBeTruthy()
    expect(selection()).toEqual(before)
    expect((within(inspector()).getByLabelText('Nom') as HTMLInputElement).value).toBe('MAC-1')
  })

  it('chaque vue garde son cadrage : le schéma retrouve le sien au retour, les baies le leur', () => {
    act(() => uiStore.getState().setSchemaViewport({ x: 30, y: 10, zoom: 0.8 }))
    act(() => uiStore.getState().setRacksViewport({ x: -5, y: 7, zoom: 0.4 }))
    render(<AppShell />)
    const transform = (): string => (document.querySelector('.react-flow__viewport') as HTMLElement).style.transform.replace(/\s/g, '')
    expect(transform()).toBe('translate(30px,10px)scale(0.8)')
    act(() => uiStore.getState().setView('racks'))
    expect(transform()).toBe('translate(-5px,7px)scale(0.4)')
    act(() => uiStore.getState().setView('schema'))
    expect(transform()).toBe('translate(30px,10px)scale(0.8)')
  })

  it('la vue Baies n’enregistre pas son instance auprès des crochets e2e (ceux du schéma restent)', async () => {
    render(<AppShell />)
    await vi.waitFor(() => expect(vi.mocked(registerFlowInstance)).toHaveBeenCalled())
    vi.mocked(registerFlowInstance).mockClear()
    act(() => uiStore.getState().setView('racks'))
    expect(screen.getByTestId('rack-device-MAC-1')).toBeTruthy()
    await new Promise((r) => setTimeout(r, 20))
    expect(vi.mocked(registerFlowInstance)).not.toHaveBeenCalled()
  })
  it('la liste « Pas encore en baie » montre CAM-1, pas les appareils déjà en baie', () => {
    render(<RackView />)
    expect(screen.getByTestId('unplaced-CAM-1')).toBeTruthy()
    expect(screen.queryByTestId('unplaced-MAC-1')).toBeNull()
  })

  const dropAt = (u: number, id: string) => {
    const flow = document.querySelector('.react-flow') as HTMLElement
    // jsdom n'a pas DragEvent : un événement nu porte les coordonnées et le dataTransfer.
    const ev = Object.assign(new Event('drop', { bubbles: true, cancelable: true }), { clientX: 40, clientY: RACK_TITLE_H + (12 - u) * RACK_U_PX + RACK_U_PX / 2, dataTransfer: { types: [DEVICE_MIME], getData: () => id } })
    act(() => {
      flow.dispatchEvent(ev)
    })
  }

  it('déposer CAM-1 au centre de l’U5 le place en U5', () => {
    render(<RackView />)
    const cam = projectStore.getState().history.present.devices.find((d) => d.name === 'CAM-1')!
    dropAt(5, cam.id)
    expect(projectStore.getState().history.present.devices.find((d) => d.id === cam.id)!.rack).toEqual({ rackId: 'r1', u: 5, heightU: 1 })
  })

  it('déposer sur une fente occupée (U3, MAC-1) : rien ne bouge, toast « pas assez de U »', () => {
    render(<RackView />)
    const cam = projectStore.getState().history.present.devices.find((d) => d.name === 'CAM-1')!
    const before = projectStore.getState().history.present
    dropAt(3, cam.id)
    expect(projectStore.getState().history.present).toBe(before)
    expect(projectStore.getState().toast).toMatch(/U libres/)
  })

  it('Suppr sur MAC-1 : il quitte la baie, reste dans le projet avec ses câbles, et ⌘Z le remet', async () => {
    render(<RackView />)
    act(() => projectStore.getState().setSelection({ deviceIds: ['mac'], linkIds: [] }))
    fireEvent.keyDown(document.body, { key: 'Delete' })
    await vi.waitFor(() => expect(projectStore.getState().history.present.devices.find((d) => d.id === 'mac')!.rack).toBeUndefined())
    const p = projectStore.getState().history.present
    expect(p.links.some((l) => l.id === 'l2')).toBe(true)
    act(() => projectStore.getState().undo())
    expect(projectStore.getState().history.present.devices.find((d) => d.id === 'mac')!.rack).toEqual({ rackId: 'r1', u: 3, heightU: 2 })
  })
})
