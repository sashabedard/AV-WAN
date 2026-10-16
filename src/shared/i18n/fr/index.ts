// Dictionnaire de référence (spec plan 6 § 3.1) : chaque zone a son fichier ; en/ doit avoir la même forme.
import { common } from './common'
import { menu } from './menu'
import { dialogs } from './dialogs'
import { errors } from './errors'
import { update } from './update'

export const fr = { common, menu, dialogs, errors, update } as const
