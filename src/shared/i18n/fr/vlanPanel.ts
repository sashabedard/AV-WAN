import { frPlural } from '../plural'

// Panneau VLAN (panneau de gauche).
export const vlanPanel = {
  listLabel: 'VLAN du projet',
  devices: (p: { n: number }) => `${p.n} appareil${frPlural(p.n, '', 's')}`,
  empty: 'Aucun VLAN dans ce projet.',
  addLabel: 'Ajouter un VLAN',
  add: 'Ajouter',
  presetsLabel: 'VLAN à ajouter',
  blank: 'VLAN vide'
} as const
