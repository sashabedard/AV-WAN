import type { Messages } from '../messages'

export const racks: Messages['racks'] = {
  viewLabel: 'Rack view',
  empty: 'No racks yet. Add one, then place devices in it.',
  add: '+ Rack',
  addTitle: (p) => `Add a ${p.n}U rack`,
  units: (p) => `${p.n}U`,
  free: (p) => `${p.n}U free`,
  selectRack: (p) => `Select rack ${p.name}`,
  stub: (p) => `→ ${p.device} · ${p.port}`
}
