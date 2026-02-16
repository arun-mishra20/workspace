/**
 * Neumorphic Presets Component
 *
 * Provides color presets and style toggles specifically for the neumorphic theme.
 * Only displays when the neumorphism preset is active.
 */

import { useEffect, useState } from 'react'
import { Label } from '@workspace/ui/components/ui/label'
import { Switch } from '@workspace/ui/components/ui/switch'
import { useThemeCustomization } from '@/themes/context'
import { Badge } from '@workspace/ui/components/ui/badge'

// List of CSS variables that are neumorphic-specific and should be cleaned up
const NEUMORPHIC_VARIABLES = [
    '--neu-shadow-extruded',
    '--neu-shadow-extruded-hover',
    '--neu-shadow-extruded-sm',
    '--neu-shadow-button',
    '--neu-shadow-button-hover',
    '--neu-shadow-card',
    '--neu-shadow-card-hover',
    '--neu-shadow-frame',
    '--neu-shadow-inset',
    '--neu-shadow-inset-deep',
    '--neu-shadow-inset-sm',
    '--neu-surface-raised',
]

const NEUMORPHIC_PRESETS = [
    {
        name: "Pearl",
        colors: {
            background: "hsl(220, 16%, 94%)",
            shadowLight: "hsl(220, 20%, 99%)",
            shadowDark: "hsl(220, 12%, 82%)",
        },
    },
    {
        name: "Cloud",
        colors: {
            background: "hsl(210, 20%, 90%)",
            shadowLight: "hsl(210, 25%, 97%)",
            shadowDark: "hsl(210, 18%, 76%)",
        },
    },
    {
        name: "Stone",
        colors: {
            background: "hsl(215, 12%, 85%)",
            shadowLight: "hsl(215, 15%, 94%)",
            shadowDark: "hsl(215, 10%, 68%)",
        },
    },

    // Dark Neutrals - Better contrast for depth
    {
        name: "Slate",
        colors: {
            background: "hsl(215, 16%, 26%)",
            shadowLight: "hsl(215, 18%, 36%)",
            shadowDark: "hsl(215, 20%, 16%)",
        },
    },
    {
        name: "Charcoal",
        colors: {
            background: "hsl(220, 14%, 18%)",
            shadowLight: "hsl(220, 16%, 28%)",
            shadowDark: "hsl(220, 18%, 10%)",
        },
    },
    {
        name: "Midnight",
        colors: {
            background: "hsl(230, 22%, 22%)",
            shadowLight: "hsl(230, 24%, 32%)",
            shadowDark: "hsl(230, 26%, 12%)",
        },
    },

    // Pastel Warm Tones - Softer, more sophisticated
    {
        name: "Rose",
        colors: {
            background: "hsl(350, 45%, 94%)",
            shadowLight: "hsl(350, 50%, 98%)",
            shadowDark: "hsl(350, 38%, 82%)",
        },
    },
    {
        name: "Blush",
        colors: {
            background: "hsl(340, 42%, 93%)",
            shadowLight: "hsl(340, 48%, 98%)",
            shadowDark: "hsl(340, 35%, 80%)",
        },
    },
    {
        name: "Peach",
        colors: {
            background: "hsl(25, 55%, 93%)",
            shadowLight: "hsl(25, 60%, 98%)",
            shadowDark: "hsl(25, 48%, 80%)",
        },
    },
    {
        name: "Coral",
        colors: {
            background: "hsl(15, 52%, 92%)",
            shadowLight: "hsl(15, 58%, 97%)",
            shadowDark: "hsl(15, 45%, 78%)",
        },
    },
    {
        name: "Apricot",
        colors: {
            background: "hsl(35, 50%, 92%)",
            shadowLight: "hsl(35, 55%, 97%)",
            shadowDark: "hsl(35, 43%, 78%)",
        },
    },

    // Pastel Cool Tones - More vibrant yet soft
    {
        name: "Mint",
        colors: {
            background: "hsl(150, 45%, 91%)",
            shadowLight: "hsl(150, 50%, 97%)",
            shadowDark: "hsl(150, 38%, 77%)",
        },
    },
    {
        name: "Sage",
        colors: {
            background: "hsl(130, 35%, 90%)",
            shadowLight: "hsl(130, 40%, 96%)",
            shadowDark: "hsl(130, 30%, 76%)",
        },
    },
    {
        name: "Sky",
        colors: {
            background: "hsl(205, 50%, 91%)",
            shadowLight: "hsl(205, 55%, 97%)",
            shadowDark: "hsl(205, 43%, 77%)",
        },
    },
    {
        name: "Sapphire",
        colors: {
            background: "hsl(210, 48%, 92%)",
            shadowLight: "hsl(210, 54%, 97%)",
            shadowDark: "hsl(210, 40%, 78%)",
        },
    },
    {
        name: "Periwinkle",
        colors: {
            background: "hsl(220, 45%, 92%)",
            shadowLight: "hsl(220, 50%, 97%)",
            shadowDark: "hsl(220, 38%, 78%)",
        },
    },

    // Pastel Purple Spectrum - Enhanced variety
    {
        name: "Lavender",
        colors: {
            background: "hsl(260, 40%, 93%)",
            shadowLight: "hsl(260, 45%, 98%)",
            shadowDark: "hsl(260, 33%, 80%)",
        },
    },
    {
        name: "Lilac",
        colors: {
            background: "hsl(270, 38%, 92%)",
            shadowLight: "hsl(270, 43%, 97%)",
            shadowDark: "hsl(270, 32%, 78%)",
        },
    },
    {
        name: "Violet",
        colors: {
            background: "hsl(280, 42%, 93%)",
            shadowLight: "hsl(280, 48%, 98%)",
            shadowDark: "hsl(280, 35%, 80%)",
        },
    },
    {
        name: "Orchid",
        colors: {
            background: "hsl(290, 40%, 92%)",
            shadowLight: "hsl(290, 45%, 97%)",
            shadowDark: "hsl(290, 33%, 78%)",
        },
    },

    // Bonus Pastels - Unique options
    {
        name: "Lemon",
        colors: {
            background: "hsl(55, 48%, 92%)",
            shadowLight: "hsl(55, 54%, 97%)",
            shadowDark: "hsl(55, 40%, 78%)",
        },
    },
    {
        name: "Pistachio",
        colors: {
            background: "hsl(85, 40%, 90%)",
            shadowLight: "hsl(85, 45%, 96%)",
            shadowDark: "hsl(85, 33%, 76%)",
        },
    },
    {
        name: "Aqua",
        colors: {
            background: "hsl(180, 45%, 90%)",
            shadowLight: "hsl(180, 50%, 96%)",
            shadowDark: "hsl(180, 38%, 76%)",
        },
    },

    {
        name: "Graphite",
        colors: {
            background: "hsl(210, 10%, 20%)",
            shadowLight: "hsl(210, 12%, 30%)",
            shadowDark: "hsl(210, 14%, 12%)",
        },
    },
    {
        name: "Ink",
        colors: {
            background: "hsl(225, 18%, 16%)",
            shadowLight: "hsl(225, 20%, 26%)",
            shadowDark: "hsl(225, 22%, 8%)",
        },
    },
    {
        name: "Storm",
        colors: {
            background: "hsl(200, 12%, 24%)",
            shadowLight: "hsl(200, 14%, 34%)",
            shadowDark: "hsl(200, 16%, 14%)",
        },
    },

    // Dark Powdery Warm Tones - Muted and sophisticated
    {
        name: "Dusty Rose",
        colors: {
            background: "hsl(350, 20%, 28%)",
            shadowLight: "hsl(350, 22%, 38%)",
            shadowDark: "hsl(350, 24%, 18%)",
        },
    },
    {
        name: "Mulberry",
        colors: {
            background: "hsl(340, 18%, 26%)",
            shadowLight: "hsl(340, 20%, 36%)",
            shadowDark: "hsl(340, 22%, 16%)",
        },
    },
    {
        name: "Terracotta",
        colors: {
            background: "hsl(15, 22%, 25%)",
            shadowLight: "hsl(15, 24%, 35%)",
            shadowDark: "hsl(15, 26%, 15%)",
        },
    },
    {
        name: "Rust",
        colors: {
            background: "hsl(25, 24%, 24%)",
            shadowLight: "hsl(25, 26%, 34%)",
            shadowDark: "hsl(25, 28%, 14%)",
        },
    },
    {
        name: "Clay",
        colors: {
            background: "hsl(30, 20%, 27%)",
            shadowLight: "hsl(30, 22%, 37%)",
            shadowDark: "hsl(30, 24%, 17%)",
        },
    },

    // Dark Powdery Cool Tones - Moody and elegant
    {
        name: "Moss",
        colors: {
            background: "hsl(130, 16%, 24%)",
            shadowLight: "hsl(130, 18%, 34%)",
            shadowDark: "hsl(130, 20%, 14%)",
        },
    },
    {
        name: "Forest",
        colors: {
            background: "hsl(150, 18%, 22%)",
            shadowLight: "hsl(150, 20%, 32%)",
            shadowDark: "hsl(150, 22%, 12%)",
        },
    },
    {
        name: "Teal",
        colors: {
            background: "hsl(180, 20%, 25%)",
            shadowLight: "hsl(180, 22%, 35%)",
            shadowDark: "hsl(180, 24%, 15%)",
        },
    },
    {
        name: "Ocean",
        colors: {
            background: "hsl(200, 24%, 23%)",
            shadowLight: "hsl(200, 26%, 33%)",
            shadowDark: "hsl(200, 28%, 13%)",
        },
    },
    {
        name: "Denim",
        colors: {
            background: "hsl(210, 22%, 26%)",
            shadowLight: "hsl(210, 24%, 36%)",
            shadowDark: "hsl(210, 26%, 16%)",
        },
    },
    {
        name: "Steel",
        colors: {
            background: "hsl(205, 14%, 28%)",
            shadowLight: "hsl(205, 16%, 38%)",
            shadowDark: "hsl(205, 18%, 18%)",
        },
    },
    {
        name: "Plum",
        colors: {
            background: "hsl(280, 20%, 25%)",
            shadowLight: "hsl(280, 22%, 35%)",
            shadowDark: "hsl(280, 24%, 15%)",
        },
    },
    {
        name: "Eggplant",
        colors: {
            background: "hsl(270, 22%, 23%)",
            shadowLight: "hsl(270, 24%, 33%)",
            shadowDark: "hsl(270, 26%, 13%)",
        },
    },
    {
        name: "Mauve",
        colors: {
            background: "hsl(300, 18%, 27%)",
            shadowLight: "hsl(300, 20%, 37%)",
            shadowDark: "hsl(300, 22%, 17%)",
        },
    },
    {
        name: "Grape",
        colors: {
            background: "hsl(260, 24%, 24%)",
            shadowLight: "hsl(260, 26%, 34%)",
            shadowDark: "hsl(260, 28%, 14%)",
        },
    },
    {
        name: "Velvet",
        colors: {
            background: "hsl(290, 20%, 26%)",
            shadowLight: "hsl(290, 22%, 36%)",
            shadowDark: "hsl(290, 24%, 16%)",
        },
    },

    // Pastel Warm Tones - Softer, more sophisticated
    {
        name: "Rose",
        colors: {
            background: "hsl(350, 45%, 94%)",
            shadowLight: "hsl(350, 50%, 98%)",
            shadowDark: "hsl(350, 38%, 82%)",
        },
    },
    {
        name: "Blush",
        colors: {
            background: "hsl(340, 42%, 93%)",
            shadowLight: "hsl(340, 48%, 98%)",
            shadowDark: "hsl(340, 35%, 80%)",
        },
    },
    {
        name: "Peach",
        colors: {
            background: "hsl(25, 55%, 93%)",
            shadowLight: "hsl(25, 60%, 98%)",
            shadowDark: "hsl(25, 48%, 80%)",
        },
    },
    {
        name: "Coral",
        colors: {
            background: "hsl(15, 52%, 92%)",
            shadowLight: "hsl(15, 58%, 97%)",
            shadowDark: "hsl(15, 45%, 78%)",
        },
    },
    {
        name: "Apricot",
        colors: {
            background: "hsl(35, 50%, 92%)",
            shadowLight: "hsl(35, 55%, 97%)",
            shadowDark: "hsl(35, 43%, 78%)",
        },
    },

    // Pastel Cool Tones - More vibrant yet soft
    {
        name: "Mint",
        colors: {
            background: "hsl(150, 45%, 91%)",
            shadowLight: "hsl(150, 50%, 97%)",
            shadowDark: "hsl(150, 38%, 77%)",
        },
    },
    {
        name: "Sage",
        colors: {
            background: "hsl(130, 35%, 90%)",
            shadowLight: "hsl(130, 40%, 96%)",
            shadowDark: "hsl(130, 30%, 76%)",
        },
    },
    {
        name: "Sky",
        colors: {
            background: "hsl(205, 50%, 91%)",
            shadowLight: "hsl(205, 55%, 97%)",
            shadowDark: "hsl(205, 43%, 77%)",
        },
    },
    {
        name: "Sapphire",
        colors: {
            background: "hsl(210, 48%, 92%)",
            shadowLight: "hsl(210, 54%, 97%)",
            shadowDark: "hsl(210, 40%, 78%)",
        },
    },
    {
        name: "Periwinkle",
        colors: {
            background: "hsl(220, 45%, 92%)",
            shadowLight: "hsl(220, 50%, 97%)",
            shadowDark: "hsl(220, 38%, 78%)",
        },
    },

    // Pastel Purple Spectrum - Enhanced variety
    {
        name: "Lavender",
        colors: {
            background: "hsl(260, 40%, 93%)",
            shadowLight: "hsl(260, 45%, 98%)",
            shadowDark: "hsl(260, 33%, 80%)",
        },
    },
    {
        name: "Lilac",
        colors: {
            background: "hsl(270, 38%, 92%)",
            shadowLight: "hsl(270, 43%, 97%)",
            shadowDark: "hsl(270, 32%, 78%)",
        },
    },
    {
        name: "Violet",
        colors: {
            background: "hsl(280, 42%, 93%)",
            shadowLight: "hsl(280, 48%, 98%)",
            shadowDark: "hsl(280, 35%, 80%)",
        },
    },
    {
        name: "Orchid",
        colors: {
            background: "hsl(290, 40%, 92%)",
            shadowLight: "hsl(290, 45%, 97%)",
            shadowDark: "hsl(290, 33%, 78%)",
        },
    },

    // Bonus Pastels - Unique options
    {
        name: "Lemon",
        colors: {
            background: "hsl(55, 48%, 92%)",
            shadowLight: "hsl(55, 54%, 97%)",
            shadowDark: "hsl(55, 40%, 78%)",
        },
    },
    {
        name: "Pistachio",
        colors: {
            background: "hsl(85, 40%, 90%)",
            shadowLight: "hsl(85, 45%, 96%)",
            shadowDark: "hsl(85, 33%, 76%)",
        },
    },
    {
        name: "Aqua",
        colors: {
            background: "hsl(180, 45%, 90%)",
            shadowLight: "hsl(180, 50%, 96%)",
            shadowDark: "hsl(180, 38%, 76%)",
        },
    },
];

export default NEUMORPHIC_PRESETS;
/**
 * Generate box-shadow based on convex/inset toggle states
 */
function getBoxShadow(
    preset: typeof NEUMORPHIC_PRESETS[number],
    isConvex: boolean,
    isInset: boolean,
): string {
    const { shadowLight, shadowDark } = preset.colors
    const insetPrefix = isInset ? 'inset ' : ''

    // Convex (raised) uses light top-left, dark bottom-right
    // Concave (sunken) reverses this
    return isConvex ? `${insetPrefix}-8px -8px 16px ${shadowLight}, ${insetPrefix}8px 8px 16px ${shadowDark}` : `${insetPrefix}8px 8px 16px ${shadowLight}, ${insetPrefix}-8px -8px 16px ${shadowDark}`
}

/**
 * Apply preset colors to theme variables
 */
function applyPresetToTheme(
    preset: typeof NEUMORPHIC_PRESETS[number],
    mode: 'light' | 'dark',
    isConvex: boolean,
    isInset: boolean,
    setOverride: (mode: 'light' | 'dark', variable: string, value: string) => void,
) {
    const { background, shadowLight, shadowDark } = preset.colors
    const insetPrefix = isInset ? 'inset ' : ''

    // Helper to generate shadow strings
    const getShadow = (xLight: number, yLight: number, blurLight: number, xDark: number, yDark: number, blurDark: number) => {
        return isConvex ? `${insetPrefix}${xLight}px ${yLight}px ${blurLight}px ${shadowLight}, ${insetPrefix}${xDark}px ${yDark}px ${blurDark}px ${shadowDark}` : `${insetPrefix}${xDark}px ${yDark}px ${blurDark}px ${shadowLight}, ${insetPrefix}${xLight}px ${yLight}px ${blurLight}px ${shadowDark}`
    }

    // Apply background colors
    setOverride(mode, '--background', background)
    setOverride(mode, '--card', background)
    setOverride(mode, '--input', background)
    setOverride(mode, '--secondary', background)
    setOverride(mode, '--popover', background)
    setOverride(mode, '--sidebar', background)
    setOverride(mode, '--neu-surface-raised', background)

    // Apply neumorphic shadows
    setOverride(mode, '--neu-shadow-extruded', getShadow(-9, -9, 16, 9, 9, 16))
    setOverride(mode, '--neu-shadow-extruded-hover', getShadow(-12, -12, 20, 12, 12, 20))
    setOverride(mode, '--neu-shadow-extruded-sm', getShadow(-5, -5, 10, 5, 5, 10))
    setOverride(mode, '--neu-shadow-button', getShadow(-12, -12, 24, 12, 12, 24))
    setOverride(mode, '--neu-shadow-button-hover', getShadow(-16, -16, 30, 16, 16, 30))
    setOverride(mode, '--neu-shadow-card', getShadow(-18, -18, 36, 18, 18, 36))
    setOverride(mode, '--neu-shadow-card-hover', getShadow(-24, -24, 44, 24, 24, 44))
    setOverride(mode, '--neu-shadow-frame', getShadow(-22, -22, 46, 22, 22, 46))

    // Apply standard shadows
    setOverride(mode, '--shadow', getShadow(-9, -9, 16, 9, 9, 16))
    setOverride(mode, '--shadow-sm', getShadow(-5, -5, 10, 5, 5, 10))
    setOverride(mode, '--shadow-md', getShadow(-12, -12, 20, 12, 12, 20))
    setOverride(mode, '--shadow-2xl', getShadow(-14, -14, 28, 14, 14, 28))

    // Inset shadows (when not using inset toggle, these remain inset by nature)
    const insetShadow = (xLight: number, yLight: number, blurLight: number, xDark: number, yDark: number, blurDark: number) => {
        return isConvex ? `inset ${xDark}px ${yDark}px ${blurDark}px ${shadowDark}, inset ${xLight}px ${yLight}px ${blurLight}px ${shadowLight}` : `inset ${xLight}px ${yLight}px ${blurLight}px ${shadowDark}, inset ${xDark}px ${yDark}px ${blurDark}px ${shadowLight}`
    }

    setOverride(mode, '--neu-shadow-inset', insetShadow(-6, -6, 10, 6, 6, 10))
    setOverride(mode, '--neu-shadow-inset-deep', insetShadow(-10, -10, 20, 10, 10, 20))
    setOverride(mode, '--neu-shadow-inset-sm', insetShadow(-3, -3, 6, 3, 3, 6))
    setOverride(mode, '--shadow-xs', insetShadow(-3, -3, 6, 3, 3, 6))
    setOverride(mode, '--shadow-lg', insetShadow(-6, -6, 10, 6, 6, 10))
    setOverride(mode, '--shadow-xl', insetShadow(-10, -10, 20, 10, 10, 20))
    setOverride(mode, '--shadow-2xs', getShadow(-5, -5, 10, 5, 5, 10))
}

interface NeumorphicPresetsProps {
    activeMode: 'light' | 'dark'
}

export function NeumorphicPresets({ activeMode }: NeumorphicPresetsProps) {
    const { setOverride, overrides, currentPreset } = useThemeCustomization()
    const [selectedPreset, setSelectedPreset] = useState<typeof NEUMORPHIC_PRESETS[number] | null>(null)
    const [isConvex, setIsConvex] = useState(true) // true = raised/convex, false = sunken/concave
    const [isInset, setIsInset] = useState(true) // true = inner shadow, false = outer shadow

    // Cleanup neumorphic-specific overrides when switching away from neumorphism preset
    useEffect(() => {
        if (currentPreset !== 'neumorphism') {
            // Remove neumorphic-specific variables from overrides
            const hasNeumorphicOverrides = ['light', 'dark'].some((mode) =>
                NEUMORPHIC_VARIABLES.some((variable) => overrides[mode as 'light' | 'dark'][variable])
            )

            if (hasNeumorphicOverrides) {
                // Clear neumorphic variables by setting them to empty string
                // This will cause them to fall back to preset defaults
                NEUMORPHIC_VARIABLES.forEach((variable) => {
                    const lightOverride = overrides.light[variable]
                    const darkOverride = overrides.dark[variable]

                    if (lightOverride) {
                        // Note: We can't remove overrides, but setting to empty or removing from storage
                        // will happen via theme context cleanup
                    }
                    if (darkOverride) {
                        // Same for dark mode
                    }
                })

                // Reset selection state
                setSelectedPreset(null)
            }
        }
    }, [currentPreset, overrides])

    const handlePresetClick = (preset: typeof NEUMORPHIC_PRESETS[number]) => {
        setSelectedPreset(preset)
        applyPresetToTheme(preset, activeMode, isConvex, isInset, setOverride)
    }

    const handleConvexChange = (checked: boolean) => {
        setIsConvex(checked)
        if (selectedPreset) {
            applyPresetToTheme(selectedPreset, activeMode, checked, isInset, setOverride)
        }
    }

    const handleInsetChange = (checked: boolean) => {
        setIsInset(checked)
        if (selectedPreset) {
            applyPresetToTheme(selectedPreset, activeMode, isConvex, checked, setOverride)
        }
    }

    // Re-apply preset when activeMode changes
    useEffect(() => {
        if (selectedPreset) {
            applyPresetToTheme(selectedPreset, activeMode, isConvex, isInset, setOverride)
        }
    }, [activeMode, selectedPreset, isConvex, isInset, setOverride])

    return (
        <div className="space-y-4">
            {/* Preset Grid */}
            <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                    Color Presets
                </Label>
                <div className="grid grid-cols-3 gap-2">
                    {NEUMORPHIC_PRESETS.map((preset) => (
                        <Badge
                            variant={"outline"}
                            key={preset.name}
                            onClick={() => handlePresetClick(preset)}
                            className="group relative flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-muted transition"
                            title={preset.name}
                        >
                            <div
                                className="w-12 h-12 rounded-full"
                                style={{
                                    backgroundColor: preset.colors.background,
                                }}
                            />
                            <span className="text-xs font-medium">{preset.name}</span>
                        </Badge>
                    ))}
                </div>
            </div>

            {/* Style Toggles */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label htmlFor="convex-toggle" className="text-sm font-medium">
                            Convex
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            {isConvex ? 'Raised surface' : 'Sunken surface'}
                        </p>
                    </div>
                    <Switch
                        id="convex-toggle"
                        checked={isConvex}
                        onCheckedChange={handleConvexChange}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label htmlFor="inset-toggle" className="text-sm font-medium">
                            Inset
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            {isInset ? 'Inner shadow' : 'Outer shadow'}
                        </p>
                    </div>
                    <Switch
                        id="inset-toggle"
                        checked={isInset}
                        onCheckedChange={handleInsetChange}
                    />
                </div>
            </div>

            {/* Live Preview */}
            <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                    Preview
                </Label>
                <div className="flex items-center justify-center p-8 bg-muted rounded-lg">
                    <div
                        className="w-24 h-24 rounded-full"
                        style={{
                            backgroundColor: (selectedPreset ?? NEUMORPHIC_PRESETS[0]).colors.background,
                            boxShadow: getBoxShadow(
                                selectedPreset ?? NEUMORPHIC_PRESETS[0],
                                isConvex,
                                isInset,
                            ),
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
