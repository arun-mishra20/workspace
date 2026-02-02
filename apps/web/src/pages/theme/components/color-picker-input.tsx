/**
 * Color Picker Input Component
 *
 * Combines text input with color picker for CSS color values.
 * Supports oklch and hsl formats with automatic conversion.
 */

import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { useEffect, useState } from "react";

interface ColorPickerInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  variableName: string;
}

/**
 * Parse oklch/hsl color to hex for color picker
 */
function parseColorToHex(value: string): string | null {
  // For now, we'll use a simple approach - extract numeric values
  // and create an approximate hex color

  // Check if it's an oklch color
  const oklchMatch = value.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
  if (oklchMatch) {
    const [, l, _c, _h] = oklchMatch;
    // Convert oklch to approximate RGB (simplified)
    // For a proper implementation, you'd use a color conversion library
    const lightness = parseFloat(l) * 100;
    const gray = Math.round(lightness * 2.55);
    return `#${gray.toString(16).padStart(2, "0")}${gray.toString(16).padStart(2, "0")}${gray.toString(16).padStart(2, "0")}`;
  }

  // Check if it's an hsl color
  const hslMatch = value.match(/hsl\(([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/);
  if (hslMatch) {
    const [, h, s, l] = hslMatch;
    // Simple HSL to RGB conversion
    const hue = parseFloat(h);
    const sat = parseFloat(s) / 100;
    const light = parseFloat(l) / 100;

    const c = (1 - Math.abs(2 * light - 1)) * sat;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = light - c / 2;

    let r = 0,
      g = 0,
      b = 0;
    if (hue >= 0 && hue < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (hue >= 60 && hue < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (hue >= 120 && hue < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (hue >= 180 && hue < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (hue >= 240 && hue < 300) {
      r = x;
      g = 0;
      b = c;
    } else if (hue >= 300 && hue < 360) {
      r = c;
      g = 0;
      b = x;
    }

    const rHex = Math.round((r + m) * 255)
      .toString(16)
      .padStart(2, "0");
    const gHex = Math.round((g + m) * 255)
      .toString(16)
      .padStart(2, "0");
    const bHex = Math.round((b + m) * 255)
      .toString(16)
      .padStart(2, "0");

    return `#${rHex}${gHex}${bHex}`;
  }

  return null;
}

/**
 * Check if value is a color (oklch or hsl)
 */
function isColorValue(value: string): boolean {
  return value.includes("oklch(") || value.includes("hsl(");
}

export function ColorPickerInput({
  label,
  value,
  onChange,
  variableName,
}: ColorPickerInputProps) {
  const [hexValue, setHexValue] = useState<string>("#000000");
  const isColor = isColorValue(value);

  useEffect(() => {
    if (isColor) {
      const hex = parseColorToHex(value);
      if (hex) setHexValue(hex);
    }
  }, [value, isColor]);

  const handleColorChange = (newHex: string) => {
    setHexValue(newHex);

    // Convert hex back to original format
    // This is a simplified version - in production you'd want proper color conversion
    if (value.includes("oklch(")) {
      // Keep the original format structure, just update the lightness approximation
      const r = parseInt(newHex.slice(1, 3), 16);
      const g = parseInt(newHex.slice(3, 5), 16);
      const b = parseInt(newHex.slice(5, 7), 16);
      const lightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      // Try to preserve chroma and hue from original
      const match = value.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
      if (match) {
        const [, , c, h] = match;
        onChange(`oklch(${lightness.toFixed(4)} ${c} ${h})`);
      }
    } else if (value.includes("hsl(")) {
      // Convert hex to HSL
      const r = parseInt(newHex.slice(1, 3), 16) / 255;
      const g = parseInt(newHex.slice(3, 5), 16) / 255;
      const b = parseInt(newHex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = (max + min) / 2;

      let h = 0,
        s = 0;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
          case r:
            h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
            break;
          case g:
            h = ((b - r) / d + 2) / 6;
            break;
          case b:
            h = ((r - g) / d + 4) / 6;
            break;
        }
      }

      onChange(
        `hsl(${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`,
      );
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label
        htmlFor={variableName}
        className="text-sm text-muted-foreground font-medium"
      >
        {label}
      </Label>
      <div className="flex gap-2">
        <Input
          id={variableName}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-sm"
          placeholder="Enter CSS value"
        />
        {isColor && (
          <input
            type="color"
            value={hexValue}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-12 h-10 rounded border border-input cursor-pointer"
            title="Pick color"
          />
        )}
      </div>
    </div>
  );
}
