import { describe, expect, it } from 'vitest'
import { ConnectorSchema, DeviceTemplateSchema } from './schema'
import { TEMPLATES, TEMPLATES_BY_ID } from '../catalog/templates'
import { POE_CHOICE_IDS, connectorLabel } from '../catalog/labels'
import { messages } from '../../../shared/i18n/messages'
import { sampleProject } from './__fixtures__/sample'
import {
  CUSTOM_ID,
  MAX_PORTS,
  addPortBatch,
  blankDraft,
  draftFrom,
  duplicateTemplate,
  newCustomId,
  normalizeCode,
  portIdFromLabel,
  projectOnlyTemplates,
  pruneTemplates,
  templateFromDraft,
  validateDraft,
  withTemplate,
  type TemplateDraft
} from './customTemplate'

const lidar = (): TemplateDraft => ({
  ...blankDraft(),
  name: 'Capteur LiDAR',
  code: 'LID',
  category: 'capteur',
  ports: [
    { label: 'ETH', connector: 'rj45', poe: 'in-af' },
    { label: 'USB 1', connector: 'usb', poe: 'none' }
  ]
})

describe('brouillon', () => {
  it('part d’un appareil vide ou d’un gabarit intégré', () => {
    expect(blankDraft()).toEqual({ name: '', code: '', category: 'autre', vendor: '', model: '', icon: { kind: 'builtin', name: 'generic' }, ports: [], patchable: false, footprint: '1', powerW: '' })
    const avio = draftFrom(TEMPLATES_BY_ID.get('dante-avio')!)
    expect(avio).toMatchObject({ name: 'Adaptateur Dante AVIO', code: 'DNT', category: 'audio', icon: { kind: 'builtin', name: 'dante' } })
    expect(avio.ports).toEqual([{ label: 'ETH', connector: 'rj45', poe: 'in-af' }])
  })
})

describe('ports', () => {
  it('ajoute des ports en lot, numérotés à la suite, 64 au plus', () => {
    let ports = addPortBatch([], 'rj45', 4)
    expect(ports.map((p) => p.label)).toEqual(['ETH1', 'ETH2', 'ETH3', 'ETH4'])
    ports = addPortBatch(ports, 'usb', 1)
    ports = addPortBatch(ports, 'rj45', 2)
    expect(ports.map((p) => p.label)).toEqual(['ETH1', 'ETH2', 'ETH3', 'ETH4', 'USB1', 'ETH5', 'ETH6'])
    expect(ports.every((p) => p.poe === 'none')).toBe(true)
    expect(addPortBatch(ports, 'sfp+', 100)).toHaveLength(MAX_PORTS)
    expect(addPortBatch(ports, 'hdmi', 0)).toHaveLength(7)
  })

  it('tire du nom un identifiant de port sûr et unique', () => {
    expect(portIdFromLabel('ETH 1', new Set())).toBe('ETH-1')
    expect(portIdFromLabel('ETH 1', new Set(['ETH-1']))).toBe('ETH-1-2')
    expect(portIdFromLabel('Entrée DMX', new Set())).toBe('Entree-DMX')
    expect(portIdFromLabel('SFP+1', new Set())).toBe('SFP+1')
    expect(portIdFromLabel('  ', new Set())).toBe('P')
  })

  it('chaque connecteur et chaque choix PoE a un libellé', () => {
    for (const c of ConnectorSchema.options) expect(connectorLabel(c, messages('fr'))).toBeTruthy()
    expect([...POE_CHOICE_IDS]).toEqual(['none', 'in-af', 'in-at', 'in-bt', 'out-af', 'out-at', 'out-bt'])
  })
})

describe('validation', () => {
  it('exige un nom, un code de 1 à 4 caractères et des ports nommés', () => {
    expect(validateDraft(lidar())).toEqual({})
    expect(validateDraft({ ...lidar(), name: '  ' }).name).toBe('Donnez un nom à la composante.')
    expect(validateDraft({ ...lidar(), name: 'x'.repeat(61) }).name).toBe('60 caractères au plus.')
    expect(validateDraft({ ...lidar(), code: '' }).code).toBe('De 1 à 4 lettres ou chiffres.')
    expect(validateDraft({ ...lidar(), ports: [{ label: ' ', connector: 'rj45', poe: 'none' }] }).ports).toBe('Chaque port a besoin d’un nom.')
    const tooMany = [...addPortBatch([], 'rj45', 64), { label: 'X', connector: 'usb' as const, poe: 'none' as const }]
    expect(validateDraft({ ...lidar(), ports: tooMany }).ports).toBe('64 ports au plus.')
  })

  it('met le code en majuscules sans accents ni symboles, 4 caractères au plus', () => {
    expect(normalizeCode('lid-2x')).toBe('LID2')
    expect(normalizeCode('cam é')).toBe('CAME')
  })
})

describe('templateFromDraft', () => {
  it('produit un gabarit perso valide, avec le PoE seulement sur RJ45', () => {
    const id = newCustomId()
    const draft = { ...lidar(), vendor: ' ', model: ' VLP-16 ', ports: [...lidar().ports, { label: 'HDMI', connector: 'hdmi' as const, poe: 'out-at' as const }] }
    const t = templateFromDraft(draft, id)
    expect(DeviceTemplateSchema.parse(t)).toEqual(t)
    expect(t).toMatchObject({ id, name: 'Capteur LiDAR', code: 'LID', category: 'capteur', model: 'VLP-16', isCustom: true })
    expect(t.vendor).toBeUndefined()
    expect(t.ports).toEqual([
      { id: 'ETH', label: 'ETH', connector: 'rj45', speedMbps: 1000, poeIn: 'af' },
      { id: 'USB-1', label: 'USB 1', connector: 'usb' },
      { id: 'HDMI', label: 'HDMI', connector: 'hdmi' }
    ])
  })

  it('les identifiants de composante sont sûrs et uniques ; Dupliquer en tire un nouveau', () => {
    const a = newCustomId()
    expect(a).toMatch(CUSTOM_ID)
    expect(newCustomId()).not.toBe(a)
    const copy = duplicateTemplate(templateFromDraft(lidar(), a))
    expect(copy.id).toMatch(CUSTOM_ID)
    expect(copy.id).not.toBe(a)
    expect(copy.name).toBe('Capteur LiDAR (copie)')
  })
})

describe('composantes d’un projet', () => {
  const t1 = templateFromDraft(lidar(), 'custom-aaaaaaaaaaaa')
  const t2 = templateFromDraft({ ...lidar(), name: 'Autre' }, 'custom-bbbbbbbbbbbb')

  it('withTemplate embarque une seule fois', () => {
    const p = withTemplate(sampleProject(), t1)
    expect(p.templates).toEqual([t1])
    expect(withTemplate(p, t1)).toBe(p)
  })

  it('pruneTemplates retire les composantes inutilisées, et rend le même objet sinon', () => {
    const base = sampleProject()
    const used = { ...base, templates: [t1, t2], devices: [...base.devices, { ...base.devices[0]!, id: 'lid1', name: 'LID-1', templateId: t1.id }] }
    expect(pruneTemplates(used).templates).toEqual([t1])
    const clean = { ...used, templates: [t1] }
    expect(pruneTemplates(clean)).toBe(clean)
  })

  it('projectOnlyTemplates garde celles qui ne sont pas dans la bibliothèque', () => {
    expect(projectOnlyTemplates({ templates: [t1, t2] }, new Set([t1.id]))).toEqual([t2])
  })
})

describe('duplicateTemplate', () => {
  it('une copie d’un gabarit intégré est toujours perso', () => {
    const copy = duplicateTemplate(TEMPLATES_BY_ID.get('dante-avio')!)
    expect(copy.isCustom).toBe(true)
    expect(copy.id).toMatch(CUSTOM_ID)
    expect(copy.name).toBe('Adaptateur Dante AVIO (copie)')
  })

  it('le suffixe « (copie) » reste visible, même pour un nom de 60 caractères', () => {
    const copy = duplicateTemplate({ ...templateFromDraft(lidar(), 'custom-aaaaaaaaaaaa'), name: 'x'.repeat(60) })
    expect(copy.name).toHaveLength(60)
    expect(copy.name.endsWith(' (copie)')).toBe(true)
  })
})

describe('patch et puissance d’une composante', () => {
  const base = (): TemplateDraft => ({ ...blankDraft(), name: 'Lyre', code: 'MH' })

  it('écrit les canaux et la puissance', () => {
    const t = templateFromDraft({ ...base(), patchable: true, footprint: '16', powerW: '470,5' }, 'custom-abcdef123456')
    expect(t.dmx).toEqual({ footprint: 16 })
    expect(t.powerW).toBe(470.5)
  })

  it('sans case cochée ni puissance, rien n’est écrit', () => {
    const t = templateFromDraft({ ...base(), patchable: false, footprint: '16', powerW: '' }, 'custom-abcdef123456')
    expect(t.dmx).toBeUndefined()
    expect(t.powerW).toBeUndefined()
  })

  it('valide les canaux seulement quand la case est cochée', () => {
    expect(validateDraft({ ...base(), patchable: true, footprint: '600' }).dmx).toBe('Canaux : un nombre entier de 1 à 512.')
    expect(validateDraft({ ...base(), patchable: false, footprint: '600' }).dmx).toBeUndefined()
    expect(validateDraft({ ...base(), powerW: 'beaucoup' }).power).toBe('Puissance : un nombre positif ou nul, en watts.')
  })

  it('reprend le patch et la puissance d’un gabarit', () => {
    const fixture = TEMPLATES.find((t) => t.id === 'dmx-fixture')!
    expect(draftFrom(fixture)).toMatchObject({ patchable: true, footprint: '1', powerW: '' })
    expect(draftFrom({ ...fixture, powerW: 12.5, dmx: { footprint: 8, modes: [{ name: 'A', channels: 12 }] } })).toMatchObject({ footprint: '12', powerW: '12,5' })
  })
})
