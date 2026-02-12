/**
 * Slider Input Component
 *
 * Combines text input with slider for numeric CSS values.
 */

import { Input } from "@workspace/ui/components/ui/input";
import { Label } from "@workspace/ui/components/ui/label";
import { Slider } from "@workspace/ui/components/ui/slider";

interface SliderInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  variableName: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

/**
 * Parse CSS value to numeric (e.g., "0.5rem" -> 0.5)
 */
function parseNumericValue(value: string): number {
  const match = value.match(/([-\d.]+)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return 0;
}

export function SliderInput({
  label,
  value,
  onChange,
  variableName,
  min,
  max,
  step,
  unit,
}: SliderInputProps) {
  const numericValue = parseNumericValue(value);

  const handleSliderChange = (values: number[]) => {
    const newValue = values[0];
    onChange(`${newValue}${unit}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label
        htmlFor={variableName}
        className="text-xs text-muted-foreground font-medium"
      >
        {label}
      </Label>
      <div className="space-y-2">
        <Slider
          value={[numericValue]}
          onValueChange={handleSliderChange}
          min={min}
          max={max}
          step={step}
          className="w-full"
        />
        <Input
          id={variableName}
          value={value}
          onChange={handleInputChange}
          className="font-mono text-sm"
          placeholder={`e.g., ${min}${unit}`}
        />
      </div>
    </div>
  );
}
