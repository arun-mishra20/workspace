import { useState } from "react";
import { format } from "date-fns";

import { Button } from "@workspace/ui/components/ui/button";
import { Calendar } from "@workspace/ui/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

interface DateRangeFilterProps {
  /** ISO date string or undefined */
  dateFrom?: string;
  /** ISO date string or undefined */
  dateTo?: string;
  /** Called with { from?, to? } ISO strings */
  onChange: (range: { from?: string; to?: string }) => void;
  /** Optional className for the trigger */
  className?: string;
}

/**
 * A reusable date-range filter using a calendar popover.
 *
 * - Displays a button with the selected range or "Date range" placeholder.
 * - Includes a clear ("×") button when a range is active.
 */
export function DateRangeFilter({
  dateFrom,
  dateTo,
  onChange,
  className,
}: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);

  const selected =
    dateFrom || dateTo
      ? {
          from: dateFrom ? new Date(dateFrom) : new Date(),
          to: dateTo ? new Date(dateTo) : undefined,
        }
      : undefined;

  const hasRange = dateFrom || dateTo;

  const label = hasRange
    ? [
        dateFrom ? format(new Date(dateFrom), "MMM d") : "…",
        dateTo ? format(new Date(dateTo), "MMM d") : "…",
      ].join(" – ")
    : "Date range";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 text-xs justify-start font-normal",
              !hasRange && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-1.5 size-3.5" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={selected}
            onSelect={(range) => {
              onChange({
                from: range?.from?.toISOString(),
                to: range?.to?.toISOString(),
              });
              // Close only when both ends are selected
              if (range?.from && range?.to) {
                setOpen(false);
              }
            }}
            numberOfMonths={2}
            autoFocus
          />
        </PopoverContent>
      </Popover>
      {hasRange && (
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => onChange({ from: undefined, to: undefined })}
        >
          <X className="size-3.5" />
          <span className="sr-only">Clear date range</span>
        </Button>
      )}
    </div>
  );
}
