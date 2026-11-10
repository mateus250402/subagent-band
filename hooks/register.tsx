import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Done, Running } from '../types'

const PANE = 'subagentes'
const running = atom({ plugin: 'subagent-band', key: 'running' } as const, [] as Running[])
const done = atom({ plugin: 'subagent-band', key: 'done' } as const, [] as Done[])
const frame = atom({ plugin: 'subagent-band', key: 'frame' } as const, 0)

const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const ACTIVE = ['pending', 'running', 'waiting']
const PALETTE = ['#FF8A5B', '#2FC4A8', '#F2C94C', '#4C9AFF']
const GREEN = '#3DD68C'
const TICK_MS = 120

function clock(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = String(seconds % 60).padStart(2, '0')
  return `${m}:${s}`
}

function colorOf(label: string): string {
  let h = 0
  for (const ch of label) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}

// A soft highlight that sweeps over the name, letter by letter, then rests for a beat.
function shimmerAt(tick: number, length: number): number {
  const span = length + 6
  return (tick % span) - 3
}

export const register: Register = on => {
  const startedAt = new Map<string, number>()
  const known = new Map<string, Running>()
  let hadAny = false

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'subagentes',
      description: 'Abre o painel com os subagentes ativos',
    })
    void $.ui.open({ id: PANE, title: 'Subagentes' })

    $.clock.every(TICK_MS, async () => {
      const agents = await $.agent.list()
      const now = await $.clock.now()
      const live = agents.filter(a => ACTIVE.includes(a.status))

      for (const a of live) {
        if (!startedAt.has(a.id)) startedAt.set(a.id, now)
      }

      const finished: Done[] = []
      for (const id of [...startedAt.keys()]) {
        if (!live.some(a => a.id === id)) {
          const last = known.get(id)
          if (last) {
            finished.push({
              id,
              label: last.label,
              task: last.task,
              seconds: Math.max(last.seconds, Math.round((now - (startedAt.get(id) ?? now)) / 1000)),
            })
          }
          startedAt.delete(id)
          known.delete(id)
        }
      }

      if (live.length === 0 && finished.length === 0 && !hadAny) return
      hadAny = live.length > 0

      const current: Running[] = live.map(a => ({
        id: a.id,
        label: a.name ?? a.type,
        task: a.description,
        status: a.status,
        seconds: Math.max(0, Math.round((now - (startedAt.get(a.id) ?? now)) / 1000)),
      }))
      for (const r of current) known.set(r.id, r)

      await update($, running, () => current)
      if (finished.length > 0) {
        await update($, done, list => [...finished, ...list].slice(0, 5))
      }
      if (current.length > 0) {
        await update($, frame, n => (n + 1) % 1000)
      }
    })

    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const t = await $.clock.now()
    const result = await next(e)

    if ('agentId' in result && result.agentId) {
      startedAt.set(result.agentId, t)
    }

    return result
  })

  on('command.run', { command: 'subagentes' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Subagentes' })

    return { text: 'Painel de subagentes aberto.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, running)
    const finished = await read($, done)
    const tick = await read($, frame)
    const spin = SPINNER[tick % SPINNER.length]

    return (
      <Box flexDirection="column" gap={1} paddingX={1}>
        <Box flexDirection="row" gap={1}>
          <Text bold>Subagentes</Text>
          <Text color={list.length > 0 ? GREEN : undefined} dimColor={list.length === 0}>
            {list.length > 0 ? `● ${list.length} ativo${list.length > 1 ? 's' : ''}` : '○ ocioso'}
          </Text>
        </Box>
        {list.length === 0 && <Text dimColor>Nenhum subagente ativo.</Text>}
        {list.map(a => {
          const color = colorOf(a.label)
          return (
            <Box key={a.id} flexDirection="column" gap={0}>
              <Box flexDirection="row" gap={1}>
                <Text color={color}>{spin}</Text>
                <Box flexGrow={1} flexShrink={1}>
                  <Text bold wrap="truncate">
                    {[...a.label].map((ch, i) => {
                      const d = Math.abs(i - shimmerAt(tick, a.label.length))
                      return (
                        <Text key={i} bold color={d <= 1 ? color : undefined} dimColor={d === 2}>
                          {ch}
                        </Text>
                      )
                    })}
                  </Text>
                </Box>
                <Text color={color}>{clock(a.seconds)}</Text>
              </Box>
              <Text dimColor wrap="truncate">
                {a.task}
                {a.status === 'waiting' ? ' · aguardando' : ''}
              </Text>
            </Box>
          )
        })}
        {finished.length > 0 && (
          <Text bold color={GREEN}>
            Concluídos
          </Text>
        )}
        {finished.map(a => (
          <Box key={a.id} flexDirection="column" gap={0}>
            <Box flexDirection="row" gap={1}>
              <Text color={GREEN}>✓</Text>
              <Box flexGrow={1} flexShrink={1}>
                <Text dimColor wrap="truncate">
                  {a.label}
                </Text>
              </Box>
              <Text dimColor>{clock(a.seconds)}</Text>
            </Box>
            <Text dimColor wrap="truncate">
              {a.task}
            </Text>
          </Box>
        ))}
      </Box>
    )
  })
}
