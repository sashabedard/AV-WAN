import { expect, test } from '@playwright/test'
import { copyFileSync, existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import ExcelJS from 'exceljs'
import { launchApp } from './helpers'
import { hasRasterImage, near, readPdf } from './pdf'

const exportDir = (): string => mkdtempSync(join(tmpdir(), 'avwan-export-'))

test('exporte le projet exemple en PDF vectoriel : schéma en Tabloïd, tableau en Lettre, cartouche', async () => {
  const dir = exportDir()
  const { app, page } = await launchApp({ keepWelcome: true, env: { AVWAN_E2E_EXPORT_DIR: dir } })
  try {
    await page.getByRole('dialog', { name: 'Accueil' }).getByRole('button', { name: /Projet exemple/ }).click()
    const path = await page.evaluate(() =>
      window.__avwan!.exportPdf({ sections: ['schema', 'appareils', 'ports', 'branchement', 'vlans', 'ip', 'patch', 'puissance', 'nomenclature'], format: 'na', zonePages: true, lang: 'fr' })
    )
    expect(path).toBe(join(dir, 'Installation interactive (exemple).pdf'))
    const { pages, bytes } = await readPdf(path!)
    expect(hasRasterImage(bytes)).toBe(false)
    // Schéma, puis les zones « Régie » et « Salle » (page séparée) en Tabloïd ; le reste en Lettre.
    for (const p of pages.slice(0, 3)) expect(near(p.width, 1224) && near(p.height, 792)).toBe(true)
    for (const p of pages.slice(3)) expect(near(p.width, 612) && near(p.height, 792)).toBe(true)
    expect(pages[0]!.text).toContain('SW-1')
    expect(pages[0]!.text).toContain('Installation interactive (exemple)')
    expect(pages[0]!.text).toContain('Trunk (bagues = VLAN)')
    // Pastilles dessinées par les cordons seuls (liens simples Pixels et DMX) : prouvent que les câbles sont imprimés.
    expect(pages[0]!.text).toContain('PIXELS')
    expect(pages[0]!.text).toContain('DMX')
    expect(pages[0]!.text).toMatch(new RegExp(`Page\\s*1\\s*/\\s*${pages.length}`))
    expect(pages[0]!.text).toContain('Vue d’ensemble')
    expect(pages[0]!.text).toContain('Détail p. 2')
    expect(pages[0]!.text).toContain('Détail p. 3')
    expect(pages[1]!.text).toContain('Zone : Régie')
    expect(pages[1]!.text).toContain('Salle p. 3')
    expect(pages[1]!.text).not.toContain('CAM-1')
    expect(pages[2]!.text).toContain('Zone : Salle')
    expect(pages[2]!.text).toContain('Régie p. 2')
    expect(pages[2]!.text).not.toContain('MAC-1')
    // Copie pour inspection manuelle, seulement si AVWAN_KEEP_PDF est défini.
    if (process.env.AVWAN_KEEP_PDF) copyFileSync(path!, process.env.AVWAN_KEEP_PDF)
    const rest = pages.slice(3).map((p) => p.text).join(' ')
    for (const expected of [
      'Fiches par appareil',
      'ETH › SW-2 · port 1',
      'Carte des ports',
      'PoE 123 / 150 W',
      'Liste de branchement',
      'C-018',
      'Fiches VLAN',
      'IGMP Snooping',
      'Plan d’adressage IP',
      '10.40.0.21',
      'Nomenclature',
      'Module SFP+ multimode'
    ]) {
      expect(rest, expected).toContain(expected)
    }
    // La fenêtre d'impression est détruite, et aucune fenêtre n'a jamais été visible.
    expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map((w) => w.isVisible()))).toEqual([false])
  } finally {
    await app.close()
  }
})

test('exporte un projet vide en A3 + A4 sans attendre', async () => {
  const dir = exportDir()
  const { app, page } = await launchApp({ env: { AVWAN_E2E_EXPORT_DIR: dir } })
  try {
    const path = await page.evaluate(() => window.__avwan!.exportPdf({ sections: ['schema', 'branchement'], format: 'iso', zonePages: true, lang: 'fr' }))
    const { pages } = await readPdf(path!)
    expect(pages).toHaveLength(2)
    expect(near(pages[0]!.width, 1191) && near(pages[0]!.height, 842)).toBe(true)
    expect(near(pages[1]!.width, 595) && near(pages[1]!.height, 842)).toBe(true)
    expect(pages[0]!.text).toContain('Aucun appareil sur le schéma.')
    expect(pages[1]!.text).toContain('Aucun câble dans le projet.')
  } finally {
    await app.close()
  }
})

test('exporte les cinq listes en CSV pour Excel, puis le classeur', async () => {
  const dir = exportDir()
  const { app, page } = await launchApp({ keepWelcome: true, env: { AVWAN_E2E_EXPORT_DIR: dir } })
  try {
    await page.getByRole('dialog', { name: 'Accueil' }).getByRole('button', { name: /Projet exemple/ }).click()
    const stem = join(dir, 'Installation interactive (exemple)')
    await page.evaluate(() => window.__avwan!.menu('exportCsv'))
    await expect.poll(() => existsSync(`${stem}-nomenclature.csv`)).toBe(true)
    const csv = readFileSync(`${stem}-branchement.csv`, 'utf8')
    expect(csv.startsWith('\ufeffCâble;De;Vers;Médium;Longueur (m);PoE;Mode;VLAN natif;VLAN étiquetés;Note\r\n')).toBe(true)
    expect(csv).toContain('\r\nC-010;CAM-1 · ETH;SW-2 · port 1;Cat6;12;PoE+ actif (25 W);Accès;40 NDI;—;\r\n')
    expect(existsSync(`${stem}-plan-ip.csv`)).toBe(true)
    expect(existsSync(`${stem}-patch-dmx.csv`)).toBe(true)
    expect(existsSync(`${stem}-bilan-puissance.csv`)).toBe(true)
    expect(readFileSync(`${stem}-patch-dmx.csv`, 'utf8')).toContain('\r\n2;17;32;16;MH-2;')
    await page.evaluate(() => window.__avwan!.menu('exportXlsx'))
    await expect.poll(() => existsSync(`${stem}.xlsx`)).toBe(true)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(`${stem}.xlsx`)
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Liste de branchement', 'Plan d’adressage IP', 'Patch DMX', 'Bilan de puissance', 'Nomenclature'])
  } finally {
    await app.close()
  }
})
