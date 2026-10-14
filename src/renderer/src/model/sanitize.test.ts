import { describe, expect, it } from 'vitest'
import { sanitizeProject } from './sanitize'
import { sampleProject } from './__fixtures__/sample'

describe('sanitizeProject', () => {
  it('renvoie le même objet sans avertissement si tout est sain', () => {
    const p = sampleProject()
    const r = sanitizeProject(p)
    expect(r.project).toBe(p)
    expect(r.warnings).toEqual([])
  })

  it('retire les câbles orphelins, en double ou sur un port déjà pris', () => {
    const p = sampleProject()
    p.links.push({ ...p.links[0]!, id: 'l2', cableId: 'C-002' }) // même ports que l1
    p.links.push({ id: 'l3', cableId: 'C-003', a: { deviceId: 'fantome', portId: 'ETH' }, b: { deviceId: 'sw1', portId: '2' }, medium: 'cat6' })
    p.links.push({ ...p.links[0]!, cableId: 'C-004' }) // même id que l1
    const r = sanitizeProject(p)
    expect(r.project.links.map((l) => l.id)).toEqual(['l1'])
    expect(r.warnings).toHaveLength(3)
    expect(r.warnings.join(' ')).toContain('C-003')
  })

  it('retire un appareil en double', () => {
    const p = sampleProject()
    p.devices.push({ ...p.devices[1]! })
    const r = sanitizeProject(p)
    expect(r.project.devices).toHaveLength(2)
    expect(r.warnings[0]).toContain('CAM-1')
  })
})
