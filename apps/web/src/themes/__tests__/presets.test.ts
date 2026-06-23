import { describe, expect, it } from 'vitest'

import { presets } from '../presets'
import { ALL_THEME_VARIABLES } from '../types'

const REQUIRED_KEYS = [...ALL_THEME_VARIABLES]

describe('theme presets completeness', () => {
  it('defines every required token for each preset in light and dark modes', () => {
    for (const [name, preset] of Object.entries(presets)) {
      for (const mode of ['light', 'dark'] as const) {
        for (const key of REQUIRED_KEYS) {
          expect(preset[mode][key], `${name}.${mode}.${key}`).toBeDefined()
          expect(preset[mode][key].trim(), `${name}.${mode}.${key}`).not.toBe('')
        }
      }
    }
  })

  it('includes semantic status tokens for every preset', () => {
    const semanticKeys = [
      '--positive',
      '--negative',
      '--info',
      '--warning',
      '--success',
    ] as const

    for (const [name, preset] of Object.entries(presets)) {
      for (const mode of ['light', 'dark'] as const) {
        for (const key of semanticKeys) {
          expect(preset[mode][key], `${name}.${mode}.${key}`).toBeDefined()
        }
      }
    }
  })

  it('exports 33 presets', () => {
    expect(Object.keys(presets)).toHaveLength(33)
  })

  it('applies oklch color tokens to migrated expressive presets', () => {
    for (const name of ['neumorphism', 'glassmorphism'] as const) {
      expect(presets[name].light['--primary'], name).toMatch(/^oklch\(/)
      expect(presets[name].dark['--primary'], name).toMatch(/^oklch\(/)
    }
  })
})
