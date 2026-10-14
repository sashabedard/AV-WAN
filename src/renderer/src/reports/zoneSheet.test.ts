import { describe, expect, it } from 'vitest'
import { createExampleProject } from '../samples/exampleProject'
import { pageLabel, zonePageNumbers, zoneSheet } from './zoneSheet'

const project = createExampleProject(new Date('2026-01-01'))
const zone = (name: string) => project.zones.find((z) => z.name === name)!
const name = (id: string) => project.devices.find((d) => d.id === id)!.name

describe('zonePageNumbers', () => {
  it('numérote les zones à page propre à partir de la p. 2', () => {
    const pages = zonePageNumbers(project, true)
    expect(pages.get(zone('Régie').id)).toBe(2)
    expect(pages.get(zone('Salle').id)).toBe(3)
    expect(pages.has(zone('Scène').id)).toBe(false)
  })
  it('est vide sans pages de zone', () => {
    expect(zonePageNumbers(project, false).size).toBe(0)
  })
})

describe('pageLabel', () => {
  it('nomme la zone et sa page, ou renvoie à la p. 1', () => {
    const pages = zonePageNumbers(project, true)
    expect(pageLabel(zone('Salle'), pages)).toBe('Salle p. 3')
    expect(pageLabel(zone('Scène'), pages)).toBe('Scène p. 1')
    expect(pageLabel(undefined, pages)).toBe('p. 1')
  })
})

describe('zoneSheet', () => {
  const pages = zonePageNumbers(project, true)
  const regie = zoneSheet(project, zone('Régie'), pages)

  it('ne garde que les appareils de la zone', () => {
    const names = [...regie.deviceIds].map(name)
    expect(names).toContain('SW-1')
    expect(names).not.toContain('CAM-1')
    for (const id of regie.deviceIds) expect(project.devices.find((d) => d.id === id)!.zoneId).toBe(zone('Régie').id)
  })

  it('renvoie vers la Salle (p. 3) et la Scène (p. 1) pour les câbles qui sortent', () => {
    const labels = regie.renvois.map((r) => r.label)
    expect(labels.some((l) => l.startsWith('C-002 › SW-2 · ') && l.endsWith('Salle p. 3'))).toBe(true)
    expect(labels.some((l) => l.includes('PIX-1') && l.endsWith('Scène p. 1'))).toBe(true)
    expect(labels.some((l) => l.includes('DMX-1') && l.endsWith('Scène p. 1'))).toBe(true)
    for (const r of regie.renvois) expect(regie.deviceIds.has(r.deviceId)).toBe(true)
  })

  it('un câble interne n’est pas un renvoi', () => {
    expect(regie.linkIds.has('ex-l1')).toBe(true)
    expect(regie.renvois.some((r) => r.linkId === 'ex-l1')).toBe(false)
    expect(regie.renvois.some((r) => r.linkId === 'ex-l2')).toBe(true)
    expect(regie.linkIds.has('ex-l2')).toBe(false)
  })

  it('sans pages de zone, tout renvoie à la p. 1', () => {
    const none = zonePageNumbers(project, false)
    const sheet = zoneSheet(project, zone('Régie'), none)
    expect(none.size).toBe(0)
    expect(sheet.renvois.map((r) => r.label).some((l) => l.endsWith('Salle p. 1'))).toBe(true)
  })

  it('un lien dont l’autre bout n’est dans aucune zone renvoie à « p. 1 » seul', () => {
    const lonely = { ...project, devices: project.devices.map((d) => (d.id === 'ex-pix' ? { ...d, zoneId: undefined } : d)) }
    const sheet = zoneSheet(lonely, zone('Régie'), pages)
    expect(sheet.renvois.some((r) => r.label.includes('PIX-1') && r.label.endsWith(' · p. 1'))).toBe(true)
  })

  it('un lien Wi-Fi qui sort de la zone est un renvoi comme un câble', () => {
    const wifi = project.links.find((l) => l.medium === 'wifi')!
    const moved = { ...project, devices: project.devices.map((d) => (d.id === wifi.a.deviceId ? { ...d, zoneId: zone('Scène').id } : d)) }
    const sheet = zoneSheet(moved, zone('Salle'), pages)
    expect(sheet.linkIds.has(wifi.id)).toBe(false)
    expect(sheet.renvois.find((r) => r.linkId === wifi.id)?.label).toMatch(/Scène p\. 1$/)
  })
})
