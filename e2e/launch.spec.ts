import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { launchApp } from './helpers'

// Démarrage de l'app (CI : l'app empaquetée, signée et notarisée). Ne dépend pas de la taille de l'écran,
// contrairement à smoke.spec.ts qui clique à des positions précises du canvas.
test('l’app démarre, affiche le canvas et répond', async () => {
  const version = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version
  const { app, page } = await launchApp()
  try {
    await expect(page.locator('.react-flow__pane')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Mes composantes' })).toBeVisible()
    expect(await app.evaluate(({ app }) => app.getVersion())).toBe(version)
    const project = await page.evaluate(() => window.__avwan!.getProject())
    expect(project.schemaVersion).toBe(4)
    expect(project.vlans.length).toBeGreaterThan(0)
  } finally {
    await app.close()
  }
})
