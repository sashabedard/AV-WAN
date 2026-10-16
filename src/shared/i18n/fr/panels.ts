import { frPlural } from '../plural'

// Éléments communs aux panneaux : onglets de gauche, inspecteur multi-sélection, suggestions.
export const panels = {
  sidebarLabel: 'Panneau de gauche',
  tabDevices: 'Appareils',
  tabVlans: 'VLAN',
  multiSelected: (p: { n: number }) => `${p.n} élément${frPlural(p.n, '', 's')} sélectionné${frPlural(p.n, '', 's')}.`,
  suggestions: 'Suggestions'
} as const
