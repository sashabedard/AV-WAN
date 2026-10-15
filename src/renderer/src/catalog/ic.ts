import type { IconRef } from '../model/types'
import type { BuiltinIconName } from './iconNames'

export const ic = (name: BuiltinIconName): IconRef => ({ kind: 'builtin', name })
