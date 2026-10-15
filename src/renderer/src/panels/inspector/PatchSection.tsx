// src/renderer/src/panels/inspector/PatchSection.tsx
import type { Device, DmxPatch, Project } from '../../model/types'
import { DMX_SLOTS, UNIVERSE_MAX, issueTexts, nextFreeAddress, patchIndex, patchIssues, rangeLabel, sourceLabel } from '../../model/dmx'
import { parseIntField } from '../../model/fields'
import { getTemplate } from '../../catalog'
import { projectStore } from '../../store/projectStore'
import { CommitInput } from '../CommitInput'

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
      s().showToast(`${label} : un nombre entier de ${min} à ${max}.`)
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
    if (next === undefined) s().showToast(`Univers ${resolved.universe} plein : aucune plage libre de ${dmx.footprint} canaux.`)
    else save({ address: next })
  }
  const derived = resolved?.source.kind === 'port' ? `${resolved.universe} · via ${sourceLabel(project, resolved.source)}` : '—'
  const warnings = issueTexts(patchIssues(index, device.id))
  return (
    <section className="insp__section">
      <h3 className="insp__title">Patch DMX</h3>
      <div className="field">
        <span className="field__label">Adresse</span>
        <div className="patch__row">
          <CommitInput className="input" aria-label="Adresse DMX" inputMode="numeric" placeholder="—" value={dmx.address !== undefined ? String(dmx.address) : ''} onCommit={commitInt('Adresse DMX', 'address', 1, DMX_SLOTS)} />
          <button type="button" className="btn" disabled={!resolved} title={resolved ? `Première plage libre de l’univers ${resolved.universe}` : 'Univers inconnu'} onClick={fillNext}>
            Suivante libre
          </button>
        </div>
      </div>
      <div className="field">
        <span className="field__label">Canaux</span>
        <div className="patch__row">
          <CommitInput className="input" aria-label="Canaux DMX" inputMode="numeric" value={String(dmx.footprint)} onCommit={commitInt('Canaux DMX', 'footprint', 1, DMX_SLOTS)} />
          {dmx.address !== undefined && <span className="patch__range">{rangeLabel(dmx.address, dmx.address + dmx.footprint - 1)}</span>}
        </div>
      </div>
      <label className="field">
        <span className="field__label">Univers</span>
        <CommitInput className="input" aria-label="Univers DMX" inputMode="numeric" placeholder={derived} value={dmx.universe !== undefined ? String(dmx.universe) : ''} onCommit={commitInt('Univers DMX', 'universe', 0, UNIVERSE_MAX)} />
      </label>
      {modes ? (
        <label className="field">
          <span className="field__label">Mode</span>
          <select
            className="input"
            aria-label="Mode DMX"
            value={dmx.mode ?? ''}
            onChange={(e) => {
              const m = modes.find((x) => x.name === e.target.value)
              if (m) save({ mode: m.name, footprint: m.channels })
            }}
          >
            {!modes.some((m) => m.name === dmx.mode) && <option value={dmx.mode ?? ''}>{dmx.mode || '—'}</option>}
            {modes.map((m) => (
              <option key={m.name} value={m.name}>{`${m.name} · ${m.channels} ch`}</option>
            ))}
          </select>
        </label>
      ) : (
        <label className="field">
          <span className="field__label">Mode</span>
          <CommitInput className="input" aria-label="Mode DMX" placeholder="Standard 16 ch" value={dmx.mode ?? ''} onCommit={(v) => save({ mode: v.trim() || undefined })} />
        </label>
      )}
      {warnings.map((w) => (
        <p key={w} className="insp__warn">
          {w}
        </p>
      ))}
    </section>
  )
}
