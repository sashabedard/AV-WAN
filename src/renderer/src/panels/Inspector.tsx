// src/renderer/src/panels/Inspector.tsx
import type { Device, Link, Zone } from '../model/types'
import { useProject, useProjectStore } from '../store/projectStore'
import { DeviceForm } from './inspector/DeviceForm'
import { LinkForm } from './inspector/LinkForm'
import { ZoneForm } from './inspector/ZoneForm'
import { ProjectMetaForm } from './inspector/ProjectMetaForm'
import './panels.css'

export function Inspector() {
  const project = useProject()
  const selection = useProjectStore((s) => s.selection)
  // Une sélection peut pointer vers un élément supprimé (annulation) : on l'ignore.
  const devices = selection.deviceIds.map((id) => project.devices.find((d) => d.id === id)).filter((d): d is Device => d !== undefined)
  const links = selection.linkIds.map((id) => project.links.find((l) => l.id === id)).filter((l): l is Link => l !== undefined)
  const zones = (selection.zoneIds ?? []).map((id) => project.zones.find((z) => z.id === id)).filter((z): z is Zone => z !== undefined)
  const count = devices.length + links.length + zones.length
  const device = devices[0]
  const link = links[0]
  const zone = zones[0]
  return (
    <div className="inspector">
      {count === 0 && <ProjectMetaForm meta={project.meta} />}
      {count > 1 && <p className="insp__multi">{count} éléments sélectionnés.</p>}
      {count === 1 && device && <DeviceForm key={device.id} device={device} project={project} />}
      {count === 1 && zone && <ZoneForm key={zone.id} zone={zone} project={project} />}
      {count === 1 && link && <LinkForm key={link.id} link={link} project={project} />}
    </div>
  )
}
