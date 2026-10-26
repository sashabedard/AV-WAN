// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VmTile } from './VmTile'
import { projectStore } from '../store/projectStore'
import { uiStore } from '../store/uiStore'
import { sampleProject } from '../model/__fixtures__/sample'
import type { Vm } from '../model/types'

const vm: Vm = {
  id: 'vm1',
  hostId: 'cam1',
  name: 'VM Show',
  specs: { os: 'Ubuntu 24.04', vcpu: 4, ramGb: 16 },
  vnics: [
    { id: 'n0', label: 'vnic0', ips: [{ address: '10.40.0.32', mode: 'static' }] },
    { id: 'n1', label: 'vnic1', ips: [{ address: '', mode: 'dhcp' }] }
  ]
}

beforeEach(() => projectStore.getState().loadProject({ ...sampleProject(), vms: [vm] }, null))
afterEach(() => {
  act(() => uiStore.getState().setLang('fr'))
  cleanup()
})

describe('VmTile', () => {
  it('affiche nom, badge OS, ressources et une ligne par vNIC', () => {
    render(<VmTile vm={vm} />)
    expect(screen.getByText('VM Show')).toBeTruthy()
    expect(screen.getByText('Ubuntu 24.04')).toBeTruthy()
    expect(screen.getByText('4 vCPU · 16 Go')).toBeTruthy()
    expect(screen.getByText('vnic0 · 10.40.0.32')).toBeTruthy()
    expect(screen.getByText('vnic1 · DHCP')).toBeTruthy()
  })

  it('un clic sélectionne la VM ; la tuile sélectionnée est marquée', async () => {
    const user = userEvent.setup()
    const { container } = render(<VmTile vm={vm} />)
    const tile = container.querySelector('.vm')!
    expect(tile.classList.contains('nodrag')).toBe(true)
    expect(tile.classList.contains('vm--selected')).toBe(false)
    await user.click(tile)
    expect(projectStore.getState().selection).toEqual({ deviceIds: [], linkIds: [], vmIds: ['vm1'] })
    expect(container.querySelector('.vm')!.classList.contains('vm--selected')).toBe(true)
  })

  it('en anglais', () => {
    act(() => uiStore.getState().setLang('en'))
    render(<VmTile vm={vm} />)
    expect(screen.getByText('4 vCPU · 16 GB')).toBeTruthy()
  })
})
