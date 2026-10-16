import type { Link, PortRef, Project } from '../model/types'
import { sameRef } from '../model/rules'
import { linkPoe, linkVlanView, type LinkPoe, type LinkVlanView } from '../model/derive'
import { mediumLabel } from '../catalog/labels'
import { messages } from '../../../shared/i18n/messages'
import { DASH, compareText, lengthLabel, poeLabel, portRefLabel, taggedLabel, vlanName } from './format'

// Un câble vu depuis un de ses bouts. La liste de branchement et les fiches par appareil passent toutes
// deux par ici : elles ne peuvent pas se contredire (spec § 1, critère 2).
export interface Connection {
  linkId: string
  cableId: string
  from: PortRef
  to: PortRef
  fromLabel: string
  toLabel: string
  medium: string
  lengthM?: number
  lengthLabel: string
  poe: LinkPoe
  poeLabel: string
  vlan: LinkVlanView
  modeLabel: string
  nativeLabel: string
  taggedLabel: string
  note: string
}

export function connection(project: Project, link: Link, from: PortRef = link.a): Connection {
  const to = sameRef(from, link.a) ? link.b : link.a
  const vlan = linkVlanView(project, link)
  const poe = linkPoe(project, link)
  return {
    linkId: link.id,
    cableId: link.cableId,
    from,
    to,
    fromLabel: portRefLabel(project, from),
    toLabel: portRefLabel(project, to),
    medium: mediumLabel(link.medium, messages('fr')), // plan 6 : langue des documents à la Task 12
    ...(link.lengthM !== undefined ? { lengthM: link.lengthM } : {}),
    lengthLabel: lengthLabel(link.lengthM),
    poe,
    poeLabel: poeLabel(poe),
    vlan,
    modeLabel: vlan.kind === 'access' ? 'Accès' : vlan.kind === 'trunk' ? 'Trunk' : DASH,
    nativeLabel:
      vlan.kind === 'access' ? vlanName(project, vlan.vlan) : vlan.kind === 'trunk' && vlan.native !== undefined ? vlanName(project, vlan.native) : DASH,
    taggedLabel: vlan.kind === 'trunk' ? taggedLabel(vlan.tagged) : DASH,
    note: link.note ?? ''
  }
}

// Câbles triés par identifiant (C-002 avant C-010).
export function sortedLinks(project: Project): Link[] {
  return [...project.links].sort((a, b) => compareText(a.cableId, b.cableId))
}
