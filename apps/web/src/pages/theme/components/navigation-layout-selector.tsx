import type { ComponentType } from 'react'

import {
  Command,
  LayoutPanelTop,
  PanelLeft,
  PanelLeftDashed,
  PanelTop,
  Rows3,
  Waypoints,
} from 'lucide-react'

import { NAVIGATION_LAYOUT_IDS, type NavigationLayoutId } from '@/themes/types'

import { cn } from '@workspace/ui/lib/utils'

interface NavigationLayoutSelectorProps {
  value: NavigationLayoutId
  onChange: (layout: NavigationLayoutId) => void
}

interface LayoutOption {
  id: NavigationLayoutId
  label: string
  description: string
  Icon: ComponentType<{ className?: string }>
}

type LayoutOptionData = Omit<LayoutOption, 'id'>

// Record ensures TypeScript errors if a new NavigationLayoutId is added but not listed here.
const layoutOptionData: Record<NavigationLayoutId, LayoutOptionData> = {
  sidebar: {
    label: 'Collapsible Sidebar',
    description: 'Persistent grouped navigation with room to grow.',
    Icon: PanelLeft,
  },
  'floating-sidebar': {
    label: 'Floating Sidebar',
    description: 'Detached panel with rounded edges and soft shadow.',
    Icon: PanelLeftDashed,
  },
  'flat-topnav': {
    label: 'Flat Top Nav',
    description: 'Single row of pages with no category grouping.',
    Icon: PanelTop,
  },
  'categorized-topnav': {
    label: 'Categorized Top Nav',
    description: 'Vercel-like categories with a focused second row.',
    Icon: Rows3,
  },
  'mega-menu': {
    label: 'Mega Menu',
    description: 'Clean top bar with rich dropdown sections and context.',
    Icon: LayoutPanelTop,
  },
  'command-bar': {
    label: 'Command Bar',
    description: 'Minimal shell with breadcrumbs and a jump palette.',
    Icon: Command,
  },
}

const layoutOptions = NAVIGATION_LAYOUT_IDS.map((id) => ({
  id,
  ...layoutOptionData[id],
})) satisfies LayoutOption[]

function MiniPreview({ id }: { id: NavigationLayoutId }) {
  if (id === 'sidebar') {
    return (
      <div className="grid h-20 grid-cols-[18px_minmax(0,1fr)] gap-2 rounded-2xl border border-border/60 bg-background/70 p-2">
        <div className="rounded-xl bg-muted" />
        <div className="space-y-2">
          <div className="h-4 rounded-full bg-muted" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-10 rounded-xl bg-muted/80" />
            <div className="h-10 rounded-xl bg-muted/50" />
          </div>
        </div>
      </div>
    )
  }

  if (id === 'floating-sidebar') {
    return (
      <div className="relative h-20 rounded-2xl border border-border/60 bg-background/70 p-2">
        <div className="absolute bottom-2 left-2 top-2 w-5 rounded-xl border border-border/60 bg-muted shadow-sm" />
        <div className="ml-8 space-y-2">
          <div className="h-4 rounded-full bg-muted" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-10 rounded-xl bg-muted/80" />
            <div className="h-10 rounded-xl bg-muted/50" />
          </div>
        </div>
      </div>
    )
  }

  if (id === 'flat-topnav') {
    return (
      <div className="space-y-2 rounded-2xl border border-border/60 bg-background/70 p-2">
        <div className="flex gap-1.5 overflow-hidden">
          <div className="h-4 w-10 shrink-0 rounded-full bg-muted" />
          <div className="h-4 w-12 shrink-0 rounded-full bg-muted/80" />
          <div className="h-4 w-14 shrink-0 rounded-full bg-muted/60" />
          <div className="h-4 w-10 shrink-0 rounded-full bg-muted/50" />
          <div className="h-4 w-12 shrink-0 rounded-full bg-muted/40" />
        </div>
        <div className="h-10 rounded-xl bg-muted/50" />
      </div>
    )
  }

  if (id === 'categorized-topnav') {
    return (
      <div className="space-y-2 rounded-2xl border border-border/60 bg-background/70 p-2">
        <div className="flex gap-1.5">
          <div className="h-4 w-10 rounded-full bg-muted" />
          <div className="h-4 w-12 rounded-full bg-muted/80" />
          <div className="h-4 w-14 rounded-full bg-muted/50" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-4 w-14 rounded-full bg-muted/80" />
          <div className="h-4 w-16 rounded-full bg-muted/50" />
          <div className="h-4 w-12 rounded-full bg-muted/60" />
        </div>
        <div className="h-8 rounded-xl bg-muted/50" />
      </div>
    )
  }

  if (id === 'mega-menu') {
    return (
      <div className="space-y-2 rounded-2xl border border-border/60 bg-background/70 p-2">
        <div className="flex gap-1.5">
          <div className="h-4 w-12 rounded-full bg-muted" />
          <div className="h-4 w-12 rounded-full bg-muted/80" />
          <div className="h-4 w-12 rounded-full bg-muted/60" />
        </div>
        <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-2 rounded-xl bg-muted/40 p-2">
          <div className="rounded-lg bg-muted/80" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-10 rounded-lg bg-muted/80" />
            <div className="h-10 rounded-lg bg-muted/60" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-2xl border border-border/60 bg-background/70 p-2">
      <div className="flex items-center gap-2">
        <div className="h-4 w-14 rounded-full bg-muted" />
        <div className="h-4 flex-1 rounded-full bg-muted/60" />
      </div>
      <div className="h-8 rounded-full border border-dashed border-border/60 bg-muted/30" />
      <div className="h-8 rounded-xl bg-muted/50" />
    </div>
  )
}

export function NavigationLayoutSelector({
  value,
  onChange,
}: NavigationLayoutSelectorProps) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Waypoints className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            Navigation Layout
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Pick the app shell that should wrap every protected page.
        </p>
      </div>

      <div className="grid gap-3">
        {layoutOptions.map((option) => {
          const selected = option.id === value
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={cn(
                'rounded-[1.25rem] border p-3 text-left transition-all',
                selected
                  ? 'border-primary/40 bg-primary/10 shadow-sm'
                  : 'border-border/60 bg-card/60 hover:border-border hover:bg-secondary/40',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <option.Icon className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {option.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>
                <div
                  className={cn(
                    'mt-0.5 size-2.5 rounded-full border border-border/60',
                    selected && 'border-primary bg-primary',
                  )}
                />
              </div>
              <div className="mt-3">
                <MiniPreview id={option.id} />
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
