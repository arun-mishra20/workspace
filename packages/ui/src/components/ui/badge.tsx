import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@workspace/ui/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/80',
        outline: 'text-foreground',
        info: 'mr-2 border border-info/30 bg-info/10 px-2.5 py-0.5 text-xs font-medium text-info',
        success:
          'mr-2 border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success',
        warning:
          'mr-2 border border-warning/30 bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning',
        error:
          'mr-2 border border-negative/30 bg-negative/10 px-2.5 py-0.5 text-xs font-medium text-negative',
        red: 'mr-2 border border-negative/30 bg-negative/10 px-2.5 py-0.5 text-xs font-medium text-negative',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
