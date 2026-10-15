import type { Project } from '../types'

export function sampleProject(): Project {
  return {
    schemaVersion: 2,
    meta: { title: 'Installation Lumen', authors: ['É. Tremblay'], date: '2026-10-13', revision: 'A', status: 'conception' },
    settings: { colorMode: 'vlan', pageFormat: 'na', cableIdPrefix: 'C-', snapToGrid: true },
    vlans: [
      {
        id: 40,
        name: 'NDI',
        short: 'NDI',
        color: { dark: '#3E8EF7', light: '#2563C9' },
        subnet: '10.40.0.0/23',
        internet: false,
        unifi: {
          igmpSnooping: true,
          querier: true,
          forwardUnknownMulticast: 'router-ports',
          floodKnownProtocols: true,
          fastLeave: true,
          mdnsProxy: 'off',
          networkIsolation: true,
          jumboFrames: false
        }
      }
    ],
    devices: [
      {
        id: 'sw1',
        templateId: 'switch',
        name: 'SW-1',
        position: { x: 0, y: 0 },
        portSide: 'auto',
        switch: { portCount: 4, poe: 'at', poeBudgetW: 60, sfpPlus: 0, managed: true },
        ports: ['1', '2', '3', '4'].map((id) => ({
          id,
          label: id,
          connector: 'rj45' as const,
          speedMbps: 1000,
          poeOut: 'at' as const,
          row: 'bottom' as const
        })),
        portState: { '1': { mode: 'access', nativeVlan: 40 } }
      },
      {
        id: 'cam1',
        templateId: 'ptz-ndi',
        name: 'CAM-1',
        position: { x: 0, y: 200 },
        portSide: 'auto',
        ports: [
          { id: 'ETH', label: 'ETH', connector: 'rj45', speedMbps: 1000, poeIn: 'at', poeDrawW: 25 },
          { id: 'HDMI', label: 'HDMI', connector: 'hdmi' }
        ],
        portState: {},
        ip: { address: '10.40.0.21', mode: 'static' }
      }
    ],
    links: [
      { id: 'l1', cableId: 'C-001', a: { deviceId: 'sw1', portId: '1' }, b: { deviceId: 'cam1', portId: 'ETH' }, medium: 'cat6', lengthM: 12 }
    ],
    zones: [],
    templates: []
  }
}
