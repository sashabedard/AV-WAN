import { TEMPLATES } from '../catalog/templates'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../catalog/categories'
import { uiStore, useUiStore } from '../store/uiStore'
import './panels.css'

export const TEMPLATE_MIME = 'application/x-avwan-template'

const GROUPS = CATEGORY_ORDER.map((category) => ({ category, items: TEMPLATES.filter((t) => t.category === category) }))

export function Palette() {
  const pending = useUiStore((s) => s.pendingTemplateId)
  return (
    <nav className="palette" aria-label="Palette d’appareils">
      {GROUPS.map((g) => (
        <section key={g.category}>
          <h2 className="palette__cat">{CATEGORY_LABELS[g.category]}</h2>
          <ul>
            {g.items.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  draggable
                  data-testid={`palette-${t.id}`}
                  className={`palette__item${pending === t.id ? ' is-pending' : ''}`}
                  title="Glisser sur le canvas, ou cliquer puis cliquer sur le canvas"
                  onDragStart={(e) => {
                    e.dataTransfer.setData(TEMPLATE_MIME, t.id)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  onClick={() => uiStore.getState().setPendingTemplate(pending === t.id ? null : t.id)}
                >
                  <span className="palette__code">{t.code}</span>
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  )
}
