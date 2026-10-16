import type { Lang } from '../../../shared/i18n/lang'

// Noms de modes DMX en français dans le catalogue : ce sont des clés (listes de canaux), seul l'affichage change.
// Les modes déjà en anglais (16CH, Direct, Vector…) n'y figurent pas.
const EN: Readonly<Record<string, string>> = {
  'Étendu (EXT)': 'Extended (EXT)', // i18n-ignore : clé de liste DMX
  '1 canal': '1 channel', // i18n-ignore : clé de liste DMX
  '3 canaux': '3 channels', // i18n-ignore : clé de liste DMX
  '4 canaux': '4 channels', // i18n-ignore : clé de liste DMX
  '5 canaux': '5 channels', // i18n-ignore : clé de liste DMX
  'Pompe et ventilateur': 'Pump and fan', // i18n-ignore : clé de liste DMX
  'Mode 1 – Standard 16 bits': 'Mode 1 – Standard 16-bit', // i18n-ignore : clé de liste DMX
  'Mode 2 – Réduit 8 bits': 'Mode 2 – Reduced 8-bit' // i18n-ignore : clé de liste DMX
}

// Nom de mode à afficher. La clé enregistrée ne change jamais ; un nom inconnu (tapé, ou déjà anglais) est rendu tel quel.
export function modeLabel(mode: string, lang: Lang): string {
  return lang === 'en' ? (EN[mode] ?? mode) : mode
}
