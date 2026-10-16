import type { Messages } from '../messages'
import { enPlural } from '../plural'

export const panels: Messages['panels'] = {
  sidebarLabel: 'Left panel',
  tabDevices: 'Devices',
  tabVlans: 'VLAN',
  multiSelected: (p) => `${p.n} item${enPlural(p.n, '', 's')} selected.`,
  suggestions: 'Suggestions'
}
