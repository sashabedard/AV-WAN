import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export interface LaunchOptions {
  keepWelcome?: boolean // tâche 18 : garder l'écran d'accueil ouvert
  scale?: number // captures nettes (2 = Retina)
  env?: Record<string, string> // variables en plus (ex. AVWAN_E2E_EXPORT_DIR)
  autoSave?: boolean // enregistrement automatique dans le fichier (désactivé par défaut dans les tests)
  lang?: 'fr' | 'en' // langue de l'interface (français par défaut, pour ne pas dépendre du poste)
  userData?: string // réutiliser un dossier userData (relance après un arrêt brutal)
}

export async function launchApp(opts: LaunchOptions = {}): Promise<{ app: ElectronApplication; page: Page }> {
  const userData = opts.userData ?? mkdtempSync(join(tmpdir(), 'avwan-e2e-'))
  writeFileSync(join(userData, 'settings.json'), JSON.stringify({ autoSave: opts.autoSave ?? false, lang: opts.lang ?? 'fr' }))
  const env = { ...process.env, AVWAN_E2E: '1', AVWAN_USER_DATA: userData, AVWAN_E2E_DOCUMENTS_DIR: join(userData, 'Documents'), ...opts.env } as Record<string, string>
  // AVWAN_EXECUTABLE : l'app empaquetée (CI, ou release/mac-universal en local) au lieu du dossier du projet.
  const executablePath = process.env['AVWAN_EXECUTABLE']
  const scale = opts.scale ? [`--force-device-scale-factor=${opts.scale}`] : []
  const args = executablePath ? scale : ['.', ...scale]
  const app = await electron.launch({ ...(executablePath ? { executablePath } : {}), args, env })
  try {
    const page = await app.firstWindow()
    // Règle de santé : aucune fenêtre ne doit jamais apparaître à l'écran.
    const visible = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().some((w) => w.isVisible()))
    if (visible) throw new Error('Une fenêtre de test est visible : arrêt immédiat.')
    await page.waitForSelector('.react-flow__pane')
    if (!opts.keepWelcome) {
      const welcome = page.getByRole('dialog', { name: 'Accueil' })
      if (await welcome.isVisible()) await welcome.getByRole('button', { name: 'Nouveau projet' }).click()
    }
    return { app, page }
  } catch (e) {
    await app.close() // jamais d'app cachée qui reste en vie après un démarrage raté
    throw e
  }
}
