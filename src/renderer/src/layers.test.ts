// src/renderer/src/layers.test.ts
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

// Fichiers source d'un dossier (récursif), sans les tests ni les jeux de données de test.
function sources(dir: string): Array<{ file: string; text: string }> {
  const abs = join(root, dir)
  if (!existsSync(abs)) return []
  return readdirSync(abs, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.includes('__fixtures__'))
    .map((f) => ({ file: `${dir}/${f}`, text: readFileSync(join(abs, f), 'utf8') }))
}

// « import type … » disparaît à la compilation ; les autres imports existent à l'exécution.
function imports(text: string): Array<{ from: string; typeOnly: boolean }> {
  return [...text.matchAll(/^import\s+(type\s+)?[^'"]*?from\s+'([^']+)'/gm)].map((m) => ({ from: m[2]!, typeOnly: m[1] !== undefined }))
}

function offenders(dirs: string[], bad: (i: { from: string; typeOnly: boolean }) => boolean): string[] {
  return dirs.flatMap(sources).flatMap(({ file, text }) => imports(text).filter(bad).map((i) => `${file} → ${i.from}`))
}

const UI = /^(react|react-dom|zustand|electron)(\/|$)|^@xyflow\//

describe('couches du renderer', () => {
  it('model/, catalog/ et reports/ n’importent ni React, ni React Flow, ni zustand, ni Electron', () => {
    expect(offenders(['model', 'catalog', 'reports'], (i) => UI.test(i.from))).toEqual([])
  })

  // Seule exception : model/led, une feuille sans import à l’exécution (elle n’importe que des types) — aucun cycle possible.
  it('catalog/ n’utilise model/ que pour ses types (aucun cycle à l’exécution)', () => {
    expect(offenders(['catalog'], (i) => i.from.startsWith('../model/') && i.from !== '../model/led' && !i.typeOnly)).toEqual([])
  })

  it('reports/ ne dépend ni du store, ni du canvas, ni des panneaux, ni de l’app, ni de l’export', () => {
    expect(offenders(['reports'], (i) => /^\.\.\/(store|canvas|panels|app|export)\//.test(i.from))).toEqual([])
  })
})
