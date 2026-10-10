import type { Helper } from '../types'

// One crab is 8 x 6 pixels: C is shell, E is eye, anything else is sand showing through.
const FRAMES = [
  ['C......C', 'CC.EE.CC', '.CCCCCC.', 'CCCCCCCC', '.CCCCCC.', 'C.C..C.C'],
  ['.C....C.', 'CC.EE.CC', '.CCCCCC.', 'CCCCCCCC', '.CCCCCC.', '.C.CC.C.'],
] as const

export const CRAB_WIDTH = 8
const CRAB_HEIGHT = 6
const GAP = 1
const EYE = 0xffffff
const IDLE = 0x7a7a7a
const SAND = [0xc2a36b, 0xb8995f] as const
const DEFAULT = 0x01000000

export const PALETTE = [
  0xe8553f, 0xf08a24, 0x3fa7e8, 0x6cc04a, 0xb57be0, 0xd94f8c, 0xe8c33f, 0x3fd1c0,
] as const

export const hex = (rgb: number): string => `#${rgb.toString(16).padStart(6, '0')}`

type Placed = { x: number; frame: 0 | 1; color: number; isWalking: boolean }

const pingPong = (t: number, span: number): number => {
  if (span <= 0) return 0
  const period = span * 2
  const at = ((t % period) + period) % period

  return at <= span ? at : period - at
}

const seedOf = (id: string): number => {
  let seed = 7
  for (const char of id) seed = (seed * 31 + char.charCodeAt(0)) >>> 0

  return seed
}

/**
 * Where each crab stands at `tick`: workers wander the beach, finished crabs
 * rest in a row at the right edge, stopped or failed ones sit grey at the left.
 */
export function placeCrabs(helpers: readonly Helper[], width: number, tick: number): Placed[] {
  const span = Math.max(0, width - CRAB_WIDTH)
  const slot = CRAB_WIDTH + GAP
  const placed: Placed[] = []
  let resting = 0
  let fallen = 0

  for (const helper of helpers) {
    if (helper.status === 'running') {
      const seed = seedOf(helper.id)
      const speed = 0.6 + (seed % 7) / 10
      const x = Math.round(pingPong(tick * speed + (seed % 97), span))
      const frame = (Math.floor(tick / 2) + seed) % 2 === 0 ? 0 : 1
      placed.push({ x, frame, color: helper.color, isWalking: true })
    } else if (helper.status === 'done') {
      placed.push({ x: Math.max(0, span - resting * slot), frame: 0, color: helper.color, isWalking: false })
      resting += 1
    } else {
      placed.push({ x: Math.min(span, fallen * slot), frame: 0, color: IDLE, isWalking: false })
      fallen += 1
    }
  }

  // Workers last, so they walk in front of the crabs at rest.
  return placed.sort((a, b) => Number(a.isWalking) - Number(b.isWalking))
}

/** The beach as a pixel grid, CRAB_HEIGHT rows tall; `undefined` is open air. */
function paint(helpers: readonly Helper[], width: number, tick: number): (number | undefined)[][] {
  const grid: (number | undefined)[][] = Array.from({ length: CRAB_HEIGHT }, () =>
    new Array<number | undefined>(width).fill(undefined),
  )
  for (const crab of placeCrabs(helpers, width, tick)) {
    FRAMES[crab.frame].forEach((line, y) => {
      for (let dx = 0; dx < CRAB_WIDTH; dx += 1) {
        const px = line[dx]
        const row = grid[y]
        if (row === undefined || crab.x + dx >= width) continue
        if (px === 'C') row[crab.x + dx] = crab.color
        if (px === 'E') row[crab.x + dx] = EYE
      }
    })
  }

  return grid
}

export const LANE_ROWS = CRAB_HEIGHT / 2 + 1

/**
 * The beach as Raster cells: two pixels a cell with half blocks, and a row of
 * sand beneath.
 */
export function laneCells(helpers: readonly Helper[], columns: number, tick: number): string {
  const grid = paint(helpers, columns, tick)
  const words = new Uint32Array(columns * LANE_ROWS * 3)
  let at = 0
  const put = (codePoint: number, fg: number, bg: number) => {
    words[at] = codePoint
    words[at + 1] = fg
    words[at + 2] = bg
    at += 3
  }

  for (let row = 0; row < CRAB_HEIGHT / 2; row += 1) {
    for (let x = 0; x < columns; x += 1) {
      const top = grid[row * 2]?.[x]
      const bottom = grid[row * 2 + 1]?.[x]
      if (top !== undefined) put(0x2580, top, bottom ?? DEFAULT)
      else if (bottom !== undefined) put(0x2584, bottom, DEFAULT)
      else put(0x20, DEFAULT, DEFAULT)
    }
  }
  for (let x = 0; x < columns; x += 1) put(0x2580, SAND[x % 3 === 0 ? 1 : 0], DEFAULT)

  return toBase64(new Uint8Array(words.buffer))
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x2000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x2000))
  }

  return btoa(binary)
}

const rects = (frame: 0 | 1, color: number): string => {
  let out = ''
  FRAMES[frame].forEach((line, y) => {
    for (let x = 0; x < CRAB_WIDTH; x += 1) {
      const px = line[x]
      if (px === 'C' || px === 'E') {
        out += `<rect x="${x}" y="${y}" width="1" height="1" fill="${hex(px === 'C' ? color : EYE)}"/>`
      }
    }
  })

  return out
}

/** The beach as an SVG for surfaces without a Raster; SMIL walks the workers. */
export function laneSvg(helpers: readonly Helper[], width: number): string {
  const span = Math.max(0, width - CRAB_WIDTH)
  const crabs = placeCrabs(helpers, width, 0)
    .map((crab, i) => {
      if (!crab.isWalking || span === 0) {
        return `<g transform="translate(${crab.x},0)">${rects(0, crab.color)}</g>`
      }
      const seconds = span / 4 + (i % 3)
      const begin = -((crab.x / span) * seconds) / 2

      return (
        `<g>` +
        `<animateTransform attributeName="transform" type="translate" values="0,0;${span},0;0,0" dur="${seconds.toFixed(1)}s" begin="${begin.toFixed(1)}s" repeatCount="indefinite"/>` +
        `<g>${rects(0, crab.color)}<animate attributeName="opacity" values="1;0" dur="0.5s" calcMode="discrete" repeatCount="indefinite"/></g>` +
        `<g opacity="0">${rects(1, crab.color)}<animate attributeName="opacity" values="0;1" dur="0.5s" calcMode="discrete" repeatCount="indefinite"/></g>` +
        `</g>`
      )
    })
    .join('')
  const sand = `<rect x="0" y="${CRAB_HEIGHT}" width="${width}" height="1" fill="${hex(SAND[0])}"/>`

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${CRAB_HEIGHT + 1}" ` +
    `width="${width * 4}" height="${(CRAB_HEIGHT + 1) * 4}" shape-rendering="crispEdges">${crabs}${sand}</svg>`
  )
}
