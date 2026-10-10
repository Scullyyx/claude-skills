import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Helper, HelperStatus } from '../types'
import { CRAB_WIDTH, LANE_ROWS, PALETTE, hex, laneCells, laneSvg } from './crabs'
import { costOf, modelLabel, money } from './pricing'

const PANE = 'crab-crew'
const TITLE = 'Crab crew'
const TICK_MS = 250
const MAX_HELPERS = 60

const helpers = atom({ plugin: 'crab-crew', key: 'helpers' } as const, [])
const batchStart = atom({ plugin: 'crab-crew', key: 'batchStart' } as const, 0)

/**
 * A subagent says nothing about how far along it is, so this is a guess from
 * the model requests it has made: it climbs quickly at first, then slows, and
 * never reaches the end until the helper reports back.
 */
const progressOf = (helper: Helper): number =>
  helper.status === 'running' ? 0.95 * (1 - Math.exp(-helper.steps / 10)) : 1

const bar = (fraction: number, width: number): string => {
  const filled = Math.round(Math.min(1, Math.max(0, fraction)) * width)

  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

const duration = (ms: number): string => {
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds}s`

  return `${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, '0')}s`
}

const STATUS_WORD: Record<HelperStatus, string> = {
  running: 'working',
  done: 'done',
  failed: 'failed',
  stopped: 'stopped',
}

const STATUS_FROM_LIST: Partial<Record<string, HelperStatus>> = {
  completed: 'done',
  failed: 'failed',
  killed: 'stopped',
}

// The engine's state is the record; these mirror it for the animation timer
// and start over on each load, as the module does.
let known: Helper[] = []
let tick = 0
let lane: { columns: number } | undefined
let isFullscreen = false
let hasOpened = false

function write($: EngineInterface, change: (list: Helper[]) => Helper[]) {
  return update($, helpers, list => {
    known = change(list)

    return known
  })
}

function touch($: EngineInterface, id: string, change: (helper: Helper) => Helper) {
  return write($, list => list.map(helper => (helper.id === id ? change(helper) : helper)))
}

const isKnown = (id: string | undefined): id is string =>
  id !== undefined && known.some(helper => helper.id === id)

// A helper whose end the crew missed (a reload, a kill) is settled from the agent list.
async function reconcile($: EngineInterface) {
  if (!known.some(helper => helper.status === 'running')) return
  const agents = await $.agent.list()
  const now = await $.clock.now()
  const settled = new Map<string, HelperStatus>()
  for (const agent of agents) {
    const status = STATUS_FROM_LIST[agent.status]
    if (status) settled.set(agent.id, status)
  }
  if (!known.some(helper => helper.status === 'running' && settled.has(helper.id))) return
  await write($, list =>
    list.map(helper => {
      const status = settled.get(helper.id)

      return helper.status === 'running' && status ? { ...helper, status, endedAt: now } : helper
    }),
  )
}

function openPane($: EngineInterface) {
  return $.ui.open({ id: PANE, title: TITLE })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    hasOpened = false
    await $.command.register({
      name: 'crew',
      description: 'Show or hide the crab crew: every subagent with its model, progress and cost',
    })
    known = await read($, helpers)
    $.clock.every(TICK_MS, () => {
      if (!known.some(helper => helper.status === 'running')) return
      tick += 1
      if (tick % 40 === 0) void reconcile($)
      if (lane === undefined) return
      void $.ui
        .blit({ requestId: PANE, key: 'lane', cells: laneCells(known, lane.columns, tick) })
        .then(result => {
          if (result.deny !== undefined) lane = undefined
        })
    })

    return next(e)
  })

  on('command.run', { command: 'crew' }, async $ => {
    const panes = await $.ui.panes()
    if (panes.some(pane => pane.id === PANE)) {
      await $.ui.close({ id: PANE })

      return { text: 'Crab crew panel closed.' }
    }
    const opened = await openPane($)

    return {
      text: opened.isPlaced ? 'Crab crew panel opened.' : `The crab crew panel is not shown: ${opened.reason}`,
    }
  })

  on('turn.start', async ($, e, next) => {
    const now = await $.clock.now()
    await update($, batchStart, () => now)

    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const spawned = await next(e)
    if (!('agentId' in spawned) || spawned.agentId === undefined) return spawned

    const id = spawned.agentId
    const now = await $.clock.now()
    await write($, list => {
      const helper: Helper = {
        id,
        description: e.description || e.subagentType,
        type: e.subagentType,
        model: spawned.model,
        status: 'running',
        startedAt: now,
        steps: 0,
        tools: 0,
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
        color: PALETTE[list.length % PALETTE.length] ?? PALETTE[0],
      }

      return [...list.filter(one => one.id !== id), helper].slice(-MAX_HELPERS)
    })
    // Open the panel unasked only where it docks beside the transcript.
    if (!hasOpened && isFullscreen) {
      hasOpened = true
      void openPane($)
    }

    return spawned
  }).catch(($, e, next) => next(e))

  on('turn.step', async function* ($, e, next) {
    const response = yield* next(e)
    const id = e.agentId
    if (!isKnown(id)) return response

    const usage = response.usage
    await touch($, id, helper => ({
      ...helper,
      status: 'running',
      steps: helper.steps + 1,
      model: usage?.model ?? helper.model,
      inputTokens:
        helper.inputTokens +
        (usage ? usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens : 0),
      outputTokens: helper.outputTokens + (usage?.output_tokens ?? 0),
      cost: helper.cost + (usage ? costOf(usage, usage.model) : 0),
    }))

    return response
  })

  on('tool.call', async ($, e, next) => {
    const id = e.agentId
    if (isKnown(id)) {
      await touch($, id, helper => ({ ...helper, tools: helper.tools + 1, lastTool: String(e.tool) }))
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const id = e.agentId
    if (isKnown(id)) {
      const now = await $.clock.now()
      const status: HelperStatus = e.reason === 'answer' ? 'done' : e.reason === 'aborted' ? 'stopped' : 'failed'
      await touch($, id, helper => ({ ...helper, status, endedAt: now }))
    } else if (id === undefined) {
      await reconcile($)
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    isFullscreen = e.viewport?.isFullscreen === true
    if (e.props.hasSurvey) return next(e)

    const since = await read($, batchStart)
    const crew = (await read($, helpers)).filter(
      helper => helper.status === 'running' || helper.startedAt >= since,
    )
    if (crew.length === 0) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const finished = crew.filter(helper => helper.status !== 'running').length
    const fraction = crew.reduce((sum, helper) => sum + progressOf(helper), 0) / crew.length
    const cost = crew.reduce((sum, helper) => sum + helper.cost, 0)
    const width = Math.max(8, Math.min(30, e.props.bodyColumns - 44))

    return (
      <Box>
        <Text color={hex(PALETTE[0])}>🦀 </Text>
        <Text>
          {finished}/{crew.length} helpers done{' '}
        </Text>
        <Text color={finished === crew.length ? 'green' : hex(PALETTE[1])}>{bar(fraction, width)}</Text>
        <Text>
          {' '}
          {Math.round(fraction * 100)}%
        </Text>
        <Text dimColor>
          {' '}
          · ~{money(cost)}{' '}
        </Text>
        <Button key="open" label="Crew" onPress={() => void openPane($)} />
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const list = await read($, helpers)
    const now = await $.clock.now()
    const columns = Math.max(CRAB_WIDTH + 2, Math.min(512, e.props.bodyColumns))
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui

    // Running first, then the most recent.
    const ordered = [...list].sort(
      (a, b) => Number(b.status === 'running') - Number(a.status === 'running') || b.startedAt - a.startedAt,
    )
    const room = Math.max(1, Math.floor(((e.viewport?.rows ?? 30) - LANE_ROWS - 6) / 3))
    const shown = ordered.slice(0, room)

    let beach
    if (e.surface === 'terminal') {
      const { Raster } = $.ui.resolve(e)
      lane = { columns }
      beach = <Raster key="lane" columns={columns} rows={LANE_ROWS} cells={laneCells(list, columns, tick)} />
    } else {
      const { Svg } = $.ui.resolve(e)
      lane = undefined
      beach = (
        <Svg
          source={laneSvg(list, Math.min(160, columns))}
          alt={`${list.filter(h => h.status === 'running').length} crabs at work`}
          isInteractive
        />
      )
    }

    if (list.length === 0) {
      return (
        <Box flexDirection="column">
          {beach}
          <Text dimColor>No helpers yet. When Claude hands part of the job to a subagent, a crab shows up here.</Text>
        </Box>
      )
    }

    const running = list.filter(helper => helper.status === 'running').length
    const total = list.reduce((sum, helper) => sum + helper.cost, 0)
    const barWidth = Math.max(6, Math.min(24, columns - 30))

    return (
      <Box flexDirection="column">
        {beach}
        <Text>
          <Text bold>{running} working</Text>
          <Text dimColor>
            {' '}
            · {list.length - running} finished · ~{money(total)} so far
          </Text>
        </Text>
        {shown.map(helper => {
          const elapsed = duration((helper.endedAt ?? now) - helper.startedAt)
          const fraction = progressOf(helper)

          return (
            <Box key={helper.id} flexDirection="column" marginTop={1}>
              <Box justifyContent="space-between">
                <Text wrap="truncate-end">
                  <Text color={hex(helper.color)}>● </Text>
                  <Text bold>{helper.type}</Text>
                  <Text dimColor> · </Text>
                  <Text>{modelLabel(helper.model)}</Text>
                </Text>
                <Text>~{money(helper.cost)}</Text>
              </Box>
              <Text dimColor wrap="truncate-end">
                {'  '}
                {helper.description}
              </Text>
              {helper.status === 'running' ? (
                <Text wrap="truncate-end">
                  {'  '}
                  <Text color={hex(helper.color)}>{bar(fraction, barWidth)}</Text> ~{Math.round(fraction * 100)}%
                  <Text dimColor>
                    {' '}
                    · {helper.steps} steps · {helper.tools} tools
                    {helper.lastTool ? ` · ${helper.lastTool}` : ''} · {elapsed}
                  </Text>
                </Text>
              ) : (
                <Text wrap="truncate-end">
                  {'  '}
                  <Text color={helper.status === 'done' ? 'green' : 'red'}>
                    {helper.status === 'done' ? '✓' : '✗'} {STATUS_WORD[helper.status]}
                  </Text>
                  <Text dimColor>
                    {' '}
                    in {elapsed} · {helper.steps} steps · {helper.tools} tools ·{' '}
                    {Math.round((helper.inputTokens + helper.outputTokens) / 1000)}k tokens
                  </Text>
                </Text>
              )}
            </Box>
          )
        })}
        {ordered.length > shown.length && (
          <Text dimColor>…and {ordered.length - shown.length} more</Text>
        )}
        <Box marginTop={1}>
          <Text dimColor wrap="wrap">
            Progress is a guess from each helper's model requests. Cost is estimated from token usage at list price.
          </Text>
        </Box>
      </Box>
    )
  })
}
