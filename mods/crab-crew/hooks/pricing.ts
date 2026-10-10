import type { ModelUsage } from 'claude-code'

/** Dollars per million tokens. */
export type Price = { input: number; output: number; cacheRead: number; cacheWrite: number }

const price = (input: number, output: number, cacheRead = input / 10): Price => ({
  input,
  output,
  cacheRead,
  cacheWrite: input * 1.25,
})

// First-party list prices; the first pattern that matches the model id wins.
const TABLE: ReadonlyArray<readonly [RegExp, Price]> = [
  [/(fable|mythos)-5-1/, price(10, 50, 0.25)],
  [/(fable|mythos)/, price(10, 50)],
  [/opus-5-5/, price(4, 20, 0.2)],
  [/opus-(5|4-[5-9])/, price(5, 25)],
  [/opus/, price(15, 75)],
  [/sonnet-5/, price(2, 10, 0.2)],
  [/sonnet/, price(3, 15)],
  [/haiku-5/, price(0.1, 0.5)],
  [/haiku-4/, price(1, 5)],
  [/haiku/, price(0.8, 4)],
]

// What a bare alias on the Agent tool resolves to today.
const ALIASES: Record<string, string> = {
  fable: 'claude-fable-5-1',
  opus: 'claude-opus-5-5',
  sonnet: 'claude-sonnet-5-5',
  haiku: 'claude-haiku-5-5',
}

const resolve = (model: string): string => ALIASES[model.toLowerCase()] ?? model.toLowerCase()

export function priceOf(model: string): Price | undefined {
  const id = resolve(model)

  return TABLE.find(([pattern]) => pattern.test(id))?.[1]
}

/** Estimated dollars for one response; an unknown model is priced as a Sonnet. */
export function costOf(usage: ModelUsage, model: string): number {
  const p = priceOf(model) ?? price(3, 15)

  return (
    (usage.input_tokens * p.input +
      usage.output_tokens * p.output +
      usage.cache_read_input_tokens * p.cacheRead +
      usage.cache_creation_input_tokens * p.cacheWrite) /
    1_000_000
  )
}

/** `claude-haiku-4-5-20251001` → `Haiku 4.5`. */
export function modelLabel(model: string): string {
  const id = resolve(model)
  const family = /(fable|mythos|opus|sonnet|haiku)-(\d+)(?:-(\d{1,2})(?!\d))?/.exec(id)
  if (family) {
    const [, name = '', major, minor] = family

    return `${name[0]?.toUpperCase()}${name.slice(1)} ${major}${minor ? `.${minor}` : ''}`
  }
  const legacy = /claude-(\d)-(\d)-(opus|sonnet|haiku)/.exec(id)
  if (legacy) {
    const [, major, minor, name = ''] = legacy

    return `${name[0]?.toUpperCase()}${name.slice(1)} ${major}.${minor}`
  }

  return model
}

export function money(dollars: number): string {
  if (dollars >= 100) return `$${dollars.toFixed(0)}`
  if (dollars >= 0.01) return `$${dollars.toFixed(2)}`

  return `$${dollars.toFixed(3)}`
}
