// src/renderer/src/panels/inspector/ChannelsSection.tsx
import { useRef } from 'react'
import type { Device, Project } from '../../model/types'
import { catalogParams, channelKey, fillParams, pastedNames, resolveChannels, sameParams, sharedCount, type ChannelKey } from '../../model/dmxChannels'
import { projectStore } from '../../store/projectStore'
import { dmxChannelsStore, useDmxChannelsStore } from '../../store/dmxChannelsStore'
import { ipcErrorMessage } from '../../app/ipcError'
import { currentMessages, useT } from '../../i18n/useT'
import { CommitInput } from '../CommitInput'

const SUGGESTIONS = [
  'Dimmer', 'Dimmer fine', 'Red', 'Green', 'Blue', 'White', 'Amber', 'Lime', 'Cyan', 'Magenta', 'Yellow', 'UV', 'CTO', 'Color wheel',
  'Strobe', 'Shutter', 'Pan', 'Pan fine', 'Tilt', 'Tilt fine', 'Pan/Tilt speed', 'Gobo', 'Gobo rotation', 'Prism', 'Focus', 'Zoom',
  'Iris', 'Frost', 'Control', 'Macro', 'Mode', 'Function'
]

// Projet d'abord (⌘Z), puis les réglages (tous les projets). En lecture seule, rien n'est écrit nulle part (false).
function writeList(key: ChannelKey, params: readonly string[]): boolean {
  const s = projectStore.getState()
  if (s.readOnly) {
    s.apply((p) => p) // affiche le message de lecture seule
    return false
  }
  s.setChannelList(key, params)
  dmxChannelsStore
    .getState()
    .save(key, params)
    .catch((e: unknown) => projectStore.getState().showToast(currentMessages().inspector.channels.notSavedForOthers({ error: ipcErrorMessage(e) })))
  return true
}

// Le projet reprend la liste du manuel (une étape annulable, le fichier devient modifié) ; les réglages oublient la leur.
function restoreManual(key: ChannelKey, manual: readonly string[]): void {
  const s = projectStore.getState()
  if (s.readOnly) {
    s.apply((p) => p)
    return
  }
  s.setChannelList(key, manual)
  dmxChannelsStore
    .getState()
    .remove(key)
    .catch((e: unknown) => projectStore.getState().showToast(currentMessages().inspector.channels.settingsNotChanged({ error: ipcErrorMessage(e) })))
}

// Bloc « Canaux » du patch DMX (spec canaux-dmx § 4) : une liste par modèle + mode, partagée par les appareils identiques.
export function ChannelsSection({ device, project }: { device: Device; project: Project }) {
  const { m } = useT()
  const t = m.inspector.channels
  const settings = useDmxChannelsStore((s) => s.lists)
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const key = channelKey(device)
  if (!key || !device.dmx) return null
  const footprint = device.dmx.footprint
  const params = resolveChannels(project, settings, key)?.params ?? []
  const catalog = catalogParams(project, key)
  const manual = catalog !== undefined && sameParams(params, catalog)
  const shared = sharedCount(project, key)
  const tail = [shared > 1 ? t.sharedBy({ n: shared }) : '', catalog === undefined ? '' : manual ? t.fromManual : t.edited].filter(Boolean).join(' · ')
  const commit = (i: number) => (text: string): void => {
    const next = [...params]
    while (next.length <= i) next.push('')
    next[i] = text
    writeList(key, next)
  }
  return (
    <details className="field chan">
      <summary className="chan__sum">{tail ? t.summaryWith({ footprint, tail }) : t.summary({ footprint })}</summary>
      <ol className="chan__list">
        {Array.from({ length: footprint }, (_, i) => (
          <li key={i} className="chan__row">
            <span className="chan__n">{i + 1}</span>
            <CommitInput
              ref={(el: HTMLInputElement | null) => {
                inputs.current[i] = el
              }}
              className="input"
              aria-label={t.channelAria({ n: i + 1 })}
              suggestions={SUGGESTIONS}
              maxLength={60}
              value={params[i] ?? ''}
              onCommit={commit(i)}
              onEnter={() => inputs.current[i + 1]?.focus()}
              onPaste={(e) => {
                const pasted = pastedNames(e.clipboardData.getData('text/plain'))
                if (!pasted) return
                e.preventDefault() // CommitInput abandonne le brouillon : le collage est une seule étape
                const { params: next, ignored } = fillParams(params, i, pasted, footprint)
                if (writeList(key, next) && ignored > 0) projectStore.getState().showToast(t.ignored({ n: ignored, footprint }))
              }}
            />
          </li>
        ))}
      </ol>
      {catalog !== undefined && !manual && (
        <button type="button" className="btn chan__reset" onClick={() => restoreManual(key, catalog)}>
          {t.restore}
        </button>
      )}
    </details>
  )
}
