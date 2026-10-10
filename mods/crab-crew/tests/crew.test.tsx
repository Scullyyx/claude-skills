import { expect, mock, test } from 'claude-code/testing'
import type { AgentSpawnInput, TurnStepInput, TurnStepResult } from 'claude-code'

const SPAWN: AgentSpawnInput = {
  tool_use_id: 'toolu_1',
  prompt: 'Find where sessions are refreshed',
  description: 'Find session refresh',
  subagentType: 'Explore',
  provider: { plugin: 'engine', tier: 'core' },
  parentModel: 'claude-opus-5-5',
  background: false,
  fork: false,
}

const step = (agentId: string, index: number): TurnStepInput => ({
  turnId: `turn-${agentId}`,
  index,
  model: 'claude-haiku-5-5',
  messageCount: index + 1,
  agentId,
})

const band = {
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: true, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

const pane = {
  component: 'Pane',
  requestId: 'crab-crew',
  props: {
    title: 'Crab crew',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
  viewport: { columns: 60, rows: 40 },
} as const

test('a subagent shows up with its model, progress and cost, then finishes', async ($, on) => {
  mock.clock(on)
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('agent.spawn', () => ({ model: 'claude-haiku-5-5', agentId: 'agent-1' }))
  on('turn.step', async function* (_$, e): AsyncGenerator<never, TurnStepResult> {
    return {
      turnId: e.turnId,
      index: e.index,
      answer: '',
      toolUses: [],
      stopReason: 'tool_use',
      // 1M input + 1M output tokens on Haiku 5.5 is $0.60.
      usage: {
        model: 'claude-haiku-5-5',
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      },
    }
  })
  on('turn.complete', () => ({ text: 'found it' }))

  await $.turn.start({ text: 'refactor auth', turnId: 'main-1' })
  await $.agent.spawn(SPAWN)
  for (const index of [0, 1, 2]) {
    const stream = $.turn.step(step('agent-1', index))
    for await (const _ of stream) {
      // drain
    }
  }

  for (const surface of ['terminal', 'desktop'] as const) {
    const above = await $.ui.mount({ plugin: 'crab-crew', surface, ...band })
    expect(await above.find({ type: 'Text', text: /0\/1 helpers done/ })).toBeDefined()
    expect(await above.find({ type: 'Text', text: /~\$1\.80/ })).toBeDefined()
    await above.unmount()

    const panel = await $.ui.mount({ plugin: 'crab-crew', surface, ...pane })
    expect(await panel.find({ type: 'Text', text: /Haiku 5\.5/ })).toBeDefined()
    expect(await panel.find({ type: 'Text', text: /3 steps · 0 tools/ })).toBeDefined()
    await panel.unmount()
  }

  await $.turn.complete({
    turnId: 'turn-agent-1',
    agentId: 'agent-1',
    reason: 'answer',
    isAborted: false,
    answer: 'found it',
    durationMs: 1000,
  })

  const above = await $.ui.mount({ plugin: 'crab-crew', surface: 'terminal', ...band })
  expect(await above.find({ type: 'Text', text: /1\/1 helpers done/ })).toBeDefined()
  await above.unmount()
})

test('the band stays out of the way until a helper is spawned', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box key="engine" />
  })

  const above = await $.ui.mount({ plugin: 'crab-crew', surface: 'terminal', ...band })
  expect(await above.find({ type: 'Text', text: /helpers done/ })).toBeUndefined()
  await above.unmount()
})
