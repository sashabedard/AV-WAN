import type { Project } from '../model/types'
import { DASH } from '../reports/format'
import { useT } from '../i18n/useT'

// Cartouche du schéma (spec § 8, direction B) : projet, cours, auteurs, révision, date et statut.
export function TitleBlock({ meta, subtitle }: { meta: Project['meta']; subtitle: string }) {
  const { pdf } = useT().m
  return (
    <div className="tb">
      <div className="tb__brand">
        AV<span className="tb__dot">·</span>WAN
      </div>
      <div className="tb__title">{meta.title}</div>
      <div className="tb__sub">{subtitle}</div>
      <dl className="tb__grid">
        <dt>{pdf.titleBlock.course}</dt>
        <dd>{meta.course?.trim() || DASH}</dd>
        <dt>{pdf.titleBlock.authors}</dt>
        <dd>{meta.authors.join(', ') || DASH}</dd>
        <dt>{pdf.titleBlock.revision}</dt>
        <dd>{meta.revision}</dd>
        <dt>{pdf.titleBlock.date}</dt>
        <dd>{meta.date}</dd>
        <dt>{pdf.titleBlock.status}</dt>
        <dd>{pdf.status[meta.status]}</dd>
      </dl>
    </div>
  )
}
