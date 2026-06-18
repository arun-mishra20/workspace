import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import { Separator } from '@workspace/ui/components/ui/separator'

interface AnalyticsSectionCardProps {
  title: string
  description?: string
  icon?: LucideIcon
  children: ReactNode
  headerExtra?: ReactNode
  className?: string
}

export function AnalyticsSectionCard({
  title,
  description,
  icon: Icon,
  children,
  headerExtra,
  className,
}: AnalyticsSectionCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="size-4 text-muted-foreground" />}
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
          </div>
          {headerExtra}
        </div>
        <Separator className="w-full mt-2" />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
