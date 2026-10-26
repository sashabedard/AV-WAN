import { describe, expect, it } from 'vitest'
import type { Device, Project } from './types'
import { messages } from '../../../shared/i18n/messages'
import { sampleProject } from './__fixtures__/sample'
import { CARD_PRESETS, ONBOARD, addCard, addPort, cardGroups, defaultCardName, nextPortId, nextPortLabel, removeCard, removePorts } from './cards'

let n = 0
const ids = () => () => `c${++n}`
const server = (over: Partial<Device> = {}): Device => ({
  id: 'srv',
  templateId: 'media-server',
  name: 'SRV-1',
  position: { x: 0, y: 0 },
  portSide: 'auto',
  ports: [
    { id: 'ETH1', label: 'eth0', connector: 'rj45' },
    { id: 'ETH2', label: 'eth1', connector: 'rj45' },
    { id: 'OUT1', label: 'OUT1', connector: 'hdmi' }
  ],
  portState: {},
  ...over
})

describe('cards', () => {
  it('cardGroups : « Intégré » d’abord, toujours présent, puis les cartes dans l’ordre', () => {
    const d = server({ cards: [{ id: 'g', name: 'GPU 1' }], ports: [...server().ports, { id: 'DP-1', label: 'DP 1', connector: 'displayport', cardId: 'g' }] })
    expect(cardGroups(d).map((g) => [g.cardId, g.name, g.ports.map((p) => p.id)])).toEqual([
      [ONBOARD, '', ['ETH1', 'ETH2', 'OUT1']],
      ['g', 'GPU 1', ['DP-1']]
    ])
    expect(cardGroups(server({ ports: [], onboardName: 'Carte mère' }))).toEqual([{ cardId: ONBOARD, name: 'Carte mère', ports: [] }])
  })

  it('les 6 préréglages', () => {
    expect(Object.keys(CARD_PRESETS)).toEqual(['gpu-dp', 'gpu-hdmi', 'capture-sdi', 'nic-rj45', 'nic-sfpp', 'empty'])
    expect(CARD_PRESETS['gpu-dp']).toEqual({ connector: 'displayport', count: 4, nameKey: 'gpu' })
    expect(CARD_PRESETS.empty).toEqual({ count: 0, nameKey: 'card' })
  })

  it('addCard(gpu-dp) deux fois : « GPU 1 », « GPU 2 », DP 1…DP 4 à ids uniques', () => {
    const m = messages('fr')
    let d = server()
    d = addCard(d, 'gpu-dp', defaultCardName(d, 'gpu-dp', m), ids())
    d = addCard(d, 'gpu-dp', defaultCardName(d, 'gpu-dp', m), ids())
    expect(d.cards!.map((c) => c.name)).toEqual(['GPU 1', 'GPU 2'])
    const g = cardGroups(d)
    expect(g[1]!.ports.map((p) => [p.id, p.label, p.connector])).toEqual([
      ['DP-1', 'DP 1', 'displayport'], ['DP-2', 'DP 2', 'displayport'], ['DP-3', 'DP 3', 'displayport'], ['DP-4', 'DP 4', 'displayport']
    ])
    expect(g[2]!.ports.map((p) => [p.id, p.label])).toEqual([['DP-1-2', 'DP 1'], ['DP-2-2', 'DP 2'], ['DP-3-2', 'DP 3'], ['DP-4-2', 'DP 4']])
    expect(new Set(d.ports.map((p) => p.id)).size).toBe(d.ports.length)
    expect(defaultCardName(d, 'nic-rj45', messages('en'))).toBe('NIC 1')
    expect(defaultCardName(d, 'nic-rj45', m)).toBe('Carte réseau 1')
  })

  it('nextPortLabel : eth{n} libre sur tout l’appareil ; wlan ; court + n dans la carte', () => {
    const d = server({ cards: [{ id: 'k', name: 'NIC' }] })
    expect(nextPortLabel(d, 'k', 'rj45')).toBe('eth2')
    expect(nextPortLabel(d, 'k', 'sfp+')).toBe('eth2')
    expect(nextPortLabel(d, 'k', 'wifi')).toBe('wlan0')
    expect(nextPortLabel(d, ONBOARD, 'usb')).toBe('USB 1')
    expect(nextPortLabel(d, ONBOARD, 'serial')).toBe('COM 1')
    expect(nextPortLabel(addPort(d, ONBOARD, 'usb'), ONBOARD, 'usb')).toBe('USB 2')
    expect(nextPortLabel(addPort(d, ONBOARD, 'usb'), 'k', 'usb')).toBe('USB 1')
  })

  it('nextPortId assainit et suffixe', () => {
    expect(nextPortId(server(), 'DP 1')).toBe('DP-1')
    expect(nextPortId(server({ ports: [{ id: 'DP-1', label: 'x', connector: 'displayport' }] }), 'DP 1')).toBe('DP-1-2')
    expect(nextPortId(server(), 'eth0')).toBe('eth0')
  })

  it('addPort ajoute un port dans la carte, sans cardId pour « Intégré »', () => {
    const d = addPort(server({ cards: [{ id: 'k', name: 'NIC' }] }), 'k', 'rj45')
    expect(d.ports.at(-1)).toEqual({ id: 'eth2', label: 'eth2', connector: 'rj45', cardId: 'k' })
    expect(addPort(server(), ONBOARD, 'displayport').ports.at(-1)).toEqual({ id: 'DP-1', label: 'DP 1', connector: 'displayport' })
  })

  it('removeCard sur une carte dont 2 ports sont câblés : 2 câbles débranchés, le reste intact', () => {
    const p: Project = sampleProject()
    const cam = p.devices[1]!
    cam.cards = [{ id: 'k', name: 'NIC' }, { id: 'z', name: 'Autre' }]
    cam.ports = [...cam.ports, { id: 'eth1', label: 'eth1', connector: 'rj45', cardId: 'k' }, { id: 'eth2', label: 'eth2', connector: 'rj45', cardId: 'k' }]
    cam.portState = { ...cam.portState, eth1: { ips: [{ address: '10.0.0.1', mode: 'static' }] }, eth2: { nativeVlan: 40 } }
    p.links.push(
      { id: 'l2', cableId: 'C-002', a: { deviceId: 'sw1', portId: '2' }, b: { deviceId: 'cam1', portId: 'eth1' }, medium: 'cat6' },
      { id: 'l3', cableId: 'C-003', a: { deviceId: 'cam1', portId: 'eth2' }, b: { deviceId: 'sw1', portId: '3' }, medium: 'cat6' }
    )
    p.vms = [{ id: 'vm', hostId: 'cam1', name: 'VM 1', vnics: [{ id: 'v', label: 'vnic0', bridgePortId: 'eth1', ips: [] }] }]
    const r = removeCard(p, 'cam1', 'k')
    expect(r.unplugged).toBe(2)
    const c = r.project.devices[1]!
    expect(c.cards).toEqual([{ id: 'z', name: 'Autre' }])
    expect(c.ports.map((x) => x.id)).toEqual(['ETH', 'HDMI'])
    expect(Object.keys(c.portState)).toEqual(['ETH'])
    expect(r.project.links.map((l) => l.id)).toEqual(['l1'])
    expect(r.project.vms![0]!.vnics[0]).toEqual({ id: 'v', label: 'vnic0', ips: [] })
  })

  it('removePorts sans câble : unplugged 0', () => {
    expect(removePorts(sampleProject(), 'cam1', ['HDMI']).unplugged).toBe(0)
  })
})
