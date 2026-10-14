// Fichiers .avwan à ouvrir : double-clic (macOS : open-file), argv (Windows), 2e instance.
// Sans Electron à l'exécution : testable sous Vitest.

export function pathsFromArgv(argv: readonly string[]): string[] {
  const out: string[] = []
  for (const arg of argv) {
    if (arg.startsWith('-') || !arg.toLowerCase().endsWith('.avwan')) continue
    if (!out.includes(arg)) out.push(arg)
  }
  return out
}

export interface OpenQueue {
  push(path: string): void
  ready(): void
  reset(): void
  pending(): readonly string[]
}

// Les chemins attendent que l'interface ait signalé qu'elle est prête (elle peut ne pas exister encore).
export function createOpenQueue(deliver: (path: string) => void): OpenQueue {
  let isReady = false
  let queue: string[] = []
  return {
    push(path) {
      if (isReady) deliver(path)
      else if (!queue.includes(path)) queue.push(path)
    },
    ready() {
      isReady = true
      const waiting = queue
      queue = []
      for (const path of waiting) deliver(path)
    },
    reset() {
      isReady = false
    },
    pending: () => queue
  }
}
