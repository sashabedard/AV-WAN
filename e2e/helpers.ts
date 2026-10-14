import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export async function launchApp(): Promise<{ app: ElectronApplication; page: Page }> {
  const userData = mkdtempSync(join(tmpdir(), 'avwan-e2e-'))
  const env = { ...process.env, AVWAN_E2E: '1', AVWAN_USER_DATA: userData } as Record<string, string>
  const app = await electron.launch({ args: ['.'], env })
  try {
    const page = await app.firstWindow()
    await page.waitForSelector('.react-flow__pane')
    return { app, page }
  } catch (e) {
    await app.close() // jamais d'app cachée qui reste en vie après un démarrage raté
    throw e
  }
}
