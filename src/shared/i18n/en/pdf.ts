import type { Messages } from '../messages'
import { enPlural } from '../plural'

export const pdf: Messages['pdf'] = {
  overview: 'Overview',
  zoneTitle: (p) => `Zone: ${p.name}`,
  detailPage: (p) => `Detail p. ${p.page}`,
  emptyDiagram: 'No devices on the diagram.',
  field: (p) => `${p.label}: ${p.value}`,
  fields: { ip: 'IP', hostname: 'Hostname', zone: 'Zone' },
  footer: { revision: 'Rev.', page: 'Page' },
  status: { conception: 'Design', 'tel-que-construit': 'As-built' },
  titleBlock: { course: 'Course', authors: 'Authors', revision: 'Revision', date: 'Date', status: 'Status' },
  legend: {
    label: 'Legend',
    colorVlan: 'Color: VLAN',
    colorType: 'Color: cable type',
    colorPort: 'Color: ports',
    trunk: 'Trunk (rings = VLAN)',
    noVlan: 'No VLAN',
    portNote: 'Neutral cables; the port is shown at both ends.',
    strokes: 'Line styles',
    copper: 'Copper',
    fiber: 'Fiber',
    dac: 'DAC',
    wifi: 'Wi-Fi',
    simple: 'Simple links',
    poe: 'Active PoE'
  },
  rack: {
    title: (p) => `Elevation · ${p.name}${p.zone ? ` · ${p.zone}` : ''} · ${p.heightU}U`,
    tooMany: 'Too many cables for this scale — see the cable schedule.'
  },
  empty: {
    cabling: 'No cables in the project.',
    ip: 'No IP addresses in the project.',
    bom: 'Empty project: nothing to order.',
    devices: 'No non-switch devices in the project.',
    noCable: 'No cables connected.',
    patch: 'No patchable devices in the project.',
    channels: 'No named channels. Channels are named in the inspector, DMX Patch section.',
    switches: 'No switches in the project.',
    vlans: 'No VLANs in the project.',
    power: 'No power ratings entered in the project.'
  },
  headings: {
    devices: 'Device sheets',
    channels: 'DMX channels',
    portMaps: 'Port map',
    vlans: 'VLAN sheets',
    psus: 'Power supplies'
  },
  portMap: {
    title: (p) => `Port map · ${p.name}`,
    facadeAria: (p) => `${p.name} front panel`,
    key: 'Color = native VLAN · thick outline = trunk · bolt = active PoE',
    port: 'Port',
    connectedTo: 'Connected to'
  },
  vlanMembers: (p) => `Members (${p.count}): ${p.list} · ${p.cables} cable${enPlural(p.cables, '', 's')}`,
  power: {
    total: (p) => `Total: ${p.watts} W · ${p.amps} A at ${p.voltage} V`,
    missing: (p) => `${p.n} device${enPlural(p.n, '', 's')} without a power rating: ${p.list}${p.more > 0 ? ` and ${p.more} more` : ''}`,
    note: 'Power factor assumed to be 1. Power supplies counted at their rated output; PoE devices counted under their switch.',
    percent: (p) => `${p.n}%`
  }
}
