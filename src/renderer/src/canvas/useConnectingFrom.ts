import { useCallback, useMemo } from 'react'
import { useConnection } from '@xyflow/react'
import { useProjectStore } from '../store/projectStore'
import { useUiStore } from '../store/uiStore'
import { canConnectPorts, canReconnect, sameRef } from '../model/rules'
import type { PortRef } from '../model/types'

const SEP = '\u0000'

export function useConnectingFrom(): PortRef | null {
  const key = useConnection((c) => (c.inProgress && c.fromHandle.id ? `${c.fromNode.id}${SEP}${c.fromHandle.id}` : null))
  return useMemo(() => {
    if (!key) return null
    const [deviceId, portId] = key.split(SEP)
    return deviceId && portId ? { deviceId, portId } : null
  }, [key])
}

export type PortCompat = 'compatible' | 'dim' | 'origin' | null

// Pendant un branchement, indique pour chaque port s'il peut recevoir le câble.
export function usePortCompatibility(deviceId: string): (portId: string) => PortCompat {
  const from = useConnectingFrom()
  const reconnecting = useUiStore((s) => s.reconnectingLinkId)
  const project = useProjectStore((s) => (from ? s.history.present : null))
  return useCallback(
    (portId: string): PortCompat => {
      if (!from || !project) return null
      const me = { deviceId, portId }
      if (sameRef(from, me)) return 'origin'
      if (reconnecting) {
        // Pendant un rebranchement, `from` est le bout qui reste en place.
        const link = project.links.find((l) => l.id === reconnecting)
        if (!link) return 'dim'
        const moving = sameRef(link.a, from) ? 'b' : 'a'
        return canReconnect(project, reconnecting, moving, me) ? 'compatible' : 'dim'
      }
      return canConnectPorts(project, from, me) ? 'compatible' : 'dim'
    },
    [from, project, deviceId, reconnecting]
  )
}
