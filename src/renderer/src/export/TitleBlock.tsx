import type { Project } from '../model/types'
import { DASH, STATUS_LABELS } from '../reports/format'

// Cartouche du schéma (spec § 8, direction B) : projet, cours, auteurs, révision, date et statut.
export function TitleBlock({ meta, subtitle }: { meta: Project['meta']; subtitle: string }) {
  return (
    <div className="tb">
      <div className="tb__brand">
        AV<span className="tb__dot">·</span>WAN
      </div>
      <div className="tb__title">{meta.title}</div>
      <div className="tb__sub">{subtitle}</div>
      <dl className="tb__grid">
        <dt>Cours</dt>
        <dd>{meta.course?.trim() || DASH}</dd>
        <dt>Auteurs</dt>
        <dd>{meta.authors.join(', ') || DASH}</dd>
        <dt>Révision</dt>
        <dd>{meta.revision}</dd>
        <dt>Date</dt>
        <dd>{meta.date}</dd>
        <dt>Statut</dt>
        <dd>{STATUS_LABELS[meta.status]}</dd>
      </dl>
    </div>
  )
}
