import { Link } from 'react-router-dom'

import { Button } from '@workspace/ui/components/ui/button'

export type AnalyticsEmptyAction = {
  label: string
  href?: string
  onClick?: () => void
}

export function AnalyticsEmptyHint({
  title,
  actions = [],
}: {
  title: string
  actions?: AnalyticsEmptyAction[]
}) {
  if (actions.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        <p>{title}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-sm text-muted-foreground">{title}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {actions.map((action) =>
          action.href ? (
            <Button key={action.label} variant="outline" size="sm" asChild>
              <Link to={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ),
        )}
      </div>
    </div>
  )
}
