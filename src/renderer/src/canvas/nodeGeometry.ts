export const DEVICE_NODE_HEIGHT = 58

export function deviceNodeWidth(portCount: number): number {
  return Math.max(176, 24 + portCount * 18)
}

export function portOffset(index: number, count: number, length: number): number {
  return Math.round(((index + 1) / (count + 1)) * length)
}
