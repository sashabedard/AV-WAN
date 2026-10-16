// src/renderer/src/reports/dataTables.ts
import type { Project } from '../model/types'
import type { DataTable } from '../../../shared/tables'
import type { Lang } from '../../../shared/i18n/lang'
import { cableSchedule } from './cableSchedule'
import { ipPlan } from './ipPlan'
import { bom } from './bom'
import { patchTable } from './patch'
import { powerTable } from './powerBudget'

// Les listes exportées en CSV et en Excel (spec § 11.2 ; patch-puissance-catalogue § 6.2), dans cet ordre, dans la langue des documents.
export function dataTables(project: Project, lang: Lang): DataTable[] {
  return [cableSchedule(project, lang), ipPlan(project, lang), patchTable(project, lang), powerTable(project, lang), bom(project, lang)]
}
