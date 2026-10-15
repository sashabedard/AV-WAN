// src/renderer/src/panels/CommitInput.tsx
import { useEffect, useRef, useState, type InputHTMLAttributes, type Ref } from 'react'

export interface CommitInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange'> {
  value: string
  onCommit: (value: string) => void
  onEnter?: () => void // après la validation par Entrée (passer au champ suivant)
  ref?: Ref<HTMLInputElement>
}

// Valide en quittant le champ (ou avec Entrée) : une seule entrée d'historique par modification.
// Le brouillon n'est affiché que pendant l'édition ; ensuite le champ montre toujours `value` (le projet).
// Un collage que l'appelant prend en charge (preventDefault) abandonne le brouillon, comme Échap : il écrit lui-même.
export function CommitInput({ value, onCommit, onEnter, onPaste, ref, ...rest }: CommitInputProps) {
  const [draft, setDraft] = useState(value)
  const [editing, setEditing] = useState(false)
  const cancelled = useRef(false)
  useEffect(() => setDraft(value), [value])
  return (
    <input
      {...rest}
      ref={ref}
      value={editing ? draft : value}
      onFocus={() => {
        setDraft(value)
        setEditing(true)
      }}
      onChange={(e) => {
        setDraft(e.target.value)
        setEditing(true)
      }}
      onBlur={() => {
        setEditing(false)
        if (cancelled.current) {
          cancelled.current = false
          return
        }
        if (draft !== value) onCommit(draft)
      }}
      onPaste={(e) => {
        onPaste?.(e)
        if (!e.defaultPrevented) return
        cancelled.current = true
        setDraft(value)
        e.currentTarget.blur()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur()
          onEnter?.()
        } else if (e.key === 'Escape') {
          cancelled.current = true
          setDraft(value)
          e.currentTarget.blur()
        }
      }}
    />
  )
}
