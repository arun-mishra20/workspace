/**
 * Theme System Types
 * 
 * Defines all TypeScript interfaces and types for the tweakcn-style theme system.
 */

/**
 * A complete theme preset containing light and dark mode CSS variable values
 */
export type ThemePreset = {
    light: Record<string, string>;
    dark: Record<string, string>;
};

/**
 * User-defined overrides for theme variables
 */
export type ThemeOverrides = {
    light: Record<string, string>;
    dark: Record<string, string>;
};

/**
 * Persisted theme configuration
 */
export type ThemeConfig = {
    preset: string;
    overrides: ThemeOverrides;
};

/**
 * Theme context value exposed to consumers
 */
export interface ThemeContextValue {
    /** Current preset name */
    currentPreset: string;
    /** Current overrides */
    overrides: ThemeOverrides;
    /** Available preset names */
    availablePresets: string[];
    /** Switch to a different preset */
    setPreset: (name: string) => void;
    /** Set a single override for a specific mode */
    setOverride: (mode: 'light' | 'dark', key: string, value: string) => void;
    /** Set multiple overrides for a specific mode */
    setOverrides: (mode: 'light' | 'dark', overrides: Record<string, string>) => void;
    /** Clear all overrides */
    clearOverrides: () => void;
    /** Reset to default preset and clear all overrides */
    reset: () => void;
    /** Get the final computed theme (preset + overrides) */
    getComputedTheme: () => ThemePreset;
}

/**
 * All CSS variable names used in the theme system
 * Organized by category for UI generation
 */
export const THEME_VARIABLES = {
    typography: [
        '--font-sans',
        '--font-serif',
        '--font-mono',
        '--font-size-base',
    ],
    layout: [
        '--radius',
        '--spacing',
        '--tracking-normal',
    ],
    baseColors: [
        '--background',
        '--foreground',
        '--card',
        '--card-foreground',
        '--popover',
        '--popover-foreground',
        '--primary',
        '--primary-foreground',
        '--secondary',
        '--secondary-foreground',
        '--muted',
        '--muted-foreground',
        '--accent',
        '--accent-foreground',
        '--destructive',
        '--destructive-foreground',
        '--border',
        '--input',
        '--ring',
    ],
    charts: [
        '--chart-1',
        '--chart-2',
        '--chart-3',
        '--chart-4',
        '--chart-5',
    ],
    sidebar: [
        '--sidebar',
        '--sidebar-foreground',
        '--sidebar-primary',
        '--sidebar-primary-foreground',
        '--sidebar-accent',
        '--sidebar-accent-foreground',
        '--sidebar-border',
        '--sidebar-ring',
    ],
    shadows: [
        '--shadow-x',
        '--shadow-y',
        '--shadow-blur',
        '--shadow-spread',
        '--shadow-opacity',
        '--shadow-color',
        '--shadow-2xs',
        '--shadow-xs',
        '--shadow-sm',
        '--shadow',
        '--shadow-md',
        '--shadow-lg',
        '--shadow-xl',
        '--shadow-2xl',
    ],
} as const;

/**
 * Flattened array of all theme variable names
 */
export const ALL_THEME_VARIABLES = Object.values(THEME_VARIABLES).flat();

/**
 * Category labels for UI display
 */
export const CATEGORY_LABELS: Record<keyof typeof THEME_VARIABLES, string> = {
    baseColors: 'Base Colors',
    charts: 'Chart Colors',
    sidebar: 'Sidebar',
    typography: 'Typography',
    layout: 'Layout',
    shadows: 'Shadows',
};
