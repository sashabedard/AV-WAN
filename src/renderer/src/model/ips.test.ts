import { describe, expect, it } from 'vitest'
import type { Device } from './types'
import { deviceIps, isNetworkPort, portIps, primaryIp, withPrimaryIp } from './ips'

const ip = (address: string) => ({ address, mode: 'static' as const })
const dev = (over: Partial<Device> = {}): Device => ({
  id: 'd',
  templateId: 'generic',
  name: 'D',
  position: { x: 0, y: 0 },
  portSide: 'auto',
  ports: [
    { id: 'USB', label: 'USB', connector: 'usb' },
    { id: 'ETH1', label: 'ETH1', connector: 'rj45' },
    { id: 'ETH2', label: 'ETH2', connector: 'rj45' }
  ],
  portState: {},
  ...over
})

describe('ips', () => {
  it('isNetworkPort : rj45, sfp, sfp+, wifi seulement', () => {
    expect(['rj45', 'sfp', 'sfp+', 'wifi', 'usb', 'hdmi', 'displayport'].map((c) => isNetworkPort({ id: 'x', label: 'x', connector: c as never }))).toEqual([true, true, true, true, false, false, false])
  })

  it('primaryIp ignore un port USB et renvoie la 1ʳᵉ IP du 1ᵉʳ port réseau qui en a', () => {
    expect(primaryIp(dev())).toBeUndefined()
    const d = dev({ portState: { USB: { ips: [ip('1.1.1.1')] }, ETH2: { ips: [ip('10.0.0.2'), ip('10.0.0.3')] } } })
    expect(primaryIp(d)).toEqual(ip('10.0.0.2'))
  })

  it('withPrimaryIp place l’adresse en tête du 1ᵉʳ port réseau', () => {
    const d = withPrimaryIp(dev({ portState: { ETH1: { nativeVlan: 10, ips: [ip('10.0.0.9')] } } }), ip('10.0.0.1'))
    expect(d.portState['ETH1']).toEqual({ nativeVlan: 10, ips: [ip('10.0.0.1'), ip('10.0.0.9')] })
  })

  it('portIps : [] sans IP, sinon la liste du port', () => {
    const d = dev({ portState: { ETH1: { ips: [ip('10.0.0.1')] } } })
    expect(portIps(d, 'ETH2')).toEqual([])
    expect(portIps(d, 'ETH1')).toEqual([ip('10.0.0.1')])
  })

  it('deviceIps : toutes les IP des ports réseau, dans l’ordre des ports', () => {
    const d = dev({ portState: { USB: { ips: [ip('1.1.1.1')] }, ETH2: { ips: [ip('10.0.0.2'), ip('10.0.0.3')] }, ETH1: { ips: [ip('10.0.0.1')] } } })
    expect(deviceIps(d).map((e) => [e.port.id, e.ip.address, e.index])).toEqual([
      ['ETH1', '10.0.0.1', 0],
      ['ETH2', '10.0.0.2', 0],
      ['ETH2', '10.0.0.3', 1]
    ])
  })
})
