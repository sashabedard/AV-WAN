// src/renderer/src/panels/inspector/ProjectMetaForm.tsx
import type { Project } from '../../model/types'
import { projectStore } from '../../store/projectStore'
import { CommitInput } from '../CommitInput'
import { Segmented } from '../Segmented'
import { mainsVoltage } from '../../model/power'

export function ProjectMetaForm({ project }: { project: Project }) {
  const meta = project.meta
  const s = projectStore.getState
  return (
    <div>
      <h2 className="insp__title">Projet</h2>
      <label className="field">
        <span className="field__label">Titre</span>
        <CommitInput className="input" aria-label="Titre du projet" value={meta.title} onCommit={(v) => s().updateMeta({ title: v })} />
      </label>
      <label className="field">
        <span className="field__label">Cours</span>
        <CommitInput className="input" aria-label="Cours" value={meta.course ?? ''} onCommit={(v) => s().updateMeta({ course: v.trim() || undefined })} />
      </label>
      <label className="field">
        <span className="field__label">Auteurs (séparés par des virgules)</span>
        <CommitInput
          className="input"
          aria-label="Auteurs"
          value={meta.authors.join(', ')}
          onCommit={(v) => s().updateMeta({ authors: v.split(',').map((x) => x.trim()).filter(Boolean) })}
        />
      </label>
      <label className="field">
        <span className="field__label">Révision</span>
        <CommitInput className="input" aria-label="Révision" value={meta.revision} onCommit={(v) => s().updateMeta({ revision: v.trim() || meta.revision })} />
      </label>
      <div className="field">
        <span className="field__label">Statut</span>
        <Segmented
          ariaLabel="Statut"
          options={[
            { value: 'conception', label: 'Conception' },
            { value: 'tel-que-construit', label: 'Tel que construit' }
          ]}
          value={meta.status}
          onChange={(status) => s().updateMeta({ status })}
        />
      </div>
      <div className="field">
        <span className="field__label">Tension secteur</span>
        <Segmented
          ariaLabel="Tension secteur"
          options={[
            { value: '120', label: '120 V' },
            { value: '230', label: '230 V' }
          ]}
          value={String(mainsVoltage(project))}
          onChange={(v) => s().setMainsVoltage(v === '230' ? 230 : 120)}
        />
      </div>
      <p className="insp__note">Sélectionnez un appareil ou un câble pour le modifier.</p>
    </div>
  )
}
