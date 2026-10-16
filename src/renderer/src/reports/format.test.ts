import { describe, expect, it } from 'vitest'
import { sampleProject } from '../model/__fixtures__/sample'
import { cellText, compareText, formatNumber, ipLabel, lengthLabel, poeLabel, portRefLabel, taggedLabel, vlanName } from './format'

const p = sampleProject()

describe('format des rapports', () => {
  it('nomme un port de façade « port n », les autres par leur étiquette, « ? » si le port a disparu', () => {
    expect(portRefLabel(p, { deviceId: 'sw1', portId: '1' }, 'fr')).toBe('SW-1 · port 1')
    expect(portRefLabel(p, { deviceId: 'cam1', portId: 'ETH' }, 'fr')).toBe('CAM-1 · ETH')
    expect(portRefLabel(p, { deviceId: 'parti', portId: 'ETH' }, 'fr')).toBe('? · ETH')
  })

  it('nomme un VLAN, ou donne son numéro seul s’il a été retiré du projet', () => {
    expect(vlanName(p, 40)).toBe('40 NDI')
    expect(vlanName(p, 35)).toBe('35')
  })

  it('écrit nombres, longueurs, PoE, IP et VLAN étiquetés à la française', () => {
    expect(formatNumber(1.5, 'fr')).toBe('1,5')
    expect(lengthLabel(undefined, 'fr')).toBe('—')
    expect(lengthLabel(12, 'fr')).toBe('12 m')
    expect(poeLabel({ active: true, cls: 'at', drawW: 25 }, 'fr')).toBe('PoE+ actif (25 W)')
    expect(poeLabel({ active: true, cls: 'af' }, 'fr')).toBe('PoE actif')
    expect(poeLabel({ active: false }, 'fr')).toBe('—')
    expect(ipLabel({ address: '10.40.0.21', mode: 'static' }, 'fr')).toBe('10.40.0.21 statique')
    expect(ipLabel({ address: '', mode: 'dhcp' }, 'fr')).toBe('DHCP')
    expect(ipLabel({ address: '10.60.0.50', mode: 'dhcp' }, 'fr')).toBe('10.60.0.50 (DHCP)')
    expect(ipLabel(undefined, 'fr')).toBe('non définie')
    expect(taggedLabel([60, 10], 'fr')).toBe('10, 60')
    expect(taggedLabel('all', 'fr')).toBe('Tous')
    expect(taggedLabel([], 'fr')).toBe('—')
    expect(cellText(null, 'fr')).toBe('—')
    expect(cellText('', 'fr')).toBe('—')
    expect(cellText(2.5, 'fr')).toBe('2,5')
  })

  it('trie comme un humain : C-002 avant C-010', () => {
    expect(['C-010', 'C-002', 'C-001'].sort((a, b) => compareText(a, b, 'fr'))).toEqual(['C-001', 'C-002', 'C-010'])
  })
})
