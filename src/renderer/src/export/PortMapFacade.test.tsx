// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { PortMapFacade } from './PortMapFacade'
import { createExampleProject } from '../samples/exampleProject'
import { portMaps } from '../reports/portMaps'

afterEach(cleanup)

describe('PortMapFacade', () => {
  it('colore chaque port par son VLAN natif, épaissit les trunks et marque le PoE actif', () => {
    const p = createExampleProject(new Date(2026, 9, 13), 'fr')
    const map = portMaps(p, 'fr').find((m) => m.name === 'SW-2')!
    const device = p.devices.find((d) => d.id === map.deviceId)!
    const { container } = render(<PortMapFacade device={device} rows={map.rows} />)
    expect(screen.getByRole('img', { name: 'Façade de SW-2' })).toBeTruthy()
    expect(container.querySelectorAll('[data-port]')).toHaveLength(10)
    expect(container.querySelector('[data-port="1"] .pmf__port')!.getAttribute('fill')).toBe('#2563C9')
    expect(container.querySelector('[data-port="7"] .pmf__port')!.getAttribute('fill')).toBe('#ffffff')
    expect(container.querySelectorAll('.pmf__port--trunk')).toHaveLength(2) // port 3 (point d'accès) et S1 (fibre)
    expect(container.querySelectorAll('.pmf__bolt')).toHaveLength(6) // ports 1 à 6 alimentent
  })
})
