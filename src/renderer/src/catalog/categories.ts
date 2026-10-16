import type { Category } from '../model/types'
import type { Messages } from '../../../shared/i18n/messages'

export const CATEGORY_ORDER: readonly Category[] = ['reseau', 'ordinateur', 'audio', 'video', 'eclairage', 'iot', 'capteur', 'autre']

export function categoryLabel(id: Category, m: Messages): string {
  return m.catalog.categories[id]
}
