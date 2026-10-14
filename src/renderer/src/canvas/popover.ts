type XY = { x: number; y: number }

export function clampPopover(point: XY, size: { w: number; h: number }, viewport: { w: number; h: number }, margin = 8): { left: number; top: number } {
  const clamp = (v: number, room: number): number => Math.max(margin, Math.min(v, room - margin))
  return { left: clamp(point.x, viewport.w - size.w), top: clamp(point.y, viewport.h - size.h) }
}
