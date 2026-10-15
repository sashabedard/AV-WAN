import { describe, expect, it } from 'vitest'
import { parseProjectFile, serializeProject } from './file'
import { sampleProject } from './__fixtures__/sample'

describe('serializeProject / parseProjectFile', () => {
  it('fait un aller-retour fidèle, accents compris', () => {
    const p = sampleProject()
    p.devices[0]!.name = 'RÉGIE-Ç'
    const r = parseProjectFile(serializeProject(p))
    expect(r.ok && r.project).toEqual(p)
    expect(r.ok && r.readOnly).toBe(false)
  })

  it('refuse un JSON cassé avec un message en français', () => {
    const r = parseProjectFile('{ "schemaVersion": 1, ')
    expect(r).toEqual({ ok: false, error: 'Fichier illisible : ce n’est pas du JSON valide.' })
  })

  it('refuse un fichier qui n’est pas un projet', () => {
    const r = parseProjectFile('{"hello": "world"}')
    expect(r.ok).toBe(false)
  })

  it('indique le champ fautif quand la structure est invalide', () => {
    const p = sampleProject() as unknown as { vlans: Array<{ id: number }> }
    p.vlans[0]!.id = 0
    const r = parseProjectFile(JSON.stringify(p))
    expect(!r.ok && r.error).toContain('vlans.0.id')
  })

  it('ouvre en lecture seule un fichier de version plus récente', () => {
    const text = serializeProject(sampleProject()).replace('"schemaVersion": 3', '"schemaVersion": 4')
    const r = parseProjectFile(text)
    expect(r.ok && r.readOnly).toBe(true)
  })

  it('remonte les avertissements du nettoyage', () => {
    const p = sampleProject()
    p.links.push({ id: 'x', cableId: 'C-009', a: { deviceId: 'nope', portId: 'A' }, b: { deviceId: 'sw1', portId: '2' }, medium: 'cat6' })
    const r = parseProjectFile(serializeProject(p))
    expect(r.ok && r.warnings).toHaveLength(1)
  })

  it('explique un fichier invalide en français', () => {
    const res = parseProjectFile(JSON.stringify({ schemaVersion: 1, meta: { title: 3 } }))
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/^Fichier invalide : .*Entrée invalide/)
  })
})

describe('format v3 : listes de canaux DMX', () => {
  it('garde les listes de canaux DMX du fichier', () => {
    const p = { ...sampleProject(), dmxChannels: [{ templateId: 'dmx-fixture', model: 'Wash', mode: '9CH', params: ['Red', '', 'Blue'] }] }
    const r = parseProjectFile(serializeProject(p))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.project.dmxChannels).toEqual(p.dmxChannels)
  })

  it('un fichier version 2 s’ouvre en version 3, sans liste', () => {
    const text = serializeProject(sampleProject()).replace('"schemaVersion": 3', '"schemaVersion": 2')
    const r = parseProjectFile(text)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.project.schemaVersion).toBe(3)
      expect(r.migratedFrom).toBe(2)
      expect(r.project.dmxChannels).toBeUndefined()
    }
  })

  it('refuse un nom de canal de plus de 60 caractères', () => {
    const p = { ...sampleProject(), dmxChannels: [{ templateId: 'dmx-fixture', params: ['x'.repeat(61)] }] }
    expect(parseProjectFile(serializeProject(p)).ok).toBe(false)
  })
})
