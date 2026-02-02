/**
 * Font Selector Component
 *
 * Provides dropdowns for selecting font families with text input fallback.
 */

import { Label } from "@workspace/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import { Input } from "@workspace/ui/components/ui/input";

interface FontSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  variableName: string;
  fontType: "sans" | "serif" | "mono";
}

const FONT_OPTIONS = {
  sans: [
    { value: "Geist, sans-serif", label: "Geist" },
    {
      value: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
      label: "Inter",
    },
    {
      value:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      label: "System UI",
    },
    { value: "Arial, Helvetica, sans-serif", label: "Arial" },
    { value: '"Open Sans", sans-serif', label: "Open Sans" },
    { value: "Lato, sans-serif", label: "Lato" },
    { value: "Montserrat, sans-serif", label: "Montserrat" },
    { value: "Poppins, sans-serif", label: "Poppins" },
    { value: "Roboto, sans-serif", label: "Roboto" },
    { value: "custom", label: "Custom..." },
  ],
  serif: [
    { value: "Georgia, serif", label: "Georgia" },
    { value: '"Times New Roman", Times, serif', label: "Times New Roman" },
    { value: "Merriweather, serif", label: "Merriweather" },
    { value: '"Playfair Display", serif', label: "Playfair Display" },
    { value: "Lora, serif", label: "Lora" },
    { value: "custom", label: "Custom..." },
  ],
  mono: [
    { value: "Geist Mono, monospace", label: "Geist Mono" },
    {
      value: "JetBrains Mono, Menlo, Monaco, monospace",
      label: "JetBrains Mono",
    },
    { value: '"Fira Code", monospace', label: "Fira Code" },
    { value: 'Menlo, Monaco, "Courier New", monospace', label: "Menlo" },
    { value: '"Source Code Pro", monospace', label: "Source Code Pro" },
    { value: '"Roboto Mono", monospace', label: "Roboto Mono" },
    { value: "Consolas, monospace", label: "Consolas" },
    { value: "custom", label: "Custom..." },
  ],
};

export function FontSelector({
  label,
  value,
  onChange,
  variableName,
  fontType,
}: FontSelectorProps) {
  const options = FONT_OPTIONS[fontType];

  // Check if current value matches a preset
  const matchedOption = options.find((opt) => opt.value === value);
  const selectValue = matchedOption ? value : "custom";

  const handleSelectChange = (newValue: string) => {
    if (newValue !== "custom") {
      onChange(newValue);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-1">
      <Label
        htmlFor={variableName}
        className="text-xs text-muted-foreground font-medium"
      >
        {label}
      </Label>
      <Select value={selectValue} onValueChange={handleSelectChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a font" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={variableName}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-mono text-sm"
        placeholder="Enter custom font stack"
      />
    </div>
  );
}
