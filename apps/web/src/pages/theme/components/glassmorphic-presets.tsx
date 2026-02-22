import { useEffect, useState } from "react";
import { Label } from "@workspace/ui/components/ui/label";
import { Slider } from "@workspace/ui/components/ui/slider";
import { useThemeCustomization } from "@/themes/context";
import { Badge } from "@workspace/ui/components/ui/badge";

const GLASSMORPHIC_VARIABLES = [
  "--glass-opacity",
  "--glass-blur",
  "--glass-border-opacity"
];

const GLASSMORPHIC_PRESETS = [
  {
    name: "Frost",
    opacity: 0.7,
    blur: 16,
    border: 0.2
  },
  {
    name: "Mist",
    opacity: 0.4,
    blur: 24,
    border: 0.1
  },
  {
    name: "Obsidian",
    opacity: 0.85,
    blur: 8,
    border: 0.3
  },
  {
    name: "Clear",
    opacity: 0.2,
    blur: 40,
    border: 0.05
  },
  {
    name: "Heavy",
    opacity: 0.9,
    blur: 4,
    border: 0.4
  }
];

interface GlassmorphicPresetsProps {
  activeMode: "light" | "dark";
}

export function GlassmorphicPresets({ activeMode }: GlassmorphicPresetsProps) {
  const { setOverride, overrides, currentPreset, removeOverrides } = useThemeCustomization();
  
  const [selectedPreset, setSelectedPreset] = useState<(typeof GLASSMORPHIC_PRESETS)[number] | null>(null);
  const [opacity, setOpacity] = useState(0.7);
  const [blur, setBlur] = useState(16);
  const [border, setBorder] = useState(0.2);

  // Cleanup glassmorphic-specific overrides when switching away from glassmorphism preset
  useEffect(() => {
    if (currentPreset !== "glassmorphism") {
      const hasOverrides = (["light", "dark"] as const).some((mode) =>
        GLASSMORPHIC_VARIABLES.some((variable) => overrides[mode][variable]),
      );

      if (hasOverrides) {
        removeOverrides("light", GLASSMORPHIC_VARIABLES);
        removeOverrides("dark", GLASSMORPHIC_VARIABLES);
        setSelectedPreset(null);
      }
    }
  }, [currentPreset, overrides, removeOverrides]);

  // Sync internal state with active overrides on mount or mode change
  useEffect(() => {
    if (currentPreset !== "glassmorphism") return;

    const op = overrides[activeMode]["--glass-opacity"];
    const bl = overrides[activeMode]["--glass-blur"];
    const bo = overrides[activeMode]["--glass-border-opacity"];

    if (op) setOpacity(parseFloat(op));
    if (bl) setBlur(parseFloat(bl));
    if (bo) setBorder(parseFloat(bo));
  }, [activeMode, currentPreset, overrides]);

  const applyEffect = (newOpacity: number, newBlur: number, newBorder: number) => {
    setOverride(activeMode, "--glass-opacity", newOpacity.toString());
    setOverride(activeMode, "--glass-blur", `${newBlur}px`);
    setOverride(activeMode, "--glass-border-opacity", newBorder.toString());

    // Check if it matches a preset
    const matchingPreset = GLASSMORPHIC_PRESETS.find(
      (p) => p.opacity === newOpacity && p.blur === newBlur && p.border === newBorder
    );
    setSelectedPreset(matchingPreset || null);
  };

  const handlePresetClick = (preset: (typeof GLASSMORPHIC_PRESETS)[number]) => {
    setOpacity(preset.opacity);
    setBlur(preset.blur);
    setBorder(preset.border);
    setSelectedPreset(preset);
    applyEffect(preset.opacity, preset.blur, preset.border);
  };

  const handleOpacityChange = (value: number[]) => {
    const val = value[0];
    setOpacity(val);
    applyEffect(val, blur, border);
  };

  const handleBlurChange = (value: number[]) => {
    const val = value[0];
    setBlur(val);
    applyEffect(opacity, val, border);
  };

  const handleBorderChange = (value: number[]) => {
    const val = value[0];
    setBorder(val);
    applyEffect(opacity, blur, val);
  };

  if (currentPreset !== "glassmorphism") {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground flex justify-between">
          <span>Glass Effect Presets</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {GLASSMORPHIC_PRESETS.map((preset) => (
            <Badge
              key={preset.name}
              variant={selectedPreset?.name === preset.name ? "default" : "outline"}
              className="cursor-pointer hover:scale-105 transition-transform"
              onClick={() => handlePresetClick(preset)}
            >
              {preset.name}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label className="text-xs">Surface Opacity</Label>
            <span className="text-xs text-muted-foreground">{opacity.toFixed(2)}</span>
          </div>
          <Slider
            value={[opacity]}
            min={0.1}
            max={0.95}
            step={0.05}
            onValueChange={handleOpacityChange}
          />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between">
            <Label className="text-xs">Blur Intensity</Label>
            <span className="text-xs text-muted-foreground">{blur}px</span>
          </div>
          <Slider
            value={[blur]}
            min={0}
            max={64}
            step={2}
            onValueChange={handleBlurChange}
          />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between">
            <Label className="text-xs">Edge Highlight Opacity</Label>
            <span className="text-xs text-muted-foreground">{border.toFixed(2)}</span>
          </div>
          <Slider
            value={[border]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={handleBorderChange}
          />
        </div>
      </div>
    </div>
  );
}
