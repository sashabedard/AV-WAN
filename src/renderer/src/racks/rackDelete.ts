export const DEVICE_MIME = 'application/x-avwan-device'

// Ce que Suppr fait dans la vue Baies : un appareil quitte sa baie (il reste dans le projet), un câble est supprimé, une baie est supprimée.
export function rackViewDelete(selection: { deviceIds: readonly string[]; linkIds: readonly string[]; rackIds?: readonly string[] }): {
  unplace: string[]
  removeLinks: string[]
  removeRacks: string[]
} {
  return { unplace: [...selection.deviceIds], removeLinks: [...selection.linkIds], removeRacks: [...(selection.rackIds ?? [])] }
}
