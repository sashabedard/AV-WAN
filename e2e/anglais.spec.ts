import { expect, test } from '@playwright/test'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launchApp } from './helpers'
import { readPdf } from './pdf'

test('bascule en anglais par le bouton FR | EN, puis exporte le projet exemple en PDF anglais', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'avwan-en-'))
  const { app, page } = await launchApp({ keepWelcome: true, env: { AVWAN_E2E_EXPORT_DIR: dir } })
  try {
    await page.getByRole('dialog', { name: 'Accueil' }).getByRole('button', { name: 'EN' }).click()
    const welcome = page.getByRole('dialog', { name: 'Welcome' })
    await expect(welcome).toBeVisible()
    // Le menu natif a été reconstruit en anglais.
    const labels = await app.evaluate(({ Menu }) => Menu.getApplicationMenu()?.items.map((i) => i.label) ?? [])
    expect(labels).toContain('File')
    await welcome.getByRole('button', { name: /Example project/ }).click()
    await expect(page.getByRole('button', { name: 'Export' })).toBeVisible()
    const path = await page.evaluate(() =>
      window.__avwan!.exportPdf({ sections: ['schema', 'branchement'], format: 'na', zonePages: true, lang: 'en' })
    )
    expect(path).toBe(join(dir, 'Interactive installation (example).pdf'))
    const { pages } = await readPdf(path!)
    expect(pages[0]!.text).toContain('Overview')
    expect(pages.some((p) => p.text.includes('Zone: Control room'))).toBe(true)
  } finally {
    await app.close()
  }
})

test('le choix de langue survit au redémarrage', async () => {
  const userData = mkdtempSync(join(tmpdir(), 'avwan-en-'))
  const first = await launchApp({ keepWelcome: true, userData })
  await first.page.getByRole('dialog', { name: 'Accueil' }).getByRole('button', { name: 'EN' }).click()
  await expect(first.page.getByRole('dialog', { name: 'Welcome' })).toBeVisible()
  await first.app.close()
  // launchApp réécrit settings.json avec lang 'fr' : on vérifie d'abord que le main a écrit le choix à la fermeture,
  // puis on relance en lui demandant 'en' pour vérifier la lecture.
  expect(JSON.parse(readFileSync(join(userData, 'settings.json'), 'utf8')).lang).toBe('en')
  const second = await launchApp({ keepWelcome: true, userData, lang: 'en' })
  try {
    await expect(second.page.getByRole('dialog', { name: 'Welcome' })).toBeVisible()
  } finally {
    await second.app.close()
  }
})
