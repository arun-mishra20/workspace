import { PRESET_SEMANTIC_OVERRIDES } from './preset-semantic-overrides'
import type { ThemePreset } from './types'

/**
 * Default semantic status colors applied to every preset unless overridden.
 */
export const DEFAULT_SEMANTIC_TOKENS = {
  light: {
    '--positive': 'oklch(0.527 0.154 150.069)',
    '--negative': 'oklch(0.577 0.245 27.325)',
    '--info': 'oklch(0.588 0.158 241.966)',
    '--warning': 'oklch(0.768 0.189 70.08)',
    '--success': 'oklch(0.527 0.154 150.069)',
  },
  dark: {
    '--positive': 'oklch(0.696 0.17 162.48)',
    '--negative': 'oklch(0.637 0.237 25.331)',
    '--info': 'oklch(0.682 0.155 241.966)',
    '--warning': 'oklch(0.828 0.189 84.429)',
    '--success': 'oklch(0.696 0.17 162.48)',
  },
} as const satisfies ThemePreset

/** Layout defaults applied when a preset omits them. */
export const DEFAULT_LAYOUT_TOKENS = {
  light: {
    '--font-size-base': '14px',
  },
  dark: {
    '--font-size-base': '14px',
  },
} as const satisfies ThemePreset

/**
 * Ensures every preset includes semantic status tokens and layout defaults.
 * Preset values take precedence over defaults.
 */
export function ensureSemanticTokens(preset: ThemePreset, presetName?: string): ThemePreset {
  const overrides = presetName ? PRESET_SEMANTIC_OVERRIDES[presetName] : undefined

  return {
    light: {
      ...DEFAULT_LAYOUT_TOKENS.light,
      ...DEFAULT_SEMANTIC_TOKENS.light,
      ...preset.light,
      ...overrides?.light,
    },
    dark: {
      ...DEFAULT_LAYOUT_TOKENS.dark,
      ...DEFAULT_SEMANTIC_TOKENS.dark,
      ...preset.dark,
      ...overrides?.dark,
    },
  }
}

export const SEMANTIC_THEME_VARIABLES = [
  '--positive',
  '--negative',
  '--info',
  '--warning',
  '--success',
] as const

export { PRESET_SEMANTIC_OVERRIDES } from './preset-semantic-overrides'
