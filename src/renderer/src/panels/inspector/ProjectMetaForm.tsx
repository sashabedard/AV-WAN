// src/renderer/src/panels/inspector/ProjectMetaForm.tsx
import type { Project } from '../../model/types'
import { projectStore } from '../../store/projectStore'
import { CommitInput } from '../CommitInput'
import { Segmented } from '../Segmented'
import { mainsVoltage } from '../../model/power'
import { useT } from '../../i18n/useT'

export function ProjectMetaForm({ project }: { project: Project }) {
  const meta = project.meta
  const s = projectStore.getState
  const { m } = useT()
  const t = m.inspector.meta
  return (
    <div>
      <h2 className="insp__title">{t.title}</h2>
      <label className="field">
        <span className="field__label">{t.titleLabel}</span>
        <CommitInput className="input" aria-label={t.titleAria} value={meta.title} onCommit={(v) => s().updateMeta({ title: v })} />
      </label>
      <label className="field">
        <span className="field__label">{t.course}</span>
        <CommitInput className="input" aria-label={t.course} value={meta.course ?? ''} onCommit={(v) => s().updateMeta({ course: v.trim() || undefined })} />
      </label>
      <label className="field">
        <span className="field__label">{t.authors}</span>
        <CommitInput
          className="input"
          aria-label={t.authorsAria}
          value={meta.authors.join(', ')}
          onCommit={(v) => s().updateMeta({ authors: v.split(',').map((x) => x.trim()).filter(Boolean) })}
        />
      </label>
      <label className="field">
        <span className="field__label">{t.revision}</span>
        <CommitInput className="input" aria-label={t.revision} value={meta.revision} onCommit={(v) => s().updateMeta({ revision: v.trim() || meta.revision })} />
      </label>
      <div className="field">
        <span className="field__label">{t.status}</span>
        <Segmented
          ariaLabel={t.status}
          options={[
            { value: 'conception', label: t.statusDesign },
            { value: 'tel-que-construit', label: t.statusAsBuilt }
          ]}
          value={meta.status}
          onChange={(status) => s().updateMeta({ status })}
        />
      </div>
      <div className="field">
        <span className="field__label">{t.mains}</span>
        <Segmented
          ariaLabel={t.mains}
          options={[
            { value: '120', label: '120 V' },
            { value: '230', label: '230 V' }
          ]}
          value={String(mainsVoltage(project))}
          onChange={(v) => s().setMainsVoltage(v === '230' ? 230 : 120)}
        />
      </div>
      <p className="insp__note">{t.hint}</p>
    </div>
  )
}
