import type { DataTable } from '../../../shared/tables'
import { cellText } from '../reports/format'

export function ReportTable({ table }: { table: DataTable }) {
  return (
    <table className="rt">
      <thead>
        <tr>
          {table.columns.map((c) => (
            <th key={c.label} scope="col">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, i) => (
          <tr key={i}>
            {row.map((c, j) => (
              <td key={j} className={typeof c === 'number' ? 'rt__num' : undefined}>
                {cellText(c)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Une section « tableau » (Lettre ou A4 portrait) ; une phrase quand il est vide (décision 5).
export function TablePage({ table, empty }: { table: DataTable; empty: string }) {
  return (
    <section className="pg pg--sheet">
      <h2 className="pg__h">{table.title}</h2>
      {table.rows.length === 0 ? <p className="pg__empty">{empty}</p> : <ReportTable table={table} />}
    </section>
  )
}
