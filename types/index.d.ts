export type Running = {
  id: string
  label: string
  task: string
  status: string
  seconds: number
}

export type Done = {
  id: string
  label: string
  task: string
  seconds: number
}

declare module 'claude-code' {
  interface PluginState {
    'subagent-band': { running: Running[]; done: Done[]; frame: number }
  }
}
