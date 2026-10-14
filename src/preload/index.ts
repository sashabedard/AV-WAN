import { contextBridge } from 'electron'
import type { AvwanApi } from '../shared/api'

const api: AvwanApi = {
  platform: process.platform,
  isE2E: process.env['AVWAN_E2E'] === '1'
}

contextBridge.exposeInMainWorld('avwan', api)
