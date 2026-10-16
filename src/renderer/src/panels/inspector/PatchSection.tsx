// src/renderer/src/panels/inspector/PatchSection.tsx
import type { Device, DmxPatch, Project } from '../../model/types'
import { DMX_SLOTS, UNIVERSE_MAX, issueTexts, nextFreeAddress, patchIndex, patchIssues, rangeLabel, sourceLabel } from '../../model/dmx'
import { parseIntField } from '../../model/fields'
import { getTemplate } from '../../catalog'
import { projectStore } from '../../store/projectStore'
import { CommitInput } from '../CommitInput'
import { useT } from '../../i18n/useT'
import { ChannelsSection } from './ChannelsSection'

type IntKey = 'address' | 'footprint' | 'universe'

// Sans clé vide : un fichier propre, et des comparaisons simples dans les tests.
function compactDmx(d: DmxPatch): DmxPatch {
  return {
    footprint: d.footprint,
    ...(d.address !== undefined ? { address: d.address } : {}),
    ...(d.universe !== undefined ? { universe: d.universe } : {}),
    ...(d.mode ? { mode: d.mode } : {})
  }
}

// Bloc « Patch DMX » d'un appareil patchable (spec patch-puissance-catalogue § 4.6).
export function PatchSection({ device, project }: { device: Device; project: Project }) {
  const { m } = useT()
  const t = m.inspector.patch
  const index = patchIndex(project) // mémorisé par projet
  const dmx = device.dmx
  if (!dmx) return null
  const s = projectStore.getState
  const resolved = index.entries.get(device.id)?.universe
  const modes = getTemplate(project, device.templateId)?.dmx?.modes
  const save = (patch: Partial<DmxPatch>): void => s().updateDevice(device.id, { dmx: compactDmx({ ...dmx, ...patch }) })
  const commitInt = (label: string, key: IntKey, min: number, max: number) => (text: string): void => {
    const n = parseIntField(text, min, max)
    if (n === undefined) {
      s().showToast(t.intToast({ label, min, max }))
      return
    }
    if (n === null) {
      if (key !== 'footprint') save({ [key]: undefined }) // les canaux ne s'effacent pas
      return
    }
    save({ [key]: n })
  }
  const fillNext = (): void => {
    if (!resolved) return
    const next = nextFreeAddress(index, resolved.universe, dmx.footprint, device.id)
    if (next === undefined) s().showToast(t.universeFull({ universe: resolved.universe, footprint: dmx.footprint }))
    else save({ address: next })
  }
  const derived = resolved?.source.kind === 'port' ? `${resolved.universe} · via ${sourceLabel(project, resolved.source)}` : '—'
  const warnings = issueTexts(patchIssues(index, device.id))
  return (
    <section className="insp__section">
      <h3 className="insp__title">{t.title}</h3>
      <div className="field">
        <span className="field__label">{t.address}</span>
        <div className="patch__row">
          <CommitInput className="input" aria-label={t.addressAria} inputMode="numeric" placeholder="—" value={dmx.address !== undefined ? String(dmx.address) : ''} onCommit={commitInt(t.addressAria, 'address', 1, DMX_SLOTS)} />
          <button type="button" className="btn" disabled={!resolved} title={resolved ? t.nextFreeTitle({ universe: resolved.universe }) : t.unknownUniverse} onClick={fillNext}>
            {t.nextFree}
          </button>
        </div>
      </div>
      <div className="field">
        <span className="field__label">{t.channels}</span>
        <div className="patch__row">
          <CommitInput className="input" aria-label={t.channelsAria} inputMode="numeric" value={String(dmx.footprint)} onCommit={commitInt(t.channelsAria, 'footprint', 1, DMX_SLOTS)} />
          {dmx.address !== undefined && <span className="patch__range">{rangeLabel(dmx.address, dmx.address + dmx.footprint - 1)}</span>}
        </div>
      </div>
      <label className="field">
        <span className="field__label">{t.universe}</span>
        <CommitInput className="input" aria-label={t.universeAria} inputMode="numeric" placeholder={derived} value={dmx.universe !== undefined ? String(dmx.universe) : ''} onCommit={commitInt(t.universeAria, 'universe', 0, UNIVERSE_MAX)} />
      </label>
      {modes ? (
        <label className="field">
          <span className="field__label">{t.mode}</span>
          <select
            className="input"
            aria-label={t.modeAria}
            value={dmx.mode ?? ''}
            onChange={(e) => {
              const picked = modes.find((x) => x.name === e.target.value)
              if (picked) save({ mode: picked.name, footprint: picked.channels })
            }}
          >
            {!modes.some((md) => md.name === dmx.mode) && <option value={dmx.mode ?? ''}>{dmx.mode || '—'}</option>}
            {modes.map((md) => (
              <option key={md.name} value={md.name}>{`${md.name} · ${md.channels} ch`}</option>
            ))}
          </select>
        </label>
      ) : (
        <label className="field">
          <span className="field__label">{t.mode}</span>
          <CommitInput className="input" aria-label={t.modeAria} placeholder="Standard 16 ch" value={dmx.mode ?? ''} onCommit={(v) => save({ mode: v.trim() || undefined })} />
        </label>
      )}
      <ChannelsSection device={device} project={project} />
      {warnings.map((w) => (
        <p key={w} className="insp__warn">
          {w}
        </p>
      ))}
    </section>
  )
}
