import { loc } from '../../../shared/i18n/localized'
import type { Lang } from '../../../shared/i18n/lang'
import type { DeviceTemplate, StoredTemplate, TemplateText } from '../model/types'

// Texte d'un gabarit dans la langue demandée : le catalogue est bilingue, une composante perso garde ce que la personne a saisi.
export function templateText(v: TemplateText, lang: Lang): string {
  return typeof v === 'string' ? v : loc(v, lang)
}

export function displayName(t: Pick<DeviceTemplate, 'name'>, lang: Lang): string {
  return templateText(t.name, lang)
}

export const templateName = displayName

// Une composante perso (nom saisi, étiquettes en chaîne) peut être enregistrée dans le projet et la bibliothèque.
export function isStored(t: DeviceTemplate): t is StoredTemplate {
  return t.isCustom === true && typeof t.name === 'string'
}
