import { test } from '@playwright/test'
import { launchApp } from './helpers'

// Capture d'écran pour vérifier un rendu sans jamais montrer de fenêtre.
// npm run peek — options : AVWAN_PEEK_FILE (projet .avwan à ouvrir), AVWAN_PEEK_THEME (light | dark),
// AVWAN_PEEK_EXAMPLE=1 (projet exemple, à partir de la tâche 18), AVWAN_PEEK_OUT (chemin du PNG).
test('peek', async () => {
  test.skip(!process.env['AVWAN_PEEK'], 'capture à la demande seulement (npm run peek)')
  const { app, page } = await launchApp({ keepWelcome: process.env['AVWAN_PEEK_EXAMPLE'] === '1' })
  try {
    if (process.env['AVWAN_PEEK_EXAMPLE'] === '1') {
      await page.getByRole('dialog', { name: 'Accueil' }).getByRole('button', { name: /Projet exemple/ }).click()
    }
    const file = process.env['AVWAN_PEEK_FILE']
    if (file) await page.evaluate((p) => window.__avwan!.openPath(p), file)
    const theme = process.env['AVWAN_PEEK_THEME']
    if (theme === 'light' || theme === 'dark') {
      await page.evaluate((t) => {
        document.documentElement.dataset['theme'] = t
      }, theme)
    }
    // Sans await : fitView ne se résout pas sur un canvas vide (pas de nœud à cadrer).
    await page.evaluate(() => {
      void window.__avwan!.fitView()
    })
    await page.waitForTimeout(300)
    await page.screenshot({ path: process.env['AVWAN_PEEK_OUT'] ?? 'test-results/peek.png' })
  } finally {
    await app.close()
  }
})
