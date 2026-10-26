// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Inspector } from '../Inspector'
import { projectStore } from '../../store/projectStore'
import { uiStore } from '../../store/uiStore'
import { createDevice, createProject } from '../../model/project'
import type { Project } from '../../model/types'

function project(): Project {
  const p = createProject(new Date(2026, 9, 26), 'fr')
  const host = { ...createDevice(p, 'media-server', { x: 0, y: 0 }, { lang: 'fr', id: 'h1' }), name: 'SRV-HV-01' }
  const pc = { ...createDevice(p, 'media-pc', { x: 400, y: 0 }, { lang: 'fr', id: 'h2' }), name: 'PC-1' }
  const cam = createDevice(p, 'ptz-ndi', { x: 0, y: 400 }, { lang: 'fr', id: 'cam' })
  return {
    ...p,
    devices: [host, pc, cam],
    vms: [{ id: 'vm', hostId: 'h1', name: 'VM Show', vnics: [{ id: 'n0', label: 'vnic0', bridgePortId: 'ETH1', ips: [{ address: '10.40.0.32', mode: 'static' }] }] }]
  }
}
const vm = () => projectStore.getState().history.present.vms!.find((v) => v.id === 'vm')!

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  projectStore.getState().loadProject(project(), null)
  projectStore.getState().setSelection({ deviceIds: [], linkIds: [], vmIds: ['vm'] })
})
afterEach(() => {
  act(() => uiStore.getState().setLang('fr'))
  cleanup()
})

describe('VmForm', () => {
  it('l’inspecteur montre la fiche de la VM sélectionnée', () => {
    render(<Inspector />)
    expect(screen.getByRole('heading', { name: 'Machine virtuelle' })).toBeTruthy()
    expect((screen.getByRole('textbox', { name: 'Nom' }) as HTMLInputElement).value).toBe('VM Show')
  })

  it('la liste « Hôte » ne propose que les ordinateurs ; changer d’hôte déplace la VM', async () => {
    const user = userEvent.setup()
    render(<Inspector />)
    const host = screen.getByRole('combobox', { name: 'Hôte' })
    expect(within(host).getAllByRole('option').map((o) => o.textContent)).toEqual(['SRV-HV-01', 'PC-1'])
    await user.selectOptions(host, 'h2')
    expect(vm().hostId).toBe('h2')
  })

  it('« Pont » liste les ports réseau de l’hôte et « — »', async () => {
    const user = userEvent.setup()
    render(<Inspector />)
    const bridge = screen.getByRole('combobox', { name: 'Pont de vnic0' })
    expect(within(bridge).getAllByRole('option').map((o) => o.textContent)).toEqual(['—', 'ETH1', 'ETH2', 'ETH3', 'ETH4'])
    await user.selectOptions(bridge, '')
    expect('bridgePortId' in vm().vnics[0]!).toBe(false)
  })

  it('« + vNIC » ajoute une interface avec sa liste d’IP ; ✕ la retire', async () => {
    const user = userEvent.setup()
    render(<Inspector />)
    expect((screen.getByRole('textbox', { name: 'Adresse IP 1 de vnic0' }) as HTMLInputElement).value).toBe('10.40.0.32')
    await user.click(screen.getByRole('button', { name: '+ vNIC' }))
    expect(vm().vnics.map((n) => n.label)).toEqual(['vnic0', 'vnic1'])
    await user.click(screen.getByRole('button', { name: 'Ajouter une IP à vnic1' }))
    expect(vm().vnics[1]!.ips).toEqual([{ address: '', mode: 'static' }])
    await user.click(screen.getByRole('button', { name: 'Retirer vnic0' }))
    expect(vm().vnics.map((n) => n.label)).toEqual(['vnic1'])
  })

  it('OS, vCPU, RAM, disque, GPU, nom d’hôte et note modifient la VM', async () => {
    const user = userEvent.setup()
    render(<Inspector />)
    const type = async (name: string, text: string) => user.type(screen.getByRole('textbox', { name }), `${text}{Enter}`)
    await type('Système', 'Ubuntu 24.04')
    await type('vCPU', '8')
    await type('RAM (Go)', '16,5')
    await type('Disque (Go)', '200')
    await type('GPU passthrough', 'A6000')
    await type('Nom d’hôte', 'show-01')
    await type('Note', 'TouchDesigner')
    expect(vm()).toMatchObject({ specs: { os: 'Ubuntu 24.04', vcpu: 8, ramGb: 16.5, diskGb: 200, gpuPassthrough: 'A6000' }, hostname: 'show-01', note: 'TouchDesigner' })
  })

  it('« Supprimer la VM »', async () => {
    const user = userEvent.setup()
    render(<Inspector />)
    await user.click(screen.getByRole('button', { name: 'Supprimer la VM' }))
    expect(projectStore.getState().history.present.vms).toEqual([])
  })

  it('en anglais', () => {
    act(() => uiStore.getState().setLang('en'))
    render(<Inspector />)
    expect(screen.getByRole('heading', { name: 'Virtual machine' })).toBeTruthy()
    expect(screen.getByRole('combobox', { name: 'Bridge of vnic0' })).toBeTruthy()
  })
})

describe('DeviceForm — VMs et matériel', () => {
  const select = (id: string) => projectStore.getState().setSelection({ deviceIds: [id], linkIds: [] })

  it('« + VM » sur un ordinateur, pas sur une caméra', async () => {
    const user = userEvent.setup()
    select('h2')
    render(<Inspector />)
    await user.click(screen.getByRole('button', { name: '+ VM' }))
    expect(projectStore.getState().history.present.vms!.filter((v) => v.hostId === 'h2').map((v) => v.name)).toEqual(['VM 1'])
    expect(screen.getByRole('heading', { name: 'Machine virtuelle' })).toBeTruthy()
    cleanup()
    select('cam')
    render(<Inspector />)
    expect(screen.queryByRole('button', { name: '+ VM' })).toBeNull()
  })

  it('« Matériel » ouvert pour un ordinateur, fermé ailleurs ; écrit les specs', async () => {
    const user = userEvent.setup()
    select('h1')
    const { container } = render(<Inspector />)
    expect((container.querySelector('details.hw') as HTMLDetailsElement).open).toBe(true)
    await user.type(screen.getByRole('textbox', { name: 'CPU' }), '2× Xeon{Enter}')
    await user.type(screen.getByRole('textbox', { name: 'RAM (Go)' }), '256{Enter}')
    expect(projectStore.getState().history.present.devices[0]!.specs).toEqual({ cpu: '2× Xeon', ramGb: 256 })
    cleanup()
    select('cam')
    const r = render(<Inspector />)
    expect((r.container.querySelector('details.hw') as HTMLDetailsElement).open).toBe(false)
  })
})
