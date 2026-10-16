import type { Messages } from '../messages'
import { enPlural } from '../plural'

export const vlanPanel: Messages['vlanPanel'] = {
  listLabel: 'Project VLANs',
  devices: (p) => `${p.n} device${enPlural(p.n, '', 's')}`,
  empty: 'No VLANs in this project.',
  addLabel: 'Add a VLAN',
  add: 'Add',
  presetsLabel: 'VLANs to add',
  blank: 'Empty VLAN'
}
