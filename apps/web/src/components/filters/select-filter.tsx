import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";

export interface FilterOption {
  value: string;
  label: string;
  color?: string;
}

interface SelectFilterProps {
  /** Label shown in the placeholder */
  label: string;
  /** Currently selected value (empty string = "all") */
  value: string;
  /** Available options */
  options: readonly FilterOption[];
  /** Called when the selection changes ("" signals "clear") */
  onChange: (value: string) => void;
  /** Optional className for the trigger */
  className?: string;
}

/**
 * A reusable select-based filter dropdown.
 *
 * - Shows a "All {label}" option to clear the filter.
 * - Supports an optional colour swatch per option.
 */
export function SelectFilter({
  label,
  value,
  options,
  onChange,
  className,
}: SelectFilterProps) {
  return (
    <Select
      value={value || "__all__"}
      onValueChange={(v) => onChange(v === "__all__" ? "" : v)}
    >
      <SelectTrigger className={className ?? "w-40 h-9 text-xs"}>
        <SelectValue placeholder={`All ${label}`} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">All {label}</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <span className="flex items-center gap-2">
              {opt.color && (
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: opt.color }}
                />
              )}
              {opt.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
