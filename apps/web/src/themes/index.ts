/**
 * Theme System Module
 *
 * Public API exports for the Workspace theme system.
 */

// Types
export type {
  ThemeConfig,
  ThemeContextValue,
  ThemePresetDefinition,
  ThemePresetMeta,
  ThemeOverrides,
  ThemePreset,
} from "./types";
export { ALL_THEME_VARIABLES, CATEGORY_LABELS, THEME_VARIABLES } from "./types";
export {
  DEFAULT_SEMANTIC_TOKENS,
  ensureSemanticTokens,
  PRESET_SEMANTIC_OVERRIDES,
  SEMANTIC_THEME_VARIABLES,
} from "./semantic-tokens";
export { applyOklchColorTokens, EXPRESSIVE_OKLCH_COLORS } from "./expressive-oklch";

// Presets
export { DEFAULT_PRESET_NAME, presets } from "./presets";
export { presetDefinitions, presetMetas, STYLE_PRESET_NAMES } from "./registry";

// Context and hooks
export { ThemeCustomizationProvider, useThemeCustomization } from "./context";

// Utilities (for advanced use cases)
export { applyTheme, applyThemeWithPreset, mergeThemeWithOverrides } from "./apply";
export {
  clearThemeConfig,
  getDefaultConfig,
  loadThemeConfig,
  saveThemeConfig,
} from "./storage";
