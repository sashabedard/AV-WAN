// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PortIps } from './PortIps'
import { projectStore } from '../../store/projectStore'
import { uiStore } from '../../store/uiStore'
import { sampleProject } from '../../model/__fixtures__/sample'

const cam = () => projectStore.getState().history.present.devices.find((d) => d.id === 'cam1')!
const port = (id: string) => cam().ports.find((p) => p.id === id)!

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  const p = sampleProject()
  p.devices[1]!.portState['ETH'] = { ips: [{ address: '10.40.0.21', mode: 'static' }, { address: '', mode: 'dhcp' }] }
  projectStore.getState().loadProject(p, null)
})
afterEach(() => {
  act(() => uiStore.getState().setLang('fr'))
  cleanup()
})

describe('PortIps', () => {
  it('un port RJ45 affiche ses 2 IP et « + IP »', () => {
    render(<PortIps device={cam()} port={port('ETH')} />)
    expect((screen.getByRole('textbox', { name: 'Adresse IP 1 de ETH' }) as HTMLInputElement).value).toBe('10.40.0.21')
    expect((screen.getByRole('textbox', { name: 'Adresse IP 2 de ETH' }) as HTMLInputElement).value).toBe('')
    expect(screen.getByRole('button', { name: 'Ajouter une IP à ETH' }).textContent).toBe('+ IP')
  })

  it('un port HDMI n’affiche rien', () => {
    const { container } = render(<PortIps device={cam()} port={port('HDMI')} />)
    expect(container.innerHTML).toBe('')
  })

  it('saisir une adresse, changer le mode, ajouter et retirer modifient le projet', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<PortIps device={cam()} port={port('ETH')} />)
    const field = screen.getByRole('textbox', { name: 'Adresse IP 2 de ETH' })
    await user.type(field, '10.40.0.99{Enter}')
    expect(cam().portState['ETH']!.ips![1]).toEqual({ address: '10.40.0.99', mode: 'dhcp' })
    rerender(<PortIps device={cam()} port={port('ETH')} />)
    await user.click(screen.getAllByRole('button', { name: 'Statique' })[1]!)
    expect(cam().portState['ETH']!.ips![1]!.mode).toBe('static')
    rerender(<PortIps device={cam()} port={port('ETH')} />)
    await user.click(screen.getByRole('button', { name: 'Retirer l’IP 1 de ETH' }))
    expect(cam().portState['ETH']!.ips).toEqual([{ address: '10.40.0.99', mode: 'static' }])
    rerender(<PortIps device={cam()} port={port('ETH')} />)
    await user.click(screen.getByRole('button', { name: 'Ajouter une IP à ETH' }))
    expect(cam().portState['ETH']!.ips).toHaveLength(2)
  })

  it('en anglais', () => {
    act(() => uiStore.getState().setLang('en'))
    render(<PortIps device={cam()} port={port('ETH')} />)
    expect(screen.getByRole('textbox', { name: 'IP address 1 of ETH' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add an IP to ETH' })).toBeTruthy()
  })
})
