import { createStore, type StoreApi } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { Device, Link, PortRef, PortState, Project, SwitchSpec } from '../model/types'
import { createDevice, createProject, newId, type CreateDeviceOptions } from '../model/project'
import { FAMILY_LABELS, canConnectPorts, connectorFamily, defaultMedium, findPort, nextCableId } from '../model/rules'
import { setLinkVlan as deriveSetLinkVlan, type VlanChoice } from '../model/derive'
import { buildSwitchPorts } from '../catalog/switch'
import { commit, initHistory, redo as historyRedo, undo as historyUndo, type History } from './history'

export interface Selection {
  deviceIds: string[]
  linkIds: string[]
}
export type DevicePatch = Partial<Pick<Device, 'name' | 'model' | 'ip' | 'hostname' | 'note' | 'portSide'>>
export type LinkPatch = Partial<Pick<Link, 'cableId' | 'medium' | 'lengthM' | 'jacketColor' | 'wifi' | 'note' | 'elbow'>>
export type MetaPatch = Partial<Project['meta']>

export interface ProjectState {
  history: History<Project>
  filePath: string | null
  savedRef: Project | null
  readOnly: boolean
  selection: Selection
  toast: string | null
  newProject(): void
  loadProject(project: Project, filePath: string | null, opts?: { readOnly?: boolean }): void
  markSaved(filePath: string, saved?: Project): void
  apply(fn: (p: Project) => Project): void
  addDevice(templateId: string, position: { x: number; y: number }, opts?: CreateDeviceOptions): string
  moveDevices(moves: Array<{ id: string; position: { x: number; y: number } }>): void
  removeElements(deviceIds: string[], linkIds: string[]): void
  connect(a: PortRef, b: PortRef): string | null
  updateDevice(id: string, patch: DevicePatch): void
  updateLink(id: string, patch: LinkPatch): void
  setLinkVlan(linkId: string, choice: VlanChoice): void
  setPortState(deviceId: string, portId: string, patch: Partial<PortState>): void
  updateSwitchSpec(deviceId: string, spec: SwitchSpec): void
  updateMeta(patch: MetaPatch): void
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
      selection: EMPTY_SELECTION,
      toast: null,

      newProject: () => {
        const p = createProject()
        set({ history: initHistory(p), filePath: null, savedRef: p, readOnly: false, selection: EMPTY_SELECTION })
      },
      loadProject: (project, filePath, opts) =>
        set({ history: initHistory(project), filePath, savedRef: project, readOnly: opts?.readOnly ?? false, selection: EMPTY_SELECTION }),
      markSaved: (filePath, saved) => set({ filePath, savedRef: saved ?? get().history.present }),
      apply,

      addDevice: (templateId, position, opts) => {
        let id = ''
        apply((p) => {
          const device = createDevice(p, templateId, position, opts)
          id = device.id
          return { ...p, devices: [...p.devices, device] }
        })
        return id
      },

      moveDevices: (moves) =>
        apply((p) => {
          const target = new Map(moves.map((m) => [m.id, m.position]))
          let changed = false
          const devices = p.devices.map((d) => {
            const pos = target.get(d.id)
            if (!pos || (pos.x === d.position.x && pos.y === d.position.y)) return d
            changed = true
            return { ...d, position: { x: pos.x, y: pos.y } }
          })
          return changed ? { ...p, devices } : p
        }),

      removeElements: (deviceIds, linkIds) => {
        const ds = new Set(deviceIds)
        const ls = new Set(linkIds)
        if (ds.size === 0 && ls.size === 0) return
        apply((p) => ({
          ...p,
          devices: p.devices.filter((d) => !ds.has(d.id)),
          links: p.links.filter((l) => !ls.has(l.id) && !ds.has(l.a.deviceId) && !ds.has(l.b.deviceId))
        }))
        set({ selection: EMPTY_SELECTION })
      },

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

      updateDevice: (id, patch) => apply((p) => ({ ...p, devices: p.devices.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      updateLink: (id, patch) => apply((p) => ({ ...p, links: p.links.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      setLinkVlan: (linkId, choice) => apply((p) => deriveSetLinkVlan(p, linkId, choice)),
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
          const gone = (r: PortRef): boolean => r.deviceId === deviceId && !keep.has(r.portId)
          return {
            ...p,
            devices: p.devices.map((d) => (d.id === deviceId ? { ...d, switch: spec, ports, portState } : d)),
            links: p.links.filter((l) => !gone(l.a) && !gone(l.b))
          }
        }),

      updateMeta: (patch) => apply((p) => ({ ...p, meta: { ...p.meta, ...patch } })),
      setSelection: (selection) => set({ selection }),
      undo: () => set({ history: historyUndo(get().history) }),
      redo: () => set({ history: historyRedo(get().history) }),
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
