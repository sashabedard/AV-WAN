import type { AvwanApi } from '../../shared/api'

declare global {
  interface Window {
    avwan: AvwanApi
  }
}

export {}
