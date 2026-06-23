import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const INDEX_CSS = resolve(
  import.meta.dirname,
  '../../../../../packages/ui/src/styles/index.css',
)

const MOTION_TOKENS = [
  '--motion-fast',
  '--motion-normal',
  '--motion-slow',
  '--motion-ease-out',
  '--motion-ease-spring',
  '--motion-distance-sm',
  '--motion-distance-md',
] as const

describe('motion.css tokens', () => {
  it('defines shared --motion-* tokens in index.css', () => {
    const css = readFileSync(INDEX_CSS, 'utf8')

    for (const token of MOTION_TOKENS) {
      expect(css, token).toContain(`${token}:`)
    }

    expect(css).toContain("@import './motion.css'")
  })
})
