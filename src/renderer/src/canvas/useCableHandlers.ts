import { useCallback, useMemo, type MouseEvent as ReactMouseEvent } from 'react'
import type { Connection, FinalConnectionState } from '@xyflow/react'
import { projectStore } from '../store/projectStore'
import { uiStore } from '../store/uiStore'
import { currentMessages } from '../i18n/useT'
import type { CordFlowEdge } from './toFlow'
import { clientPoint, connectionRefs, dropOnDevice, dropReconnectOnDevice, dropUnplugs, makeIsValidConnection, nodeIdAt, overPaneAt, reconnectEnd } from './connect'

// Gestes de câble partagés par le schéma et la vue Baies : brancher, rebrancher, débrancher dans le vide.
export function useCableHandlers() {
  const isValidConnection = useMemo(
    () =>
      makeIsValidConnection(
        () => projectStore.getState().history.present,
        () => uiStore.getState().reconnectingLinkId,
        () => uiStore.getState().pointerOverPinned
      ),
    []
  )
  const onReconnectStart = useCallback((_e: ReactMouseEvent, edge: CordFlowEdge) => uiStore.getState().setReconnecting(edge.id), [])
  const onReconnect = useCallback((oldEdge: CordFlowEdge, c: Connection) => {
    const s = projectStore.getState()
    const link = s.history.present.links.find((l) => l.id === oldEdge.id)
    const move = link ? reconnectEnd(link, c) : null
    if (move) s.reconnect(oldEdge.id, move.end, move.to)
  }, [])
  const onReconnectEnd = useCallback(() => uiStore.getState().setReconnecting(null), [])
  const onConnect = useCallback((c: Connection) => {
    const refs = connectionRefs(c)
    if (refs) projectStore.getState().connect(refs[0], refs[1])
  }, [])
  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
    if (state.isValid || !state.fromNode || !state.fromHandle?.id) return
    const point = clientPoint(event)
    if (!point) return
    const targetId = nodeIdAt(document, point)
    const s = projectStore.getState()
    // onConnectEnd part avant onReconnectEnd : l'identifiant du câble est encore là.
    const reconnecting = uiStore.getState().reconnectingLinkId
    if (reconnecting && dropUnplugs(reconnecting, targetId, overPaneAt(document, point), uiStore.getState().pointerOverPinned)) {
      s.removeElements([], [reconnecting])
      const undo = window.avwan?.platform === 'darwin' ? '⌘Z' : 'Ctrl+Z'
      s.showToast(currentMessages().app.toast.cableUnplugged({ undo }))
      return
    }
    if (!targetId) return
    const from = { deviceId: state.fromNode.id, portId: state.fromHandle.id }
    if (reconnecting) {
      const r = dropReconnectOnDevice(s.history.present, reconnecting, from, targetId)
      if (r.ok) s.reconnect(reconnecting, r.end, r.to)
      else if (r.message) s.showToast(r.message)
      return
    }
    const res = dropOnDevice(s.history.present, from, targetId)
    if (res.ok) s.connect(from, res.to)
    else if (res.message) s.showToast(res.message)
  }, [])
  return { isValidConnection, onReconnectStart, onReconnect, onReconnectEnd, onConnect, onConnectEnd }
}
