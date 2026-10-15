import { createStore, type StoreApi } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { Device, Link, MainsVoltage, PortRef, PortState, Project, SwitchSpec, Vlan, Zone } from '../model/types'
import { createDevice, createProject, newId, type CreateDeviceOptions } from '../model/project'
import { FAMILY_LABELS, canConnectPorts, canReconnect, connectorFamily, defaultMedium, findPort, nextCableId, sameRef } from '../model/rules'
import { setLinkVlan as deriveSetLinkVlan, type VlanChoice } from '../model/derive'
import { buildSwitchPorts } from '../catalog/switch'
import { pasteFragment as pasteFragmentModel, type Fragment } from '../model/clipboard'
import { addVlan as addVlanModel, changeVlanId as changeVlanIdModel, removeVlan as removeVlanModel, updateVlan as updateVlanModel, type VlanPatch } from '../model/vlans'
import { assignZones, createZone, moveZones, placeDevices, removeZones, resizeZone as resizeZoneModel, zoneAround, zonesWithin, type ZoneRect } from '../model/zones'
import { withTemplate } from '../model/customTemplate'
import { removeProjectList, setProjectList, type ChannelKey } from '../model/dmxChannels'
import { uiStore } from './uiStore'
import { commit, initHistory, redo as historyRedo, undo as historyUndo, type History } from './history'

export interface Selection {
  deviceIds: string[]
  linkIds: string[]
  zoneIds?: string[]
}

export function sameSelection(a: Selection, b: Selection): boolean {
  const eq = (x: readonly string[] = [], y: readonly string[] = []): boolean => x.length === y.length && x.every((v, i) => v === y[i])
  return eq(a.deviceIds, b.deviceIds) && eq(a.linkIds, b.linkIds) && eq(a.zoneIds, b.zoneIds)
}
export type DevicePatch = Partial<Pick<Device, 'name' | 'model' | 'ip' | 'hostname' | 'note' | 'portSide' | 'powerW' | 'dmx' | 'psu' | 'ledStrip'>>
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
  addDevice(templateId: string, position: { x: number; y: number }, opts?: CreateDeviceOptions): string
  moveDevices(moves: Array<{ id: string; position: { x: number; y: number } }>): void
  moveSelection(moves: SelectionMoves): void
  removeElements(deviceIds: string[], linkIds: string[], zoneIds?: string[]): void
  addZone(rect: ZoneRect, name?: string): string
  zoneAroundSelection(): string | null
  updateZone(id: string, patch: ZonePatch): void
  resizeZone(id: string, rect: ZoneRect): void
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
const READ_ONLY_MESSAGE = 'Ce fichier vient d’une version plus récente d’AV·WAN : il est en lecture seule. Utilisez « Enregistrer sous… ».'

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

export function createProjectStore(initial: Project = createProject()): StoreApi<ProjectState> {
  return createStore<ProjectState>()((set, get) => {
    const apply = (fn: (p: Project) => Project): void => {
      const { history, readOnly } = get()
      if (readOnly) {
        set({ toast: READ_ONLY_MESSAGE })
        return
      }
      const next = fn(history.present)
      if (next !== history.present) set({ history: commit(history, next) })
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
        const p = createProject()
        set({ history: initHistory(p), filePath: null, savedRef: p, readOnly: false, selection: EMPTY_SELECTION, docId: get().docId + 1, untitledId: newId() })
        uiStore.getState().resetForDocument()
      },
      // restored : une copie de récupération, chargée comme « modifiée » (rien n'est encore enregistré).
      loadProject: (project, filePath, opts) => {
        set({
          history: initHistory(project),
          filePath,
          savedRef: opts?.restored ? null : project,
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
          const device = createDevice(base, templateId, position, opts)
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
          set({ toast: 'Sélectionnez au moins un appareil pour créer une zone autour.' })
          return null
        }
        return get().addZone(rect) || null
      },
      updateZone: (id, patch) => apply((p) => ({ ...p, zones: p.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) })),
      resizeZone: (id, rect) => apply((p) => resizeZoneModel(p, id, rect)),

      connect: (a, b) => {
        const p = get().history.present
        if (!canConnectPorts(p, a, b)) {
          const pa = findPort(p, a)
          set({
            toast: pa
              ? `Branchement impossible : port occupé ou connecteurs ${FAMILY_LABELS[connectorFamily(pa.port.connector)]} incompatibles.`
              : 'Branchement impossible.'
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
          set({ toast: 'Rebranchement impossible : port occupé ou connecteurs incompatibles.' })
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
              ? `Le VLAN ${to} existe déjà.`
              : 'Numéro de VLAN invalide : choisissez un nombre de 1 à 4094.'
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
