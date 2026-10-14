import type { AvwanApi } from '../../shared/api'
import type { E2EHooks } from './dev/e2eHooks'

declare global {
  interface Window {
    avwan: AvwanApi
    __avwan?: E2EHooks
  }
}

export {}
