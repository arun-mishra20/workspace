import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import * as React from 'react'
import { DayPicker, getDefaultClassNames } from 'react-day-picker'
import 'react-day-picker/style.css'

import { cn } from '@workspace/ui/lib/utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const defaults = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        ...defaults,
        root: cn(defaults.root, className),
        today: cn(defaults.today, 'bg-accent text-accent-foreground'),
        selected: cn(
          defaults.selected,
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        ),
        outside: cn(
          defaults.outside,
          'text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30',
        ),
        disabled: cn(defaults.disabled, 'text-muted-foreground opacity-50'),
        hidden: 'invisible',
        range_middle: cn(
          defaults.range_middle,
          'aria-selected:bg-accent aria-selected:text-accent-foreground',
        ),
        chevron: cn(defaults.chevron, 'fill-foreground'),
        caption_label: cn(defaults.caption_label, 'text-sm font-medium'),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left'
            ? (
                <ChevronLeftIcon className="size-4" />
              )
            : (
                <ChevronRightIcon className="size-4" />
              ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
