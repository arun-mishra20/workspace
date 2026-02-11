import { Input } from "@workspace/ui/components/ui/input";
import { Search, X } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

interface SearchFilterProps {
  /** Current raw (non-debounced) input value */
  value: string;
  /** Called on every keystroke */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Optional className */
  className?: string;
}

/**
 * A reusable search input with icon and clear button.
 *
 * Debouncing is the caller's responsibility (use `useDebounce`).
 */
export function SearchFilter({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: SearchFilterProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 pl-8 pr-8 text-xs w-50"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
          <span className="sr-only">Clear search</span>
        </button>
      )}
    </div>
  );
}
