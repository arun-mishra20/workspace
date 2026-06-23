import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { presetDefinitions, presetMetas } from '../registry'

const UI_PACKAGE_JSON = path.resolve(
  import.meta.dirname,
  '../../../../../packages/ui/package.json',
)

const CSS_PRESET_NAMES = [
  'ocean',
  'rose',
  'sunset',
  'forest',
  'lavender',
  'supabase',
  'neumorphism',
  'glassmorphism',
  'brutalism',
  'academia',
  'retro-terminal',
  'editorial',
  'bauhaus',
  'blueprint',
  'cyberpunk',
  'handwritten',
  'art-deco',
  'synthwave',
  'zen',
] as const

const EXPRESSIVE_WITH_GENERIC_CONTROLS = [
  'brutalism',
  'academia',
  'retro-terminal',
  'editorial',
  'bauhaus',
  'blueprint',
  'cyberpunk',
  'handwritten',
  'art-deco',
  'synthwave',
  'zen',
] as const

const DEDICATED_STYLE_CONTROLS = ['neumorphism', 'glassmorphism'] as const

describe('theme preset registry', () => {
  it('exposes metadata for every preset key', () => {
    const definitionKeys = Object.keys(presetDefinitions)
    const metaKeys = presetMetas.map((meta) => meta.name)

    expect(metaKeys).toEqual(definitionKeys)
  })

  it('registers expressive themes with style loaders', () => {
    for (const presetName of EXPRESSIVE_WITH_GENERIC_CONTROLS) {
      const definition = presetDefinitions[presetName]

      expect(definition).toBeDefined()
      expect(definition.meta.styleControlId).toBe(presetName)
      expect(definition.loadStyles).toBeTypeOf('function')
      expect(definition.cleanupPrefixes?.length).toBeGreaterThan(0)
      expect(definition.meta.preview.light).toHaveLength(3)
      expect(definition.meta.preview.dark).toHaveLength(3)
    }
  })

  it('registers dedicated style control presets', () => {
    for (const presetName of DEDICATED_STYLE_CONTROLS) {
      const definition = presetDefinitions[presetName]

      expect(definition).toBeDefined()
      expect(definition.meta.styleControlId).toBe(presetName)
      expect(definition.loadStyles).toBeTypeOf('function')
    }
  })

  it('registers classic CSS presets without style controls', () => {
    for (const presetName of [
      'ocean',
      'rose',
      'sunset',
      'forest',
      'lavender',
      'supabase',
    ]) {
      const definition = presetDefinitions[presetName]

      expect(definition).toBeDefined()
      expect(definition.meta.styleControlId).toBe('none')
      expect(definition.loadStyles).toBeTypeOf('function')
    }
  })

  it('exports a CSS file for every preset with loadStyles', () => {
    const packageJson = JSON.parse(readFileSync(UI_PACKAGE_JSON, 'utf8')) as {
      exports: Record<string, string>
    }

    for (const presetName of CSS_PRESET_NAMES) {
      const definition = presetDefinitions[presetName]
      const exportKey = `./styles/${presetName}.css`

      expect(definition?.loadStyles).toBeTypeOf('function')
      expect(packageJson.exports[exportKey]).toBe(`./src/styles/${presetName}.css`)
    }
  })
})
