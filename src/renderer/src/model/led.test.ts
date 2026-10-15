// src/renderer/src/model/led.test.ts
import { describe, expect, it } from 'vitest'
import { LED_STRIP_TYPES, stripPixels, stripPower, stripWithType } from './led'
import { LedStripTypeSchema } from './schema'

describe('LED_STRIP_TYPES', () => {
  it('décrit chaque type du schéma ; seuls les types pixel ont des px/m et des canaux par pixel', () => {
    for (const type of LedStripTypeSchema.options) {
      const info = LED_STRIP_TYPES[type]
      expect(info.label, type).toBeTruthy()
      expect(info.pixel, type).toBe(info.pxPerM !== undefined)
      expect(info.pixel, type).toBe(info.channelsPerPixel !== undefined)
    }
    expect(LED_STRIP_TYPES['sk6812-rgbw'].channelsPerPixel).toBe(4)
    expect(LED_STRIP_TYPES.ws2815.channelsPerPixel).toBe(3)
  })
})

describe('stripPower', () => {
  it('W/m × longueur ; A = W / V', () => {
    expect(stripPower({ type: 'sk6812-rgbw', volts: 24, wPerM: 14.4, lengthM: 5, pxPerM: 60 })).toEqual({ watts: 72, amps: 3 })
    expect(stripPower({ type: 'cob', volts: 24, wPerM: 10, lengthM: 2.5 })).toEqual({ watts: 25, amps: 1 })
  })

  it('rien sans longueur (jamais NaN)', () => {
    expect(stripPower({ type: 'cob', volts: 24, wPerM: 10 })).toBeUndefined()
  })
})

describe('stripPixels', () => {
  it('300 px RGBW : 1 200 canaux, 128 px par univers, 3 univers', () => {
    expect(stripPixels({ type: 'sk6812-rgbw', volts: 24, wPerM: 14.4, lengthM: 5, pxPerM: 60 })).toEqual({ pixels: 300, channels: 1200, perUniverse: 128, universes: 3, channelsPerPixel: 4 })
  })

  it('ne coupe jamais un pixel : 170 px RGB tiennent dans un univers, 171 en demandent deux', () => {
    expect(stripPixels({ type: 'ws2812b', volts: 5, wPerM: 18, lengthM: 2.84, pxPerM: 60 })).toMatchObject({ pixels: 170, universes: 1 })
    expect(stripPixels({ type: 'ws2812b', volts: 5, wPerM: 18, lengthM: 2.85, pxPerM: 60 })).toMatchObject({ pixels: 171, universes: 2 })
  })

  it('rien pour une bande non pixel, sans px/m ou sans longueur', () => {
    expect(stripPixels({ type: 'cob', volts: 24, wPerM: 10, lengthM: 5 })).toBeUndefined()
    expect(stripPixels({ type: 'ws2815', volts: 12, wPerM: 14.4, lengthM: 5 })).toBeUndefined()
    expect(stripPixels({ type: 'ws2815', volts: 12, wPerM: 14.4, pxPerM: 60 })).toBeUndefined()
  })
})

describe('stripWithType', () => {
  it('préremplit les valeurs du type et garde la longueur', () => {
    const cob = stripWithType({ type: 'ws2815', volts: 12, wPerM: 14.4, lengthM: 3, pxPerM: 60 }, 'cob')
    expect(cob).toEqual({ type: 'cob', volts: LED_STRIP_TYPES.cob.volts, wPerM: LED_STRIP_TYPES.cob.wPerM, lengthM: 3 })
    expect(stripWithType(undefined, 'ws2812b')).toEqual({ type: 'ws2812b', volts: 5, wPerM: LED_STRIP_TYPES.ws2812b.wPerM, pxPerM: 60 })
  })
})
