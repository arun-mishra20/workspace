/**
 * Theme Storage Utilities
 *
 * Handles localStorage persistence for theme configuration.
 */

import { DEFAULT_PRESET_NAME } from './presets'
import type { ThemeConfig } from './types'

const STORAGE_KEY = 'workspace-theme'

/**
 * Load theme configuration from localStorage
 */
export function loadThemeConfig(): ThemeConfig | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const parsed = JSON.parse(stored) as ThemeConfig

    // Validate structure
    if (!parsed.preset || typeof parsed.preset !== 'string') {
      console.warn('Invalid theme config: missing or invalid preset')
      return null
    }

    if (!parsed.overrides || typeof parsed.overrides !== 'object') {
      console.warn('Invalid theme config: missing or invalid overrides')
      return null
    }

    return parsed
  } catch (error) {
    console.error('Failed to load theme config from localStorage:', error)
    return null
  }
}

/**
 * Save theme configuration to localStorage
 */
export function saveThemeConfig(config: ThemeConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (error) {
    console.error('Failed to save theme config to localStorage:', error)
  }
}

/**
 * Clear theme configuration from localStorage
 */
export function clearThemeConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear theme config from localStorage:', error)
  }
}

/**
 * Get default theme configuration
 */
export function getDefaultConfig(): ThemeConfig {
  return {
    preset: DEFAULT_PRESET_NAME,
    overrides: {
      light: {},
      dark: {},
    },
  }
}

/**
 * Migrate old theme storage if needed
 * This can be called once to help users transition from old storage format
 */
export function migrateOldThemeStorage(): void {
  const oldKey = 'vite-ui-theme'
  const oldValue = localStorage.getItem(oldKey)

  if (oldValue && !localStorage.getItem(STORAGE_KEY)) {
    console.info('Migrating old theme preference to new storage format')
    // Old storage only had light/dark/system preference
    // We'll just clear it and let user start fresh with new system
    localStorage.removeItem(oldKey)
  }
}
