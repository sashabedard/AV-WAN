import { frPlural } from '../plural'

// Vue de baie (plan 10).
export const racks = {
  viewLabel: 'Vue des baies',
  empty: 'Aucune baie pour l’instant. Ajoutez-en une, puis placez-y les appareils.',
  add: '+ Baie',
  addTitle: (p: { n: number }) => `Ajouter une baie de ${p.n}U`,
  units: (p: { n: number }) => `${p.n}U`,
  free: (p: { n: number }) => frPlural(p.n, `${p.n}U libre`, `${p.n}U libres`),
  unplacedTitle: 'Pas encore en baie',
  unplacedFilter: 'Filtrer…',
  unplacedEmpty: 'Tous les appareils sont en baie.',
  selectRack: (p: { name: string }) => `Sélectionner la baie ${p.name}`,
  // Bout de câble vers un appareil hors baie (spec § 8.5) : appareil · prise.
  stub: (p: { device: string; port: string }) => `→ ${p.device} · ${p.port}`
} as const
