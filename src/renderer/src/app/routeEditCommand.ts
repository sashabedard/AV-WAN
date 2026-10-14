const NON_TEXT_INPUTS = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'])

export function isTextInput(el: Element | null): boolean {
  if (!el) return false
  if (el.tagName === 'TEXTAREA') return true
  if (el.tagName === 'INPUT') return !NON_TEXT_INPUTS.has((el as HTMLInputElement).type)
  return (el as HTMLElement).isContentEditable === true
}

export function routeUndoRedo(
  action: 'undo' | 'redo',
  active: Element | null,
  doc: { execCommand(command: string): boolean },
  store: { undo(): void; redo(): void }
): void {
  if (isTextInput(active)) doc.execCommand(action)
  else store[action]()
}
