// src/renderer/src/reports/dataTables.ts
import type { Project } from '../model/types'
import type { DataTable } from '../../../shared/tables'
import { cableSchedule } from './cableSchedule'
import { ipPlan } from './ipPlan'
import { bom } from './bom'
import { patchTable } from './patch'

// Les listes exportées en CSV et en Excel (spec § 11.2 ; patch-puissance-catalogue § 6.2), dans cet ordre.
export function dataTables(project: Project): DataTable[] {
  return [cableSchedule(project), ipPlan(project), patchTable(project), bom(project)]
}
