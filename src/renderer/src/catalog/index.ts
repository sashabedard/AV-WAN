import type { DeviceTemplate, Project } from '../model/types'
import { TEMPLATES_BY_ID } from './templates'

export function getTemplate(project: Pick<Project, 'templates'>, id: string): DeviceTemplate | undefined {
  return project.templates.find((t) => t.id === id) ?? TEMPLATES_BY_ID.get(id)
}
