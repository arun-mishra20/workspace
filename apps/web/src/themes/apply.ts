/**
 * Theme Application Logic
 *
 * Applies theme CSS variables to the DOM.
 */

import type { ThemePreset } from './types'

let neumorphismStylesLoader: Promise<unknown> | null = null
let glassmorphismStylesLoader: Promise<unknown> | null = null
let previousPresetName: string | null = null

/**
 * Apply theme to the DOM by setting CSS custom properties
 *
 * @param theme - The complete theme with light and dark mode values
 */
export function applyTheme(theme: ThemePreset): void {
  const root = document.documentElement

  // Apply light mode variables to :root
  for (const [key, value] of Object.entries(theme.light)) {
    root.style.setProperty(key, value)
  }

  // For dark mode, we need to find or create a style element
  // that targets .dark class specifically
  applyDarkModeVariables(theme.dark)
}

/**
 * Apply theme and mark which preset is currently active.
 *
 * @param theme - The complete theme with light and dark mode values
 * @param presetName - Name of the active preset for preset-scoped styling
 */
export function applyThemeWithPreset(
  theme: ThemePreset,
  presetName: string,
): void {
  // Clean up neumorphism-specific inline CSS variables when switching away
  if (previousPresetName === 'neumorphism' && presetName !== 'neumorphism') {
    cleanupNeumorphismInlineStyles()
  }

  // Clean up glassmorphism-specific inline CSS variables when switching away
  if (previousPresetName === 'glassmorphism' && presetName !== 'glassmorphism') {
    cleanupGlassmorphismInlineStyles()
  }

  if (presetName === 'neumorphism') {
    ensureNeumorphismStyles()
  }

  if (presetName === 'glassmorphism') {
    ensureGlassmorphismStyles()
  }

  const root = document.documentElement
  root.dataset.themePreset = presetName
  applyTheme(theme)

  previousPresetName = presetName
}

/**
 * Remove all --neu-* inline style properties from <html>
 * so they don't bleed into non-neumorphic presets.
 */
function cleanupNeumorphismInlineStyles(): void {
  const root = document.documentElement
  const style = root.style
  const keysToRemove: string[] = []

  for (const prop of style) {
    if (prop.startsWith('--neu-')) {
      keysToRemove.push(prop)
    }
  }

  for (const key of keysToRemove) {
    root.style.removeProperty(key)
  }
}

function ensureNeumorphismStyles(): void {
  if (neumorphismStylesLoader) {
    return
  }

  neumorphismStylesLoader = import('@workspace/ui/styles/neumorphism.css')
}

/**
 * Remove all --glass-* inline style properties from <html>
 * so they don't bleed into non-glassmorphic presets.
 */
function cleanupGlassmorphismInlineStyles(): void {
  const root = document.documentElement
  const style = root.style
  const keysToRemove: string[] = []

  for (const prop of style) {
    if (prop.startsWith('--glass-')) {
      keysToRemove.push(prop)
    }
  }

  for (const key of keysToRemove) {
    root.style.removeProperty(key)
  }
}

function ensureGlassmorphismStyles(): void {
  if (glassmorphismStylesLoader) {
    return
  }

  glassmorphismStylesLoader = import('@workspace/ui/styles/glassmorphism.css')
}

/**
 * Apply dark mode CSS variables
 * We create a style element that targets :root.dark with !important
 * to ensure it overrides the inline styles set on :root
 */
function applyDarkModeVariables(darkVars: Record<string, string>): void {
  const styleId = 'workspace-theme-dark-vars'
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null

  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = styleId
    document.head.append(styleEl)
  }

  // Build CSS rule for :root.dark with !important to override inline styles
  const cssVars = Object.entries(darkVars)
    .map(([key, value]) => `  ${key}: ${value} !important;`)
    .join('\n')

  styleEl.textContent = `:root.dark {\n${cssVars}\n}`
}

/**
 * Remove all custom theme properties
 * This resets to whatever is defined in the base CSS
 */
export function removeTheme(): void {
  // Remove the dynamic style element for dark mode
  const styleId = 'workspace-theme-dark-vars'
  const styleEl = document.getElementById(styleId)
  if (styleEl) {
    styleEl.remove()
  }

  // For light mode, we'd need to know which properties to remove
  // Since we're applying presets, we don't actually need to remove them
  // The next preset will just override them
}

/**
 * Merge preset with overrides to create final theme
 *
 * @param preset - Base preset theme
 * @param overrides - User overrides for light and dark modes
 * @returns Merged theme
 */
export function mergeThemeWithOverrides(
  preset: ThemePreset,
  overrides: { light: Record<string, string>, dark: Record<string, string> },
): ThemePreset {
  return {
    light: { ...preset.light, ...overrides.light },
    dark: { ...preset.dark, ...overrides.dark },
  }
}
