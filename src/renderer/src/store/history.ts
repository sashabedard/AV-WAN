export interface History<T> {
  past: T[]
  present: T
  future: T[]
}

export const HISTORY_LIMIT = 200

export function initHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] }
}

export function commit<T>(h: History<T>, next: T): History<T> {
  if (next === h.present) return h
  return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [] }
}

export function undo<T>(h: History<T>): History<T> {
  const prev = h.past[h.past.length - 1]
  if (h.past.length === 0) return h
  return { past: h.past.slice(0, -1), present: prev as T, future: [h.present, ...h.future] }
}

export function redo<T>(h: History<T>): History<T> {
  if (h.future.length === 0) return h
  const [next, ...rest] = h.future
  return { past: [...h.past, h.present], present: next as T, future: rest }
}

export const canUndo = <T,>(h: History<T>): boolean => h.past.length > 0
export const canRedo = <T,>(h: History<T>): boolean => h.future.length > 0
