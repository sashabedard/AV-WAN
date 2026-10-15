// src/renderer/src/panels/inspector/ChannelsSection.tsx
import { useRef } from 'react'
import type { Device, Project } from '../../model/types'
import { catalogParams, channelKey, fillParams, pastedNames, resolveChannels, sameParams, sharedCount, type ChannelKey } from '../../model/dmxChannels'
import { projectStore } from '../../store/projectStore'
import { dmxChannelsStore, useDmxChannelsStore } from '../../store/dmxChannelsStore'
import { ipcErrorMessage } from '../../app/ipcError'
import { CommitInput } from '../CommitInput'

const SUGGESTIONS = [
  'Dimmer', 'Dimmer fine', 'Red', 'Green', 'Blue', 'White', 'Amber', 'Lime', 'Cyan', 'Magenta', 'Yellow', 'UV', 'CTO', 'Color wheel',
  'Strobe', 'Shutter', 'Pan', 'Pan fine', 'Tilt', 'Tilt fine', 'Pan/Tilt speed', 'Gobo', 'Gobo rotation', 'Prism', 'Focus', 'Zoom',
  'Iris', 'Frost', 'Control', 'Macro', 'Mode', 'Function'
]
const LIST_ID = 'dmx-param-suggestions'

// Projet d'abord (⌘Z), puis les réglages (tous les projets). En lecture seule, rien n'est écrit nulle part.
function writeList(key: ChannelKey, params: readonly string[]): void {
  const s = projectStore.getState()
  if (s.readOnly) {
    s.apply((p) => p) // affiche le message de lecture seule
    return
  }
  s.setChannelList(key, params)
  dmxChannelsStore
    .getState()
    .save(key, params)
    .catch((e: unknown) => projectStore.getState().showToast(`Liste non retenue pour vos autres projets : ${ipcErrorMessage(e)}`))
}

function restoreManual(key: ChannelKey): void {
  const s = projectStore.getState()
  if (s.readOnly) {
    s.apply((p) => p)
    return
  }
  s.removeChannelList(key)
  dmxChannelsStore
    .getState()
    .remove(key)
    .catch((e: unknown) => projectStore.getState().showToast(`Réglages non modifiés : ${ipcErrorMessage(e)}`))
}

// Bloc « Canaux » du patch DMX (spec canaux-dmx § 4) : une liste par modèle + mode, partagée par les appareils identiques.
export function ChannelsSection({ device, project }: { device: Device; project: Project }) {
  const settings = useDmxChannelsStore((s) => s.lists)
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const key = channelKey(device)
  if (!key || !device.dmx) return null
  const footprint = device.dmx.footprint
  const params = resolveChannels(project, settings, key)?.params ?? []
  const catalog = catalogParams(project, key)
  const manual = catalog !== undefined && sameParams(params, catalog)
  const shared = sharedCount(project, key)
  const tail = [shared > 1 ? `partagés par ${shared} appareils` : '', catalog === undefined ? '' : manual ? 'd’après le manuel' : 'modifiée'].filter(Boolean).join(' · ')
  const commit = (i: number) => (text: string): void => {
    const next = [...params]
    while (next.length <= i) next.push('')
    next[i] = text
    writeList(key, next)
  }
  return (
    <details className="field chan">
      <summary className="chan__sum">{tail ? `Canaux · ${footprint} — ${tail}` : `Canaux · ${footprint}`}</summary>
      <datalist id={LIST_ID}>
        {SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <ol className="chan__list">
        {Array.from({ length: footprint }, (_, i) => (
          <li key={i} className="chan__row">
            <span className="chan__n">{i + 1}</span>
            <CommitInput
              ref={(el: HTMLInputElement | null) => {
                inputs.current[i] = el
              }}
              className="input"
              aria-label={`Canal ${i + 1}`}
              list={LIST_ID}
              maxLength={60}
              value={params[i] ?? ''}
              onCommit={commit(i)}
              onEnter={() => inputs.current[i + 1]?.focus()}
              onPaste={(e) => {
                const pasted = pastedNames(e.clipboardData.getData('text/plain'))
                if (!pasted) return
                e.preventDefault()
                e.currentTarget.blur()
                const { params: next, ignored } = fillParams(params, i, pasted, footprint)
                writeList(key, next)
                if (ignored > 0) projectStore.getState().showToast(`${ignored} ligne${ignored > 1 ? 's' : ''} ignorée${ignored > 1 ? 's' : ''} après le canal ${footprint}.`)
              }}
            />
          </li>
        ))}
      </ol>
      {catalog !== undefined && !manual && (
        <button type="button" className="btn chan__reset" onClick={() => restoreManual(key)}>
          Rétablir le manuel
        </button>
      )}
    </details>
  )
}
