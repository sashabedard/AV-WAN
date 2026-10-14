import type { Device, Project, Side } from './types'

// Côté « auto » : face à la moyenne des voisins branchés ; en bas s'il n'y en a aucun.
export function resolvePortSide(project: Project, device: Device): Side {
  if (device.portSide !== 'auto') return device.portSide
  let dx = 0
  let dy = 0
  let n = 0
  for (const l of project.links) {
    const peerId = l.a.deviceId === device.id ? l.b.deviceId : l.b.deviceId === device.id ? l.a.deviceId : null
    if (!peerId || peerId === device.id) continue
    const peer = project.devices.find((d) => d.id === peerId)
    if (!peer) continue
    dx += peer.position.x - device.position.x
    dy += peer.position.y - device.position.y
    n++
  }
  if (n === 0) return 'bottom'
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'bottom' : 'top'
}
