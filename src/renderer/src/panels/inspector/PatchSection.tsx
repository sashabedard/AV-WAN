// src/renderer/src/panels/inspector/PatchSection.tsx
import type { Device, DmxPatch, Project } from '../../model/types'
import { DMX_SLOTS, UNIVERSE_MAX, issueTexts, nextFreeAddress, patchIndex, patchIssues, rangeLabel, sourceLabel } from '../../model/dmx'
import { parseIntField } from '../../model/fields'
import { chainOf } from '../../model/daisyChain'
import { getTemplate } from '../../catalog'
import { modeLabel } from '../../catalog/modeLabels'
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
    ...(d.addressPinned === true ? { addressPinned: true as const } : {}),
    ...(d.universe !== undefined ? { universe: d.universe } : {}),
    ...(d.mode ? { mode: d.mode } : {})
  }
}

function LockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" fill="currentColor">
      <rect x="1.5" y="4.5" width="7" height="4.5" rx="1" />
      <path d="M3 4.5V3a2 2 0 0 1 4 0v1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

// Bloc « Patch DMX » d'un appareil patchable (spec patch-puissance-catalogue § 4.6).
export function PatchSection({ device, project }: { device: Device; project: Project }) {
  const { m, lang } = useT()
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
      if (key === 'address') save({ address: undefined, addressPinned: undefined }) // plus d'adresse tapée : la chaîne reprend la main
      else if (key !== 'footprint') save({ [key]: undefined }) // les canaux ne s'effacent pas
      return
    }
    save(key === 'address' ? { address: n, addressPinned: true } : { [key]: n }) // une adresse tapée est fixée
  }
  const fillNext = (): void => {
    if (!resolved) return
    const next = nextFreeAddress(index, resolved.universe, dmx.footprint, device.id)
    if (next === undefined) s().showToast(t.universeFull({ universe: resolved.universe, footprint: dmx.footprint }))
    else save({ address: next })
  }
  const chained = chainOf(project, device.id) !== undefined
  const pinned = dmx.addressPinned === true
  const togglePin = (): void => {
    if (pinned) save({ addressPinned: undefined })
    else if (dmx.address !== undefined) save({ addressPinned: true }) // fixer l'adresse actuelle
  }
  const derived = resolved?.source.kind === 'port' ? `${resolved.universe} · via ${sourceLabel(project, resolved.source, m)}` : '—'
  const warnings = issueTexts(patchIssues(index, device.id), m)
  if (chained && !pinned && dmx.address === undefined && resolved) warnings.push(t.chainFull({ universe: resolved.universe }))
  return (
    <section className="insp__section">
      <h3 className="insp__title">{t.title}</h3>
      <div className="field">
        <span className="field__label">{t.address}</span>
        <div className="patch__row">
          <CommitInput className="input" aria-label={t.addressAria} inputMode="numeric" placeholder="—" value={dmx.address !== undefined ? String(dmx.address) : ''} onCommit={commitInt(t.addressAria, 'address', 1, DMX_SLOTS)} />
          {chained && (
            <button type="button" className="patch__pin" aria-pressed={pinned} disabled={!pinned && dmx.address === undefined} title={pinned ? t.unpinTitle : t.pinTitle} onClick={togglePin}>
              {pinned ? <><LockIcon />{t.pinned}</> : t.auto}
            </button>
          )}
          {(!chained || pinned) && <button type="button" className="btn" disabled={!resolved} title={resolved ? t.nextFreeTitle({ universe: resolved.universe }) : t.unknownUniverse} onClick={fillNext}>
            {t.nextFree}
          </button>}
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
            {!modes.some((md) => md.name === dmx.mode) && <option value={dmx.mode ?? ''}>{dmx.mode ? modeLabel(dmx.mode, lang) : '—'}</option>}
            {modes.map((md) => (
              <option key={md.name} value={md.name}>{`${modeLabel(md.name, lang)} · ${md.channels} ch`}</option>
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
