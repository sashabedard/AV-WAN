// src/renderer/src/model/clipboard.test.ts
import { describe, expect, it } from 'vitest'
import { copyFragment, nextCopyName, parseFragment, pasteFragment, serializeFragment } from './clipboard'
import { sampleProject } from './__fixtures__/sample'

const ids = (): (() => string) => {
  let n = 0
  return () => `n${++n}`
}

describe('copyFragment', () => {
  it('copie les appareils choisis et seulement les câbles entre eux', () => {
    const p = sampleProject()
    expect(copyFragment(p, ['cam1'])).toEqual({ devices: [p.devices[1]], links: [] })
    expect(copyFragment(p, ['sw1', 'cam1'])!.links.map((l) => l.id)).toEqual(['l1'])
    expect(copyFragment(p, [])).toBeNull()
  })
})

describe('nextCopyName', () => {
  it('prend le numéro libre suivant, ou ajoute -2', () => {
    const p = sampleProject()
    expect(nextCopyName(p, 'CAM-1')).toBe('CAM-2')
    expect(nextCopyName({ ...p, devices: [...p.devices, { ...p.devices[1]!, id: 'x', name: 'CAM-2' }] }, 'CAM-1')).toBe('CAM-3')
    expect(nextCopyName(p, 'Régie')).toBe('Régie-2')
  })
})

describe('pasteFragment', () => {
  it('colle avec de nouveaux identifiants, noms, câbles et une IP vidée', () => {
    const p = sampleProject()
    const f = copyFragment(p, ['sw1', 'cam1'])!
    const r = pasteFragment(p, f, { x: 24, y: 24 }, ids())
    expect(r.deviceIds).toEqual(['n1', 'n2'])
    expect(r.linkIds).toEqual(['n3'])
    const [sw, cam] = r.project.devices.slice(2)
    expect(sw).toMatchObject({ id: 'n1', name: 'SW-2', position: { x: 24, y: 24 }, portState: { '1': { mode: 'access', nativeVlan: 40 } } })
    expect(cam).toMatchObject({ id: 'n2', name: 'CAM-2', position: { x: 24, y: 224 }, ip: { address: '', mode: 'static' } })
    expect(r.project.links[1]).toMatchObject({ id: 'n3', cableId: 'C-002', a: { deviceId: 'n1', portId: '1' }, b: { deviceId: 'n2', portId: 'ETH' } })
  })

  it('n’emporte ni la zone ni le nom d’hôte', () => {
    const p = sampleProject()
    p.devices[1] = { ...p.devices[1]!, zoneId: 'z1', hostname: 'cam' }
    const [cam] = pasteFragment(p, copyFragment(p, ['cam1'])!, { x: 0, y: 0 }, ids()).project.devices.slice(2)
    expect(cam!.zoneId).toBeUndefined()
    expect(cam!.hostname).toBeUndefined()
  })
})

describe('parseFragment', () => {
  it('relit un fragment sérialisé et refuse tout le reste', () => {
    const p = sampleProject()
    const f = copyFragment(p, ['sw1', 'cam1'])!
    expect(parseFragment(serializeFragment(f))).toEqual(f)
    expect(parseFragment('{pas du json')).toBeNull()
    expect(parseFragment(JSON.stringify({ devices: [], links: [] }))).toBeNull()
    expect(parseFragment(JSON.stringify({ avwanFragment: 1, devices: 'non', links: [] }))).toBeNull()
  })
})
