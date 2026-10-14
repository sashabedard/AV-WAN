import type { Category } from '../model/types'

export const CATEGORY_ORDER: readonly Category[] = ['reseau', 'ordinateur', 'audio', 'video', 'eclairage', 'iot', 'capteur', 'autre']
export const CATEGORY_LABELS: Record<Category, string> = {
  reseau: 'Réseau',
  ordinateur: 'Ordinateurs',
  audio: 'Audio',
  video: 'Vidéo',
  eclairage: 'Éclairage',
  iot: 'IoT',
  capteur: 'Capteurs',
  autre: 'Autre'
}
