import { expect, test } from '@playwright/test'
import { launchApp } from './helpers'

type FrameCounter = { __frames: number; __raf: number }

test('le glisser reste fluide avec 150 appareils et 400 câbles', async () => {
  const { app, page } = await launchApp()
  await page.evaluate(() => window.__avwan!.loadStress())
  await expect(page.locator('.react-flow__node')).toHaveCount(150)
  await page.evaluate(() => window.__avwan!.fitView())
  await expect(page.locator('.react-flow__edge')).toHaveCount(400)
  await page.waitForTimeout(500)

  const box = await page.locator('.react-flow__node').nth(20).boundingBox()
  if (!box) throw new Error('Nœud introuvable')
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2

  await page.evaluate(() => {
    const w = window as unknown as FrameCounter
    w.__frames = 0
    const tick = (): void => {
      w.__frames++
      w.__raf = requestAnimationFrame(tick)
    }
    w.__raf = requestAnimationFrame(tick)
  })
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  const t0 = Date.now()
  for (let i = 1; i <= 90; i++) await page.mouse.move(cx + i * 3, cy + i * 1.5)
  const seconds = (Date.now() - t0) / 1000
  await page.mouse.up()
  const frames = await page.evaluate(() => {
    const w = window as unknown as FrameCounter
    cancelAnimationFrame(w.__raf)
    return w.__frames
  })
  const fps = frames / seconds
  console.log(`[perf] ${fps.toFixed(1)} i/s pendant ${seconds.toFixed(2)} s de glisser`)
  test.info().annotations.push({ type: 'fps', description: fps.toFixed(1) })
  expect(fps).toBeGreaterThanOrEqual(Number(process.env['AVWAN_PERF_MIN_FPS'] ?? 50))
  await app.close()
})
