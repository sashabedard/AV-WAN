// src/renderer/src/panels/CommitInput.tsx
import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type Ref } from 'react'
import { createPortal } from 'react-dom'

export interface CommitInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange'> {
  value: string
  onCommit: (value: string) => void
  onEnter?: () => void // après la validation par Entrée (passer au champ suivant)
  suggestions?: readonly string[] // liste maison : le menu natif d'un <datalist> ne défile pas dans Electron
  ref?: Ref<HTMLInputElement>
}

const MENU_MAX = 240
const MENU_GAP = 8

type MenuAt = { left: number; minWidth: number; top?: number; bottom?: number; maxHeight: number }

// Sous le champ, ou au-dessus s'il y a plus de place (bas de fenêtre) ; hauteur bornée, le reste défile.
function menuAt(el: HTMLElement): MenuAt {
  const r = el.getBoundingClientRect()
  const below = window.innerHeight - r.bottom - MENU_GAP
  const above = r.top - MENU_GAP
  if (below >= Math.min(MENU_MAX, above)) return { left: r.left, minWidth: r.width, top: r.bottom + 2, maxHeight: Math.min(MENU_MAX, below) }
  return { left: r.left, minWidth: r.width, bottom: window.innerHeight - r.top + 2, maxHeight: Math.min(MENU_MAX, above) }
}

// Celles qui contiennent le texte tapé ; rien à proposer si le champ vaut déjà la seule correspondance.
function matches(suggestions: readonly string[], text: string): readonly string[] {
  const q = text.trim().toLowerCase()
  if (!q) return suggestions
  const found = suggestions.filter((s) => s.toLowerCase().includes(q))
  return found.length === 1 && found[0] === text.trim() ? [] : found
}

// Valide en quittant le champ (ou avec Entrée) : une seule entrée d'historique par modification.
// Le brouillon n'est affiché que pendant l'édition ; ensuite le champ montre toujours `value` (le projet).
// Un collage que l'appelant prend en charge (preventDefault) abandonne le brouillon, comme Échap : il écrit lui-même.
// Choisir une suggestion (clic, ou flèches + Entrée) la valide aussitôt, en une étape.
export function CommitInput({ value, onCommit, onEnter, onPaste, suggestions, ref, ...rest }: CommitInputProps) {
  const [draft, setDraft] = useState(value)
  const [editing, setEditing] = useState(false)
  const [menu, setMenu] = useState<MenuAt | null>(null)
  const [active, setActive] = useState(-1)
  const cancelled = useRef(false) // le blur qui suit ne valide pas le brouillon
  const field = useRef<HTMLInputElement | null>(null)
  const list = useRef<HTMLUListElement | null>(null)
  const listId = useId()
  useEffect(() => setDraft(value), [value])
  const options = suggestions && menu ? matches(suggestions, editing ? draft : value) : []
  const shown = options.length > 0
  const open = (el: HTMLInputElement): void => {
    if (!suggestions) return
    setMenu(menuAt(el))
    setActive(-1)
  }
  const choose = (s: string): void => {
    cancelled.current = true
    setDraft(s)
    if (s !== value) onCommit(s)
    field.current?.blur()
  }
  // Le menu est en position fixe : il suit son champ quand le panneau défile (le focus peut faire défiler juste après l'ouverture).
  const isOpen = menu !== null
  useEffect(() => {
    if (!isOpen) return
    const follow = (e: Event): void => {
      if (field.current && !list.current?.contains(e.target as Node)) setMenu(menuAt(field.current))
    }
    window.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    return () => {
      window.removeEventListener('scroll', follow, true)
      window.removeEventListener('resize', follow)
    }
  }, [isOpen])
  useEffect(() => {
    if (active >= 0) list.current?.children[active]?.scrollIntoView?.({ block: 'nearest' })
  }, [active])
  return (
    <>
      <input
        {...rest}
        ref={ref}
        value={editing ? draft : value}
        role={suggestions ? 'combobox' : undefined}
        aria-autocomplete={suggestions ? 'list' : undefined}
        aria-expanded={suggestions ? shown : undefined}
        aria-controls={shown ? listId : undefined}
        aria-activedescendant={shown && active >= 0 ? `${listId}-${active}` : undefined}
        onMouseDown={(e) => {
          rest.onMouseDown?.(e)
          open(e.currentTarget)
        }}
        onFocus={(e) => {
          field.current = e.currentTarget
          setDraft(value)
          setEditing(true)
        }}
        onChange={(e) => {
          setDraft(e.target.value)
          setEditing(true)
          open(e.currentTarget)
        }}
        onBlur={() => {
          setEditing(false)
          setMenu(null)
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
          if (e.key === 'ArrowDown' && suggestions) {
            e.preventDefault()
            if (!menu) open(e.currentTarget)
            else setActive((a) => Math.min(a + 1, options.length - 1))
          } else if (e.key === 'ArrowUp' && shown) {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter') {
            const pick = shown ? options[active] : undefined
            if (pick !== undefined) choose(pick)
            else e.currentTarget.blur()
            onEnter?.()
          } else if (e.key === 'Escape' && shown) {
            e.preventDefault()
            e.stopPropagation()
            setMenu(null) // ferme le menu seulement ; un second Échap abandonne le brouillon
          } else if (e.key === 'Escape') {
            cancelled.current = true
            setDraft(value)
            e.currentTarget.blur()
          }
        }}
      />
      {shown &&
        menu &&
        createPortal(
          <ul
            ref={list}
            id={listId}
            className="suggest"
            role="listbox"
            aria-label="Suggestions"
            style={{ left: menu.left, minWidth: menu.minWidth, top: menu.top, bottom: menu.bottom, maxHeight: menu.maxHeight }}
          >
            {options.map((s, i) => (
              <li
                key={s}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={`suggest__item${i === active ? ' is-active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault() // garde le focus dans le champ jusqu'au choix
                  choose(s)
                }}
              >
                {s}
              </li>
            ))}
          </ul>,
          document.body
        )}
    </>
  )
}
