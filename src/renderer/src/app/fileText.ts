import type { Project } from '../model/types'
import { serializeProject } from '../model/file'
import { pruneTemplates } from '../model/customTemplate'
import { embedUsedLists, pruneChannelLists } from '../model/dmxChannels'
import { dmxChannelsStore } from '../store/dmxChannelsStore'

// Texte enregistré (spec canaux-dmx § 3.7) : seulement les composantes et les listes qui servent, avec les
// listes des réglages embarquées pour que le fichier soit complet sur un autre ordi.
export function fileTextOf(project: Project): string {
  return serializeProject(pruneChannelLists(embedUsedLists(pruneTemplates(project), dmxChannelsStore.getState().lists)))
}

// Texte envoyé à la fenêtre d'impression cachée, qui ne lit pas les réglages.
export function printTextOf(project: Project): string {
  return serializeProject(embedUsedLists(project, dmxChannelsStore.getState().lists))
}
