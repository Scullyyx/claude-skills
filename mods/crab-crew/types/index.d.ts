export type HelperStatus = 'running' | 'done' | 'failed' | 'stopped'

/** One subagent the crew is tracking. */
export type Helper = {
  id: string
  description: string
  type: string
  model: string
  status: HelperStatus
  startedAt: number
  endedAt?: number
  /** Model requests the helper has made. */
  steps: number
  /** Tool calls the helper has made. */
  tools: number
  lastTool?: string
  inputTokens: number
  outputTokens: number
  /** Estimated dollars, from token usage at list prices. */
  cost: number
  /** 0xRRGGBB, the helper's crab. */
  color: number
}

declare module 'claude-code' {
  interface PluginState {
    'crab-crew': { helpers: Helper[]; batchStart: number }
  }
}
