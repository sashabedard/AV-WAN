import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// Plan 6 : dossiers et fichiers déjà traduits. Chaque tâche y ajoute les siens ; à la fin, tout `src`.
const CHECKED: readonly string[] = ['src/shared', 'src/main', 'src/preload', 'src/renderer/src/i18n', 'src/renderer/src/app', 'src/renderer/src/store', 'src/renderer/src/theme', 'src/renderer/src/canvas', 'src/renderer/src/panels', 'src/renderer/src/catalog', 'src/renderer/src/model', 'src/renderer/src/samples', 'src/renderer/src/reports', 'src/renderer/src/export/ExportDialog.tsx', 'src/renderer/src/export/exportActions.ts', 'src/renderer/src/export/docLang.ts', 'src/renderer/src/export/PrintApp.tsx']
// Parties d'un dossier vérifié pas encore traduites (chaque tâche retire la sienne).
const PENDING: readonly string[] = []

const ROOT = process.cwd()
const FRENCH_CHARS = /[éèêëàâùûüçîïôœÉÈÊËÀÂÙÛÜÇÎÏÔŒ’«»]/
const FRENCH_WORDS = /\b(le|la|les|des|du|une|aux|pour|avec|sans|dans|sur|est|sont|aucun|aucune|nouveau|nouvelle|ajouter|supprimer|exporter|annuler|fermer|ouvrir|enregistrer|choisir|glisser|rechercher|appareil|appareils|fichier|fichiers|projet|projets|liste|réglages|panneau|inspecteur|canaux|canal|illisible|illisibles|restaurer|ignorer|valider|modifier|renommer|dupliquer|copier|coller|couper|effacer|masquer|afficher|remplacer|importer|quitter|gauche|droite|couleur|taille|longueur|largeur|hauteur|puissance|adresse|dossier|tous|toutes|tout|rien|oui|sortie|univers|alimentation|bande|lyre|projecteur|recadrer|retirer|minicarte|cordon|cordons|coude|nom|fabricant|nombre|vide|connecteur|ressemble|statique|passerelle|sombre|titre|cours|suivante|libre|identifiant|gaine|secteur|courant|branche|inconnu|brassage|asservi|brume|fumee|carte)\b/i

const isSource = (f: string): boolean => /\.(ts|tsx)$/.test(f) && !/\.(test|spec)\.tsx?$/.test(f) && !f.endsWith('.d.ts') && !f.includes('/__fixtures__/')
// Les dictionnaires eux-mêmes ne sont pas des oublis (l'anglais peut contenir ’, la complétude est vérifiée ailleurs).
const isReference = (rel: string): boolean => rel.startsWith('src/shared/i18n/fr/') || rel.startsWith('src/shared/i18n/en/')

function filesUnder(rel: string): string[] {
  const abs = join(ROOT, rel)
  if (statSync(abs).isFile()) return [rel]
  return readdirSync(abs).flatMap((name) => filesUnder(join(rel, name)))
}

function leftovers(rel: string): string[] {
  const text = readFileSync(join(ROOT, rel), 'utf8')
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const lines = text.split('\n')
  const out: string[] = []
  const check = (node: ts.Node, value: string): void => {
    const v = value.trim()
    if (!v || !(FRENCH_CHARS.test(v) || FRENCH_WORDS.test(v))) return
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line
    if (/i18n-ignore/.test(lines[line] ?? '') || /i18n-ignore/.test(lines[line - 1] ?? '')) return
    out.push(`${rel}:${line + 1}  ${v.replace(/\s+/g, ' ').slice(0, 70)}`)
  }
  const visit = (node: ts.Node): void => {
    // Chemins d'import et types littéraux (identifiants) : pas des textes affichés.
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || ts.isLiteralTypeNode(node)) return
    // Valeurs d'un Localized ({ fr, en }) : ce sont les traductions elles-mêmes.
    if (ts.isPropertyAssignment(node) && ['fr', 'en'].includes(node.name.getText(sf))) return
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) check(node, node.text)
    else if (ts.isTemplateExpression(node)) check(node, [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(' '))
    else if (ts.isJsxText(node)) check(node, node.getText(sf))
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return out
}

describe('textes français restés en dur (plan 6)', () => {
  it('aucun dans les parties déjà traduites', () => {
    const files = CHECKED.flatMap(filesUnder)
      .map((f) => relative(ROOT, join(ROOT, f)))
      .filter((f) => isSource(f) && !isReference(f) && !PENDING.some((p) => f === p || f.startsWith(`${p}/`)))
    expect(files.flatMap(leftovers)).toEqual([])
  })
})
