// src/renderer/src/canvas/InlineName.tsx
import { useEffect, useRef, useState, type CSSProperties } from 'react'

export interface InlineNameProps {
  value: string
  label: string
  onCommit: (value: string) => void
  onDone: () => void
  className?: string
  style?: CSSProperties
}

// Champ de renommage posé sur l'étiquette : Entrée ou clic ailleurs valide, Échap annule.
// nodrag/nopan : React Flow ne déplace ni le nœud ni le canvas pendant la saisie.
export function InlineName({ value, label, onCommit, onDone, className, style }: InlineNameProps) {
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  const cancelled = useRef(false)
  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])
  return (
    <input
      ref={ref}
      className={`inline-name nodrag nopan${className ? ` ${className}` : ''}`}
      aria-label={label}
      value={draft}
      style={style}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const v = draft.trim()
        if (!cancelled.current && v && v !== value) onCommit(v)
        onDone()
      }}
      onKeyDown={(e) => {
        e.stopPropagation() // Retour arrière ne doit pas supprimer le nœud sélectionné
        if (e.key === 'Enter') e.currentTarget.blur()
        else if (e.key === 'Escape') {
          cancelled.current = true
          e.currentTarget.blur()
        }
      }}
      onDoubleClick={(e) => e.stopPropagation()}
    />
  )
}
