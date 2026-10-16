// Dictionnaire de référence (spec plan 6 § 3.1) : chaque zone a son fichier ; en/ doit avoir la même forme.
import { common } from './common'
import { menu } from './menu'
import { dialogs } from './dialogs'
import { errors } from './errors'
import { update } from './update'
import { topbar } from './topbar'
import { welcome } from './welcome'
import { app } from './app'
import { theme } from './theme'
import { canvas } from './canvas'

export const fr = { common, menu, dialogs, errors, update, topbar, welcome, app, theme, canvas } as const
