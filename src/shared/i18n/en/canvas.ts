import type { Messages } from '../messages'

export const canvas: Messages['canvas'] = {
  legend: {
    label: 'Legend',
    title: 'Color',
    modeLabel: 'Color mode',
    modes: { vlan: 'VLAN', type: 'Type', port: 'Port' },
    highlightVlan: (p) => `Highlight VLAN ${p.id}`,
    trunk: 'Trunk (rings = VLAN)',
    noVlan: 'No VLAN',
    portNote: 'Neutral cables, ports and labels always shown.'
  },
  mediumKinds: {
    copper: 'Copper',
    multimode: 'Multimode fiber',
    singlemode: 'Singlemode fiber',
    dac: 'DAC',
    wifi: 'Wi-Fi',
    simple: 'Simple links'
  },
  tile: {
    device: 'Device',
    ipUnset: 'IP not set',
    fixed: 'FIXED',
    dhcp: 'DHCP',
    poweredBy: (p) => `powered by ${p.label}`,
    deviceNameLabel: 'Device name',
    zoneNameLabel: 'Zone name',
    renameDevice: (p) => `${p.title} · double-click to rename`,
    renameZone: (p) => `${p.name} · drag to move the zone and its devices · double-click to rename`,
    portTitle: (p) => `Port ${p.label}`
  },
  cord: {
    elbowGrip: 'Drag to move the bend · double-click to re-center it'
  },
  connect: {
    noFreePort: (p) => `No free ${p.family} port on ${p.name}.`
  },
  view: {
    pin: 'Pin this view',
    pinWithKey: 'Pin this view (⇧⌘P)',
    minimap: 'Minimap',
    create: 'Create',
    templateGone: 'This device no longer exists in your library.'
  },
  pinned: {
    title: 'Pinned view',
    repinHint: 'Pin the current canvas view',
    repin: 'Reframe',
    remove: 'Remove the pinned view'
  }
}
