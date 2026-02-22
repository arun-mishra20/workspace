/**
 * Glassmorphic Presets Component
 *
 * Provides tint-color presets and adjustable controls specifically for the
 * glassmorphism theme. Only displays when the glassmorphism preset is active.
 *
 * Inspired by Apple's Liquid Glass design language:
 *   - translucent tinted surfaces
 *   - backdrop-filter blur + saturate
 *   - thin luminous borders
 *   - specular highlight edges
 */

import { useEffect, useState } from "react";
import { Label } from "@workspace/ui/components/ui/label";
import { Switch } from "@workspace/ui/components/ui/switch";
import { Slider } from "@workspace/ui/components/ui/slider";
import { useThemeCustomization } from "@/themes/context";
import { Badge } from "@workspace/ui/components/ui/badge";

// ── Glass-specific CSS variables that must be cleaned up ───────────
const GLASSMORPHIC_VARIABLES = [
  "--glass-blur",
  "--glass-surface-opacity",
  "--glass-saturation",
  "--glass-border-opacity",
  "--glass-border-radius",
  "--glass-tint",
  "--glass-shadow",
  "--glass-highlight",
  "--glass-noise-opacity",
  "--glass-specular",
];

// Standard shadow overrides that the glass preset also sets
const GLASSMORPHIC_SHADOW_OVERRIDES = [
  "--shadow",
  "--shadow-sm",
  "--shadow-md",
  "--shadow-lg",
  "--shadow-xl",
  "--shadow-2xl",
  "--shadow-xs",
  "--shadow-2xs",
];

const GLASSMORPHIC_COLOR_OVERRIDES = [
  "--background",
  "--card",
  "--input",
  "--secondary",
  "--popover",
  "--sidebar",
];

// All variables set by glassmorphic preset toggling
const ALL_GLASSMORPHIC_OVERRIDES = [
  ...GLASSMORPHIC_VARIABLES,
  ...GLASSMORPHIC_SHADOW_OVERRIDES,
  ...GLASSMORPHIC_COLOR_OVERRIDES,
];

// ── Tint presets ───────────────────────────────────────────────────
const GLASSMORPHIC_PRESETS = [
  // Neutrals
  {
    name: "Crystal",
    tint: "255, 255, 255",
    background: { light: "#f0f4f8", dark: "#0f172a" },
    accent: "#e2e8f0",
  },
  {
    name: "Frosted",
    tint: "241, 245, 249",
    background: { light: "#f8fafc", dark: "#0f172a" },
    accent: "#f1f5f9",
  },
  {
    name: "Smoke",
    tint: "148, 163, 184",
    background: { light: "#e2e8f0", dark: "#0f172a" },
    accent: "#94a3b8",
  },

  // Cool Tones
  {
    name: "Arctic",
    tint: "186, 230, 253",
    background: { light: "#e0f2fe", dark: "#0c1929" },
    accent: "#7dd3fc",
  },
  {
    name: "Sapphire",
    tint: "147, 197, 253",
    background: { light: "#dbeafe", dark: "#0c1a36" },
    accent: "#60a5fa",
  },
  {
    name: "Ocean",
    tint: "125, 211, 252",
    background: { light: "#e0f2fe", dark: "#082f49" },
    accent: "#38bdf8",
  },
  {
    name: "Teal",
    tint: "153, 246, 228",
    background: { light: "#ccfbf1", dark: "#042f2e" },
    accent: "#2dd4bf",
  },

  // Warm Tones
  {
    name: "Rose Quartz",
    tint: "251, 207, 232",
    background: { light: "#fce7f3", dark: "#1f0a18" },
    accent: "#f9a8d4",
  },
  {
    name: "Blush",
    tint: "253, 164, 175",
    background: { light: "#fff1f2", dark: "#1c0a0e" },
    accent: "#fb7185",
  },
  {
    name: "Peach",
    tint: "253, 186, 116",
    background: { light: "#fff7ed", dark: "#1c1004" },
    accent: "#fb923c",
  },
  {
    name: "Amber",
    tint: "252, 211, 77",
    background: { light: "#fefce8", dark: "#1a1504" },
    accent: "#fbbf24",
  },

  // Purple Spectrum
  {
    name: "Lavender",
    tint: "196, 181, 253",
    background: { light: "#ede9fe", dark: "#120e24" },
    accent: "#a78bfa",
  },
  {
    name: "Iris",
    tint: "165, 180, 252",
    background: { light: "#eef2ff", dark: "#0e1130" },
    accent: "#818cf8",
  },
  {
    name: "Wisteria",
    tint: "217, 180, 254",
    background: { light: "#faf5ff", dark: "#180e28" },
    accent: "#c084fc",
  },

  // Greens
  {
    name: "Mint",
    tint: "167, 243, 208",
    background: { light: "#ecfdf5", dark: "#022c22" },
    accent: "#6ee7b7",
  },
  {
    name: "Emerald",
    tint: "110, 231, 183",
    background: { light: "#d1fae5", dark: "#052e16" },
    accent: "#34d399",
  },

  // Dark glass specialties
  {
    name: "Obsidian",
    tint: "30, 41, 59",
    background: { light: "#334155", dark: "#020617" },
    accent: "#1e293b",
  },
  {
    name: "Onyx",
    tint: "15, 23, 42",
    background: { light: "#1e293b", dark: "#020617" },
    accent: "#0f172a",
  },
  {
    name: "Midnight",
    tint: "30, 58, 138",
    background: { light: "#1e3a8a", dark: "#020833" },
    accent: "#1e40af",
  },
];

// ── Apply a glass tint preset to theme overrides ──────────────────

function applyGlassPresetToTheme(
  preset: (typeof GLASSMORPHIC_PRESETS)[number],
  mode: "light" | "dark",
  setOverride: (mode: "light" | "dark", key: string, value: string) => void,
  blurIntensity: number,
  surfaceOpacity: number,
  saturation: number,
  borderOpacity: number,
  noiseOpacity: number,
  specularEnabled: boolean,
) {
  const bg =
    mode === "light" ? preset.background.light : preset.background.dark;

  // Apply background colors — glass needs a consistent base behind the blur
  setOverride(mode, "--background", bg);
  setOverride(mode, "--card", bg);
  setOverride(mode, "--input", bg);
  setOverride(mode, "--secondary", bg);
  setOverride(mode, "--popover", bg);
  setOverride(mode, "--sidebar", bg);

  // Apply glass-specific variables
  setOverride(mode, "--glass-tint", preset.tint);
  setOverride(mode, "--glass-blur", `${blurIntensity}px`);
  setOverride(mode, "--glass-surface-opacity", surfaceOpacity.toString());
  setOverride(mode, "--glass-saturation", saturation.toString());
  setOverride(mode, "--glass-border-opacity", borderOpacity.toString());
  setOverride(mode, "--glass-noise-opacity", noiseOpacity.toString());
  setOverride(mode, "--glass-specular", specularEnabled ? "1" : "0");

  // Compute shadow intensity based on mode
  const shadowAlpha = mode === "light" ? 0.08 : 0.36;
  setOverride(
    mode,
    "--glass-shadow",
    `0 8px 32px rgba(0, 0, 0, ${shadowAlpha})`,
  );

  // Highlight edge strength
  const highlightAlpha = mode === "light" ? 0.35 : 0.12;
  setOverride(
    mode,
    "--glass-highlight",
    specularEnabled
      ? `inset 0 1px 0 rgba(255, 255, 255, ${highlightAlpha})`
      : "none",
  );

  // Standard shadow overrides (soft, diffuse — glass style)
  const baseAlpha = mode === "light" ? 0.06 : 0.2;
  setOverride(
    mode,
    "--shadow-2xs",
    `0 1px 2px rgba(0, 0, 0, ${(baseAlpha * 0.6).toFixed(3)})`,
  );
  setOverride(
    mode,
    "--shadow-xs",
    `0 1px 3px rgba(0, 0, 0, ${baseAlpha.toFixed(3)})`,
  );
  setOverride(
    mode,
    "--shadow-sm",
    `0 2px 8px rgba(0, 0, 0, ${baseAlpha.toFixed(3)})`,
  );
  setOverride(
    mode,
    "--shadow",
    `0 4px 16px rgba(0, 0, 0, ${baseAlpha.toFixed(3)})`,
  );
  setOverride(
    mode,
    "--shadow-md",
    `0 8px 32px rgba(0, 0, 0, ${(baseAlpha * 1.3).toFixed(3)})`,
  );
  setOverride(
    mode,
    "--shadow-lg",
    `0 12px 40px rgba(0, 0, 0, ${(baseAlpha * 1.7).toFixed(3)})`,
  );
  setOverride(
    mode,
    "--shadow-xl",
    `0 16px 48px rgba(0, 0, 0, ${(baseAlpha * 2).toFixed(3)})`,
  );
  setOverride(
    mode,
    "--shadow-2xl",
    `0 24px 64px rgba(0, 0, 0, ${(baseAlpha * 2.7).toFixed(3)})`,
  );
}

// ── Component ─────────────────────────────────────────────────────

interface GlassmorphicPresetsProps {
  activeMode: "light" | "dark";
}

export function GlassmorphicPresets({ activeMode }: GlassmorphicPresetsProps) {
  const { setOverride, overrides, currentPreset, removeOverrides } =
    useThemeCustomization();

  const [selectedPreset, setSelectedPreset] = useState<
    (typeof GLASSMORPHIC_PRESETS)[number] | null
  >(null);

  // Adjustable parameters
  const [blurIntensity, setBlurIntensity] = useState(16); // px, 4–40
  const [surfaceOpacity, setSurfaceOpacity] = useState(0.45); // 0.1–0.8
  const [saturation, setSaturation] = useState(1.8); // 1.0–3.0
  const [borderOpacity, setBorderOpacity] = useState(0.25); // 0.0–0.5
  const [noiseOpacity, setNoiseOpacity] = useState(0.03); // 0.0–0.1
  const [specularEnabled, setSpecularEnabled] = useState(true);

  // ── Cleanup on preset switch ──────────────────────────────────
  useEffect(() => {
    if (currentPreset !== "glassmorphism") {
      const hasGlassmorphicOverrides = (["light", "dark"] as const).some(
        (mode) =>
          ALL_GLASSMORPHIC_OVERRIDES.some(
            (variable) => overrides[mode][variable],
          ),
      );

      if (hasGlassmorphicOverrides) {
        removeOverrides("light", ALL_GLASSMORPHIC_OVERRIDES);
        removeOverrides("dark", ALL_GLASSMORPHIC_OVERRIDES);
        setSelectedPreset(null);
      }
    }
  }, [currentPreset, overrides, removeOverrides]);

  // ── Handlers ──────────────────────────────────────────────────
  const applyCurrentSettings = (
    preset: (typeof GLASSMORPHIC_PRESETS)[number],
    mode: "light" | "dark",
    blur = blurIntensity,
    opacity = surfaceOpacity,
    sat = saturation,
    border = borderOpacity,
    noise = noiseOpacity,
    specular = specularEnabled,
  ) => {
    applyGlassPresetToTheme(
      preset,
      mode,
      setOverride,
      blur,
      opacity,
      sat,
      border,
      noise,
      specular,
    );
  };

  const handlePresetClick = (preset: (typeof GLASSMORPHIC_PRESETS)[number]) => {
    setSelectedPreset(preset);
    applyCurrentSettings(preset, activeMode);
  };

  const handleBlurChange = (value: number[]) => {
    const blur = value[0];
    setBlurIntensity(blur);
    if (selectedPreset) {
      applyCurrentSettings(selectedPreset, activeMode, blur);
    }
  };

  const handleOpacityChange = (value: number[]) => {
    const opacity = value[0];
    setSurfaceOpacity(opacity);
    if (selectedPreset) {
      applyCurrentSettings(selectedPreset, activeMode, blurIntensity, opacity);
    }
  };

  const handleSaturationChange = (value: number[]) => {
    const sat = value[0];
    setSaturation(sat);
    if (selectedPreset) {
      applyCurrentSettings(
        selectedPreset,
        activeMode,
        blurIntensity,
        surfaceOpacity,
        sat,
      );
    }
  };

  const handleBorderOpacityChange = (value: number[]) => {
    const border = value[0];
    setBorderOpacity(border);
    if (selectedPreset) {
      applyCurrentSettings(
        selectedPreset,
        activeMode,
        blurIntensity,
        surfaceOpacity,
        saturation,
        border,
      );
    }
  };

  const handleNoiseChange = (value: number[]) => {
    const noise = value[0];
    setNoiseOpacity(noise);
    if (selectedPreset) {
      applyCurrentSettings(
        selectedPreset,
        activeMode,
        blurIntensity,
        surfaceOpacity,
        saturation,
        borderOpacity,
        noise,
      );
    }
  };

  const handleSpecularToggle = (checked: boolean) => {
    setSpecularEnabled(checked);
    if (selectedPreset) {
      applyCurrentSettings(
        selectedPreset,
        activeMode,
        blurIntensity,
        surfaceOpacity,
        saturation,
        borderOpacity,
        noiseOpacity,
        checked,
      );
    }
  };

  // Re-apply when activeMode changes
  useEffect(() => {
    if (selectedPreset) {
      applyCurrentSettings(selectedPreset, activeMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode]);

  return (
    <div className="space-y-4">
      {/* ── Tint Preset Grid ────────────────────────────────── */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">
          Glass Tint Presets
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {GLASSMORPHIC_PRESETS.map((preset) => (
            <Badge
              variant="outline"
              key={preset.name}
              onClick={() => handlePresetClick(preset)}
              className={`group relative flex flex-col items-center gap-2 p-4 pt-6 rounded-lg hover:bg-muted transition cursor-pointer ${
                selectedPreset?.name === preset.name
                  ? "ring-2 ring-primary ring-offset-1"
                  : ""
              }`}
              title={preset.name}
            >
              {/* Swatch showing tint color */}
              <div
                className="w-12 h-12 rounded-full relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, rgba(${preset.tint}, 0.6), rgba(${preset.tint}, 0.25))`,
                  border: "1px solid rgba(255,255,255,0.3)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  backdropFilter: "blur(8px)",
                }}
              >
                {/* Inner specular highlight */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 50%)",
                  }}
                />
              </div>
              <span className="text-xs font-medium">{preset.name}</span>
            </Badge>
          ))}
        </div>
      </div>

      {/* ── Adjustable Controls ─────────────────────────────── */}
      <div className="space-y-4">
        <Label className="text-xs text-muted-foreground block">
          Glass Controls
        </Label>

        {/* Blur Intensity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Blur Intensity</Label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {blurIntensity}px
            </span>
          </div>
          <Slider
            min={4}
            max={40}
            step={2}
            value={[blurIntensity]}
            onValueChange={handleBlurChange}
          />
          <p className="text-xs text-muted-foreground">
            Backdrop blur radius — higher values create a more frosted look
          </p>
        </div>

        {/* Surface Opacity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Glass Opacity</Label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {(surfaceOpacity * 100).toFixed(0)}%
            </span>
          </div>
          <Slider
            min={0.1}
            max={0.8}
            step={0.05}
            value={[surfaceOpacity]}
            onValueChange={handleOpacityChange}
          />
          <p className="text-xs text-muted-foreground">
            Transparency of glass surfaces — lower is more see-through
          </p>
        </div>

        {/* Backdrop Saturation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Backdrop Saturation</Label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {saturation.toFixed(1)}x
            </span>
          </div>
          <Slider
            min={1.0}
            max={3.0}
            step={0.1}
            value={[saturation]}
            onValueChange={handleSaturationChange}
          />
          <p className="text-xs text-muted-foreground">
            Color vibrancy behind the glass surface
          </p>
        </div>

        {/* Border Luminance */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Border Luminance</Label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {(borderOpacity * 100).toFixed(0)}%
            </span>
          </div>
          <Slider
            min={0}
            max={0.5}
            step={0.05}
            value={[borderOpacity]}
            onValueChange={handleBorderOpacityChange}
          />
          <p className="text-xs text-muted-foreground">
            Brightness of the thin glass edge border
          </p>
        </div>

        {/* Noise Texture */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Frosted Noise</Label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {(noiseOpacity * 100).toFixed(0)}%
            </span>
          </div>
          <Slider
            min={0}
            max={0.1}
            step={0.01}
            value={[noiseOpacity]}
            onValueChange={handleNoiseChange}
          />
          <p className="text-xs text-muted-foreground">
            Subtle grain texture overlay for a frosted effect
          </p>
        </div>
      </div>

      {/* ── Toggles ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="specular-toggle" className="text-sm font-medium">
              Specular Highlight
            </Label>
            <p className="text-xs text-muted-foreground">
              {specularEnabled
                ? "Top-edge light reflection active"
                : "No specular reflection"}
            </p>
          </div>
          <Switch
            id="specular-toggle"
            checked={specularEnabled}
            onCheckedChange={handleSpecularToggle}
          />
        </div>
      </div>

      {/* ── Live Preview ────────────────────────────────────── */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">
          Preview
        </Label>
        <div
          className="flex items-center justify-center p-8 rounded-lg relative overflow-hidden"
          style={{
            background:
              activeMode === "light"
                ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                : "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
          }}
        >
          {/* Glass card preview */}
          <div
            className="w-40 h-28 rounded-2xl relative overflow-hidden flex items-center justify-center"
            style={{
              background: `rgba(${
                (selectedPreset ?? GLASSMORPHIC_PRESETS[0]).tint
              }, ${surfaceOpacity})`,
              backdropFilter: `blur(${blurIntensity}px) saturate(${saturation})`,
              WebkitBackdropFilter: `blur(${blurIntensity}px) saturate(${saturation})`,
              border: `1px solid rgba(255, 255, 255, ${borderOpacity})`,
              boxShadow: `0 8px 32px rgba(0, 0, 0, ${
                activeMode === "light" ? 0.12 : 0.36
              })`,
            }}
          >
            {/* Specular overlay */}
            {specularEnabled && (
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 40%)",
                }}
              />
            )}
            <span
              className="text-xs font-medium relative z-10"
              style={{
                color: activeMode === "light" ? "#1e293b" : "#f1f5f9",
              }}
            >
              Liquid Glass
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
