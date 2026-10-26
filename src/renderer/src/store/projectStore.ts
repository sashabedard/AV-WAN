import { createStore, type StoreApi } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { Connector, Device, IpConfig, Link, MainsVoltage, PortRef, PortState, Project, SwitchSpec, Vlan, Zone } from '../model/types'
import { createDevice, createProject, newId, type CreateDeviceOptions } from '../model/project'
import { familyLabels, canConnectPorts, canReconnect, connectorFamily, defaultMedium, findPort, nextCableId, sameRef } from '../model/rules'
import { setLinkVlan as deriveSetLinkVlan, type VlanChoice } from '../model/derive'
import { buildSwitchPorts } from '../catalog/switch'
import { pasteFragment as pasteFragmentModel, type Fragment } from '../model/clipboard'
import { addVlan as addVlanModel, changeVlanId as changeVlanIdModel, removeVlan as removeVlanModel, updateVlan as updateVlanModel, type VlanPatch } from '../model/vlans'
import { assignZones, createZone, moveZones, placeDevices, removeZones, resizeZone as resizeZoneModel, zoneAround, zonesWithin, type ZoneRect } from '../model/zones'
import { withTemplate } from '../model/customTemplate'
import { autoAddress, autoAddressOnOpen } from '../model/daisyChain'
import { ownNewKeys, removeProjectList, setProjectList, type ChannelKey } from '../model/dmxChannels'
import { addRack as addRackModel, updateRack as updateRackModel, removeRack as removeRackModel, placeDevice, firstFreeU, unplaceDevice, setDeviceHeightU, removeInRackView, RACK_HEIGHT_MAX } from '../model/racks'
import { editPortIps } from '../model/ips'
import { ONBOARD, addCard as addCardModel, addPort as addPortModel, defaultCardName, removeCard as removeCardModel, removePorts, type CardPresetId } from '../model/cards'
import { uiStore } from './uiStore'
import { currentLang, currentMessages } from '../i18n/useT'
import type { Lang } from '../../../shared/i18n/lang'
import { dmxChannelsStore } from './dmxChannelsStore'
import { commit, initHistory, redo as historyRedo, undo as historyUndo, type History } from './history'

export interface Selection {
  deviceIds: string[]
  linkIds: string[]
  zoneIds?: string[]
  rackIds?: string[]
}

export function sameSelection(a: Selection, b: Selection): boolean {
  const eq = (x: readonly string[] = [], y: readonly string[] = []): boolean => x.length === y.length && x.every((v, i) => v === y[i])
  return eq(a.deviceIds, b.deviceIds) && eq(a.linkIds, b.linkIds) && eq(a.zoneIds, b.zoneIds) && eq(a.rackIds, b.rackIds)
}
export type DevicePatch = Partial<Pick<Device, 'name' | 'model' | 'hostname' | 'note' | 'portSide' | 'powerW' | 'dmx' | 'psu' | 'ledStrip'>>
export type LinkPatch = Partial<Pick<Link, 'cableId' | 'medium' | 'lengthM' | 'jacketColor' | 'wifi' | 'note' | 'elbow'>>
export type MetaPatch = Partial<Project['meta']>
export type ZonePatch = Partial<Pick<Zone, 'name' | 'color' | 'ownPdfPage'>>
export interface SelectionMoves {
  devices: Array<{ id: string; position: { x: number; y: number } }>
  zones: Array<{ id: string; dx: number; dy: number }>
}

export interface ProjectState {
  history: History<Project>
  filePath: string | null
  savedRef: Project | null
  readOnly: boolean
  docId: number
  // Identifiant du document tant qu'il n'a pas de chemin : nomme sa copie de récupération (u-<id>).
  untitledId: string
  selection: Selection
  toast: string | null
  newProject(): void
  loadProject(project: Project, filePath: string | null, opts?: { readOnly?: boolean; restored?: boolean }): void
  markSaved(filePath: string, saved?: Project): void
  apply(fn: (p: Project) => Project): void
  addDevice(templateId: string, position: { x: number; y: number }, opts?: Omit<CreateDeviceOptions, 'lang'> & { lang?: Lang }): string
  moveDevices(moves: Array<{ id: string; position: { x: number; y: number } }>): void
  moveSelection(moves: SelectionMoves): void
  removeElements(deviceIds: string[], linkIds: string[], zoneIds?: string[]): void
  addZone(rect: ZoneRect, name?: string): string
  zoneAroundSelection(): string | null
  updateZone(id: string, patch: ZonePatch): void
  resizeZone(id: string, rect: ZoneRect): void
  addRack(opts?: { name?: string; heightU?: number; zoneId?: string }): string
  updateRack(id: string, patch: { name?: string; heightU?: number; zoneId?: string | null }): boolean
  removeRack(id: string): void
  placeInRack(deviceId: string, rackId: string, u: number): boolean
  placeInRackFirstFree(deviceId: string, rackId: string): boolean
  unplaceFromRack(deviceId: string): void
  removeInRackView(plan: { unplace: readonly string[]; removeLinks: readonly string[]; removeRacks: readonly string[] }): void
  setDeviceRackHeight(deviceId: string, heightU: number): boolean
  pasteFragment(fragment: Fragment, offset: { x: number; y: number }): string[]
  connect(a: PortRef, b: PortRef): string | null
  reconnect(linkId: string, end: 'a' | 'b', to: PortRef): boolean
  updateDevice(id: string, patch: DevicePatch): void
  // Noms des canaux DMX d'un modèle + mode (spec canaux-dmx § 3.7) : l'entrée du projet ; les réglages sont écrits par l'appelant.
  setChannelList(key: ChannelKey, params: readonly string[]): void
  removeChannelList(key: ChannelKey): void
  updateLink(id: string, patch: LinkPatch): void
  setLinkVlan(linkId: string, choice: VlanChoice): void
  addVlan(vlan: Vlan): void
  updateVlan(id: number, patch: VlanPatch): void
  changeVlanId(from: number, to: number): boolean
  removeVlan(id: number): void
  setPortState(deviceId: string, portId: string, patch: Partial<PortState>): void
  addPortIp(deviceId: string, portId: string): void
  updatePortIp(deviceId: string, portId: string, index: number, ip: IpConfig): void
  removePortIp(deviceId: string, portId: string, index: number): void
  addPort(deviceId: string, cardId: string, connector: Connector): void
  addCard(deviceId: string, preset: CardPresetId): void
  renameCard(deviceId: string, cardId: string, name: string): void
  renamePort(deviceId: string, portId: string, label: string): void
  removePort(deviceId: string, portId: string): void
  removeCard(deviceId: string, cardId: string): void
  updateSwitchSpec(deviceId: string, spec: SwitchSpec): void
  updateMeta(patch: MetaPatch): void
  setMainsVoltage(voltage: MainsVoltage): void
  setColorMode(mode: Project['settings']['colorMode']): void
  setPageFormat(format: Project['settings']['pageFormat']): void
  setSelection(selection: Selection): void
  undo(): void
  redo(): void
  showToast(message: string): void
  clearToast(): void
}

const EMPTY_SELECTION: Selection = { deviceIds: [], linkIds: [] }

export function isDirty(s: Pick<ProjectState, 'history' | 'savedRef'>): boolean {
  return s.history.present !== s.savedRef
}

export function linksOnRemovedPorts(project: Project, deviceId: string, spec: SwitchSpec): Link[] {
  const keep = new Set(buildSwitchPorts(spec).map((p) => p.id))
  const gone = (r: PortRef): boolean => r.deviceId === deviceId && !keep.has(r.portId)
  return project.links.filter((l) => gone(l.a) || gone(l.b))
}

// ⌘Z ne revient pas sur l'affichage : on garde le mode de couleur et le format du PDF courants.
export function keepViewSettings(before: History<Project>, after: History<Project>): History<Project> {
  if (after === before) return after
  const { colorMode, pageFormat } = before.present.settings
  const s = after.present.settings
  if (s.colorMode === colorMode && s.pageFormat === pageFormat) return after
  return { ...after, present: { ...after.present, settings: { ...s, colorMode, pageFormat } } }
}

export function createProjectStore(initial: Project = createProject(undefined, currentLang())): StoreApi<ProjectState> {
  return createStore<ProjectState>()((set, get) => {
    const apply = (fn: (p: Project) => Project): void => {
      const { history, readOnly } = get()
      if (readOnly) {
        set({ toast: currentMessages().app.toast.readOnly })
        return
      }
      // Une clé de canaux qui apparaît reçoit sa liste dans la même étape (spec canaux-dmx § 3.7) ; les adresses suivent le câblage dans cette même étape.
      const next = autoAddress(ownNewKeys(history.present, fn(history.present), dmxChannelsStore.getState().lists))
      if (next !== history.present) set({ history: commit(history, next) })
    }

    // Suppression de ports : une entrée d'historique, et un toast quand des câbles ont été débranchés.
    const removeWithToast = (fn: (p: Project) => { project: Project; unplugged: number }): void => {
      if (refuseReadOnly()) return
      const r = fn(get().history.present)
      apply(() => r.project)
      if (r.unplugged > 0) set({ toast: currentMessages().app.toast.cablesUnplugged({ n: r.unplugged }) })
    }
    const mapDevice = (p: Project, id: string, fn: (d: Device) => Device): Project => ({ ...p, devices: p.devices.map((d) => (d.id === id ? fn(d) : d)) })

    // Lecture seule : même toast que apply ; true = refusé (les actions booléennes renvoient alors false).
    const refuseReadOnly = (): boolean => {
      if (!get().readOnly) return false
      set({ toast: currentMessages().app.toast.readOnly })
      return true
    }

    return {
      history: initHistory(initial),
      filePath: null,
      savedRef: initial,
      readOnly: false,
      docId: 0,
      untitledId: newId(),
      selection: EMPTY_SELECTION,
      toast: null,

      newProject: () => {
        const p = createProject(undefined, currentLang())
        set({ history: initHistory(p), filePath: null, savedRef: p, readOnly: false, selection: EMPTY_SELECTION, docId: get().docId + 1, untitledId: newId() })
        uiStore.getState().resetForDocument()
      },
      // restored : une copie de récupération, chargée comme « modifiée » (rien n'est encore enregistré).
      loadProject: (project, filePath, opts) => {
        const opened = autoAddressOnOpen(project) // aucune adresse documentée ne bouge ; ce n'est pas une modification
        set({
          history: initHistory(opened),
          filePath,
          savedRef: opts?.restored ? null : opened,
          readOnly: opts?.readOnly ?? false,
          selection: EMPTY_SELECTION,
          docId: get().docId + 1,
          untitledId: newId()
        })
        uiStore.getState().resetForDocument()
      },
      markSaved: (filePath, saved) => set({ filePath, savedRef: saved ?? get().history.present }),
      apply,

      addDevice: (templateId, position, opts) => {
        let id = ''
        apply((p) => {
          const base = opts?.template ? withTemplate(p, opts.template) : p
          const device = createDevice(base, templateId, position, { ...opts, lang: opts?.lang ?? currentLang() })
          id = device.id
          return assignZones({ ...base, devices: [...base.devices, device] }, [device.id])
        })
        return id
      },

      // Un glisser = une entrée : zones déplacées avec leurs membres, puis appareils libres, puis appartenance.
      moveSelection: ({ devices, zones }) =>
        apply((p) => {
          const root = zonesWithin(p, zones.filter((z) => z.dx !== 0 || z.dy !== 0).map((z) => z.id))
          const members = new Set(p.devices.filter((d) => d.zoneId !== undefined && root.has(d.zoneId)).map((d) => d.id))
          const own = devices.filter((m) => !members.has(m.id))
          const q = placeDevices(moveZones(p, zones), own)
          return own.length > 0 ? assignZones(q, own.map((m) => m.id)) : q
        }),
      moveDevices: (moves) => get().moveSelection({ devices: moves, zones: [] }),

      pasteFragment: (fragment, offset) => {
        let deviceIds: string[] = []
        let linkIds: string[] = []
        apply((p) => {
          const r = pasteFragmentModel(p, fragment, offset)
          deviceIds = r.deviceIds
          linkIds = r.linkIds
          return r.deviceIds.length > 0 ? assignZones(r.project, r.deviceIds) : p
        })
        if (deviceIds.length > 0) set({ selection: { deviceIds, linkIds } })
        return deviceIds
      },

      removeElements: (deviceIds, linkIds, zoneIds = []) => {
        const ds = new Set(deviceIds)
        const ls = new Set(linkIds)
        if (ds.size === 0 && ls.size === 0 && zoneIds.length === 0) return
        apply((p) =>
          removeZones(
            {
              ...p,
              devices: p.devices.filter((d) => !ds.has(d.id)),
              links: p.links.filter((l) => !ls.has(l.id) && !ds.has(l.a.deviceId) && !ds.has(l.b.deviceId))
            },
            zoneIds
          )
        )
        set({ selection: EMPTY_SELECTION })
      },

      addZone: (rect, name) => {
        let id = ''
        apply((p) => {
          const zone = createZone(p, rect, name ? { name } : {})
          id = zone.id
          return assignZones({ ...p, zones: [...p.zones, zone] })
        })
        return get().history.present.zones.some((z) => z.id === id) ? id : ''
      },
      zoneAroundSelection: () => {
        const rect = zoneAround(get().history.present, get().selection.deviceIds)
        if (!rect) {
          set({ toast: currentMessages().app.toast.zoneNeedsSelection })
          return null
        }
        return get().addZone(rect) || null
      },
      updateZone: (id, patch) => apply((p) => ({ ...p, zones: p.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) })),
      resizeZone: (id, rect) => apply((p) => resizeZoneModel(p, id, rect)),

      addRack: (opts = {}) => {
        const name = opts.name?.trim() ? opts.name : undefined
        let id = ''
        apply((p) => {
          const r = addRackModel(p, currentMessages(), { ...opts, name })
          id = r.id
          return r.project
        })
        return get().history.present.racks?.some((r) => r.id === id) ? id : ''
      },
      updateRack: (id, patch) => {
        if (refuseReadOnly()) return false
        const { heightU } = patch
        if (heightU !== undefined && (!Number.isInteger(heightU) || heightU < 1 || heightU > RACK_HEIGHT_MAX)) return false
        const next = updateRackModel(get().history.present, id, patch)
        if (!next) {
          set({ toast: currentMessages().app.toast.rackTooShort })
          return false
        }
        apply(() => next)
        return true
      },
      removeRack: (id) => apply((p) => removeRackModel(p, id)),
      placeInRack: (deviceId, rackId, u) => {
        if (refuseReadOnly()) return false
        const next = placeDevice(get().history.present, deviceId, rackId, u)
        if (!next) {
          set({ toast: currentMessages().app.toast.rackNoRoom })
          return false
        }
        apply(() => next)
        return true
      },
      placeInRackFirstFree: (deviceId, rackId) => {
        if (refuseReadOnly()) return false
        const p = get().history.present
        const h = p.devices.find((d) => d.id === deviceId)?.rack?.heightU ?? 1
        const u = firstFreeU(p, rackId, h, deviceId)
        const next = u === undefined ? null : placeDevice(p, deviceId, rackId, u)
        if (!next) {
          set({ toast: currentMessages().app.toast.rackNoRoom })
          return false
        }
        apply(() => next)
        return true
      },
      unplaceFromRack: (deviceId) => apply((p) => unplaceDevice(p, deviceId)),
      removeInRackView: (plan) => {
        apply((p) => removeInRackView(p, plan))
        set({ selection: EMPTY_SELECTION })
      },
      setDeviceRackHeight: (deviceId, heightU) => {
        if (refuseReadOnly()) return false
        const next = setDeviceHeightU(get().history.present, deviceId, heightU)
        if (!next) {
          set({ toast: currentMessages().app.toast.rackNoRoom })
          return false
        }
        apply(() => next)
        return true
      },

      connect: (a, b) => {
        const p = get().history.present
        if (!canConnectPorts(p, a, b)) {
          const pa = findPort(p, a)
          set({
            toast: pa
              ? currentMessages().app.toast.connectBlocked({ family: familyLabels(currentMessages())[connectorFamily(pa.port.connector)] })
              : currentMessages().app.toast.connectImpossible
          })
          return null
        }
        const pa = findPort(p, a)
        if (!pa) return null
        const link: Link = { id: newId(), cableId: nextCableId(p), a, b, medium: defaultMedium(pa.port.connector) }
        apply((q) => ({ ...q, links: [...q.links, link] }))
        return get().history.present.links.some((l) => l.id === link.id) ? link.id : null
      },

      reconnect: (linkId, end, to) => {
        const p = get().history.present
        const link = p.links.find((l) => l.id === linkId)
        if (!link || sameRef(link[end], to)) return false
        if (!canReconnect(p, linkId, end, to)) {
          set({ toast: currentMessages().app.toast.reconnectImpossible })
          return false
        }
        apply((q) => ({
          ...q,
          links: q.links.map((l) => {
            if (l.id !== linkId) return l
            const { elbow: _elbow, ...rest } = l // le coude manuel ne correspond plus au nouveau tracé
            return { ...rest, [end]: to }
          })
        }))
        return get().history.present.links.some((l) => l.id === linkId && sameRef(l[end], to))
      },

      updateDevice: (id, patch) => apply((p) => ({ ...p, devices: p.devices.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      setChannelList: (key, params) => apply((p) => setProjectList(p, key, params)),
      removeChannelList: (key) => apply((p) => removeProjectList(p, key)),
      updateLink: (id, patch) => apply((p) => ({ ...p, links: p.links.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      setLinkVlan: (linkId, choice) => apply((p) => deriveSetLinkVlan(p, linkId, choice)),
      addVlan: (vlan) => apply((p) => addVlanModel(p, vlan)),
      updateVlan: (id, patch) => apply((p) => updateVlanModel(p, id, patch)),
      changeVlanId: (from, to) => {
        const p = get().history.present
        if (from === to) return true
        if (get().readOnly) {
          apply((q) => q) // affiche le message de lecture seule
          return false
        }
        const next = changeVlanIdModel(p, from, to)
        if (!next) {
          set({
            toast: p.vlans.some((v) => v.id === to)
              ? currentMessages().app.toast.vlanExists({ id: to })
              : currentMessages().app.toast.vlanInvalid
          })
          return false
        }
        apply(() => next)
        const ui = uiStore.getState()
        if (ui.focusVlan === from) ui.setFocusVlan(to) // le focus suit le nouveau numéro
        return true
      },
      removeVlan: (id) => {
        apply((p) => removeVlanModel(p, id))
        if (!get().history.present.vlans.some((v) => v.id === id) && uiStore.getState().focusVlan === id) uiStore.getState().setFocusVlan(null)
      },
      setPortState: (deviceId, portId, patch) =>
        apply((p) => ({
          ...p,
          devices: p.devices.map((d) =>
            d.id === deviceId ? { ...d, portState: { ...d.portState, [portId]: { ...d.portState[portId], ...patch } } } : d
          )
        })),

      addPortIp: (deviceId, portId) => apply((p) => editPortIps(p, deviceId, portId, (ips) => [...ips, { address: '', mode: 'static' }])),
      updatePortIp: (deviceId, portId, index, ip) => apply((p) => editPortIps(p, deviceId, portId, (ips) => ips.map((x, i) => (i === index ? ip : x)))),
      removePortIp: (deviceId, portId, index) => apply((p) => editPortIps(p, deviceId, portId, (ips) => ips.filter((_, i) => i !== index))),

      addPort: (deviceId, cardId, connector) => apply((p) => mapDevice(p, deviceId, (d) => addPortModel(d, cardId, connector))),
      addCard: (deviceId, preset) => apply((p) => mapDevice(p, deviceId, (d) => addCardModel(d, preset, defaultCardName(d, preset, currentMessages())))),
      renameCard: (deviceId, cardId, name) =>
        apply((p) =>
          mapDevice(p, deviceId, (d) =>
            cardId === ONBOARD ? { ...d, onboardName: name } : { ...d, cards: (d.cards ?? []).map((c) => (c.id === cardId ? { ...c, name } : c)) }
          )
        ),
      renamePort: (deviceId, portId, label) => apply((p) => mapDevice(p, deviceId, (d) => ({ ...d, ports: d.ports.map((x) => (x.id === portId ? { ...x, label } : x)) }))),
      // Une seule entrée d'historique ; les câbles des ports retirés sont débranchés dans la même action.
      removePort: (deviceId, portId) => removeWithToast((p) => removePorts(p, deviceId, [portId])),
      removeCard: (deviceId, cardId) => removeWithToast((p) => removeCardModel(p, deviceId, cardId)),

      updateSwitchSpec: (deviceId, spec) =>
        apply((p) => {
          const device = p.devices.find((d) => d.id === deviceId)
          if (!device?.switch) return p
          const ports = buildSwitchPorts(spec)
          const keep = new Set(ports.map((x) => x.id))
          const portState = Object.fromEntries(Object.entries(device.portState).filter(([k]) => keep.has(k)))
          const removed = new Set(linksOnRemovedPorts(p, deviceId, spec).map((l) => l.id))
          return {
            ...p,
            devices: p.devices.map((d) => (d.id === deviceId ? { ...d, switch: spec, ports, portState } : d)),
            links: p.links.filter((l) => !removed.has(l.id))
          }
        }),

      updateMeta: (patch) => apply((p) => ({ ...p, meta: { ...p.meta, ...patch } })),
      // Donnée du projet (elle change le bilan de puissance) : une entrée d'historique, contrairement au format du PDF.
      setMainsVoltage: (voltage) => apply((p) => (p.settings.mainsVoltage === voltage ? p : { ...p, settings: { ...p.settings, mainsVoltage: voltage } })),
      // Préférence d'affichage enregistrée dans le fichier, mais jamais une entrée d'historique.
      setColorMode: (mode) => {
        const { history } = get()
        const p = history.present
        if (p.settings.colorMode === mode) return
        const present = { ...p, settings: { ...p.settings, colorMode: mode } }
        // Fichier en lecture seule : l'affichage ne compte pas comme une modification (rien ne peut être enregistré).
        set(get().readOnly ? { history: { ...history, present }, savedRef: present } : { history: { ...history, present } })
      },
      // Format du PDF : enregistré dans le fichier, jamais une entrée d'historique (décision 8).
      setPageFormat: (format) => {
        const { history } = get()
        const p = history.present
        if (p.settings.pageFormat === format) return
        const present = { ...p, settings: { ...p.settings, pageFormat: format } }
        set(get().readOnly ? { history: { ...history, present }, savedRef: present } : { history: { ...history, present } })
      },
      setSelection: (selection) => {
        if (!sameSelection(get().selection, selection)) set({ selection })
      },
      undo: () => set({ history: keepViewSettings(get().history, historyUndo(get().history)) }),
      redo: () => set({ history: keepViewSettings(get().history, historyRedo(get().history)) }),
      showToast: (message) => set({ toast: message }),
      clearToast: () => set({ toast: null })
    }
  })
}

export const projectStore = createProjectStore()

export function useProjectStore<T>(selector: (s: ProjectState) => T): T {
  return useStore(projectStore, selector)
}

export function useProject(): Project {
  return useProjectStore((s) => s.history.present)
}
