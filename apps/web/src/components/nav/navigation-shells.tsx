import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bot, ChevronLeft, ChevronRight, Menu, Search } from 'lucide-react'

import { useAuthSession } from '@/app/auth-session-context'
import { Logo } from '@/components/nav/logo'
import { NavUser } from '@/components/nav/nav-user'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { useThemeCustomization } from '@/themes/context'
import { SIDEBAR_COLLAPSED_STORAGE_KEY } from '@/themes/storage'
import {
  getActiveNavChild,
  getActiveNavItem,
  getNavItemsForCategory,
  isItemActive,
  navCategories,
  type NavCategory,
  type NavItem,
} from '@/components/nav/nav-config'
import { useAiAssistant } from '@/features/ai-assistant/ai-assistant-context'
import { appPaths } from '@/config/app-paths'

import { Button } from '@workspace/ui/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@workspace/ui/components/ui/breadcrumb'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@workspace/ui/components/ui/command'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@workspace/ui/components/ui/drawer'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@workspace/ui/components/ui/navigation-menu'
import { Switch } from '@workspace/ui/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/ui/tooltip'
import { cn } from '@workspace/ui/lib/utils'

interface NavigationShellProps {
  children: ReactNode
}

interface ShellContextValue {
  activeItem: NavItem
  activeChildHref: string | null
  activeCategory: NavCategory
}

function useShellContext(): ShellContextValue {
  const location = useLocation()

  return useMemo(() => {
    const activeItem = getActiveNavItem(location.pathname)
    const activeChildHref =
      getActiveNavChild(location.pathname, activeItem)?.href ?? null
    const activeCategory =
      navCategories.find((category) => category.id === activeItem.category) ??
      navCategories[0]

    return {
      activeItem,
      activeChildHref,
      activeCategory,
    }
  }, [location.pathname])
}

function AiAssistantToggle({
  compact = false,
  className,
}: {
  compact?: boolean
  className?: string
}) {
  const { hasToken, isAuthenticated } = useAuthSession()
  const { enabled, setEnabled } = useAiAssistant()

  if (!(isAuthenticated && hasToken)) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-2 py-1 backdrop-blur-sm',
        compact && 'px-2',
        className,
      )}
    >
      <Bot className="size-4 text-muted-foreground" />
      {!compact ? (
        <span className="hidden text-xs font-medium text-foreground sm:inline">
          AI
        </span>
      ) : null}
      <Switch
        checked={enabled}
        onCheckedChange={setEnabled}
        aria-label="Toggle AI assistant"
      />
    </div>
  )
}

function DesktopActionCluster({ className }: { className?: string }) {
  const { hasToken, isAuthenticated, user } = useAuthSession()
  const isSuccess = isAuthenticated && hasToken

  return (
    <div className={cn('flex items-center gap-2 md:gap-4', className)}>
      <AiAssistantToggle />
      <ThemeToggle />
      {isSuccess ? (
        <NavUser username={user?.email} />
      ) : (
        <Link to={appPaths.auth.login.getHref()}>
          <Button variant="ghost">Login</Button>
        </Link>
      )}
    </div>
  )
}

function MobileNavigationItems({ onSelect }: { onSelect: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { hasToken, isAuthenticated, user } = useAuthSession()
  const isSuccess = isAuthenticated && hasToken

  const handleSelect = (href: string) => {
    navigate(href)
    onSelect()
  }

  return (
    <div className="space-y-6">
      {navCategories.map((category) => {
        const items = getNavItemsForCategory(category.id)
        if (!items.length) {
          return null
        }

        return (
          <section key={category.id} className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {category.label}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {category.description}
              </p>
            </div>
            <nav className="flex flex-col gap-2">
              {items.map((item) => {
                const active = isItemActive(location.pathname, item.href)
                const Icon = item.icon

                return (
                  <div key={item.href} className="flex flex-col gap-2">
                    <button
                      onClick={() => handleSelect(item.href)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
                        active
                          ? 'border-primary/30 bg-primary/10 text-foreground'
                          : 'border-border/60 bg-card/50 text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                      )}
                    >
                      <Icon className="mt-0.5 size-5" />
                      <div>
                        <div className="font-medium">{item.label}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      </div>
                    </button>

                    {item.children ? (
                      <div className="ml-5 flex flex-col gap-1 border-l border-border/60 pl-4">
                        {item.children.map((child) => {
                          const childActive = isItemActive(
                            location.pathname,
                            child.href,
                          )
                          const ChildIcon = child.icon

                          return (
                            <button
                              key={child.href}
                              onClick={() => handleSelect(child.href)}
                              className={cn(
                                'flex items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors',
                                childActive
                                  ? 'bg-secondary text-foreground'
                                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
                              )}
                            >
                              <ChildIcon className="size-4" />
                              <span>{child.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </nav>
          </section>
        )
      })}

      <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {isSuccess ? user?.email : 'Guest'}
            </p>
            <p className="text-xs text-muted-foreground">
              Account and shell controls
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isSuccess ? <NavUser username={user?.email} /> : null}
          </div>
        </div>
        <AiAssistantToggle className="mt-4 justify-between rounded-2xl px-3 py-2" />
      </div>
    </div>
  )
}

function MobileNavigationDrawer({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="bottom">
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[88vh] rounded-t-[1.75rem]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Navigation</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-8">
          <MobileNavigationItems onSelect={() => setOpen(false)} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function ShellFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">{children}</div>
  )
}

function SidebarShell({
  children,
  variant = 'docked',
}: NavigationShellProps & { variant?: 'docked' | 'floating' }) {
  const { activeItem } = useShellContext()
  const { user } = useAuthSession()
  const isFloating = variant === 'floating'
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true'
  })

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed))
  }, [collapsed])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'b' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setCollapsed((value) => !value)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <ShellFrame>
      <div className={cn('min-h-dvh', !isFloating && 'flex')}>
        <aside
          data-slot="sidebar"
          data-variant={isFloating ? 'floating' : 'docked'}
          className={cn(
            'hidden md:flex md:flex-col md:transition-[width] md:duration-200',
            isFloating
              ? 'fixed z-50 left-4 top-4 bottom-4 overflow-hidden rounded-[1.25rem] border border-border/60 bg-card/90 shadow-lg backdrop-blur-xl'
              : 'border-r border-border/60 bg-card/70 backdrop-blur-xl md:sticky md:top-0 md:h-dvh',
            collapsed ? 'md:w-16' : 'md:w-64',
          )}
        >
          <div
            data-slot="sidebar-header"
            className="flex items-center border-b border-border/60 px-3 py-3"
          >
            {collapsed ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(false)}
                aria-label="Expand sidebar"
                className="mx-auto"
              >
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <>
                <Logo />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCollapsed(true)}
                  aria-label="Collapse sidebar"
                  className="ml-auto"
                >
                  <ChevronLeft className="size-4" />
                </Button>
              </>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <div className="space-y-5">
              {navCategories.map((category) => {
                const items = getNavItemsForCategory(category.id)
                if (!items.length) {
                  return null
                }

                return (
                  <section key={category.id} className="space-y-2">
                    <div className={cn(collapsed && 'sr-only')}>
                      <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {category.label}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <TooltipProvider delayDuration={300}>
                        {items.map((item) => {
                          const Icon = item.icon
                          const active = activeItem.href === item.href

                          const linkEl = (
                            <Link
                              to={item.href}
                              data-slot="sidebar-nav-link"
                              data-active={active ? 'true' : 'false'}
                              aria-current={active ? 'page' : undefined}
                              className={cn(
                                'group flex items-center gap-3 rounded-2xl border px-2 py-2 transition-colors',
                                active
                                  ? 'border-primary/40 bg-primary/10 text-foreground'
                                  : 'border-transparent text-muted-foreground hover:border-border/60 hover:bg-secondary/60 hover:text-foreground',
                                collapsed && 'justify-center px-2',
                              )}
                            >
                              <Icon className="size-4 shrink-0" />
                              {!collapsed && (
                                <span className="font-medium text-xs text-foreground">
                                  {item.label}
                                </span>
                              )}
                            </Link>
                          )

                          if (collapsed) {
                            return (
                              <Tooltip key={item.href}>
                                <TooltipTrigger asChild>
                                  {linkEl}
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                  {item.label}
                                </TooltipContent>
                              </Tooltip>
                            )
                          }

                          return <div key={item.href}>{linkEl}</div>
                        })}
                      </TooltipProvider>
                    </div>
                  </section>
                )
              })}
            </div>
          </div>

          <div
            data-slot="sidebar-footer"
            className="border-t border-border/60 px-3 py-3"
          >
            {collapsed ? (
              <div className="flex justify-center">
                <NavUser username={user?.email} />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <AiAssistantToggle compact className="rounded-2xl" />
                <NavUser username={user?.email} />
              </div>
            )}
          </div>
        </aside>

        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col',
            isFloating && (collapsed ? 'md:pl-24' : 'md:pl-72'),
          )}
        >
          <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl md:hidden">
            <div className="flex h-14 items-center justify-between gap-3 px-4">
              <Logo />
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <MobileNavigationDrawer />
              </div>
            </div>
          </header>

          <main className="flex flex-1 flex-col">{children}</main>
        </div>
      </div>
    </ShellFrame>
  )
}

function CategorizedTopNavShell({ children }: NavigationShellProps) {
  const { activeCategory, activeItem } = useShellContext()
  const categoryItems = getNavItemsForCategory(activeCategory.id)

  return (
    <ShellFrame>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6 md:px-8">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="hidden md:flex items-center gap-2">
              {navCategories.map((category) => {
                const isActive = activeCategory.id === category.id
                const firstHref =
                  getNavItemsForCategory(category.id)[0]?.href ?? '/'

                if (isActive) {
                  return (
                    <span
                      key={category.id}
                      aria-current="true"
                      className="rounded-full bg-secondary px-3 py-1.5 text-sm text-foreground"
                    >
                      {category.label}
                    </span>
                  )
                }

                return (
                  <Link
                    key={category.id}
                    to={firstHref}
                    className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {category.label}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <DesktopActionCluster />
            </div>
            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle />
              <MobileNavigationDrawer />
            </div>
          </div>
        </div>

        <div className="hidden md:block border-t border-border/50 px-4 sm:px-6 md:px-8">
          <div className="flex items-center gap-2 py-3">
            {categoryItems.map((item) => {
              const active = item.href === activeItem.href
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-sm transition-colors',
                    active
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-transparent text-muted-foreground hover:border-border/60 hover:bg-secondary/60 hover:text-foreground',
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>
    </ShellFrame>
  )
}

function MegaMenuShell({ children }: NavigationShellProps) {
  const location = useLocation()
  const { activeItem } = useShellContext()
  const onActivePage = isItemActive(location.pathname, activeItem.href)

  return (
    <ShellFrame>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6 md:px-8">
          <div className="flex items-center gap-4">
            <Logo />
            <div className="hidden md:block">
              <NavigationMenu>
                <NavigationMenuList>
                  {navCategories.map((category) => {
                    const items = getNavItemsForCategory(category.id)
                    return (
                      <NavigationMenuItem key={category.id}>
                        <NavigationMenuTrigger className="bg-transparent">
                          {category.label}
                        </NavigationMenuTrigger>
                        <NavigationMenuContent>
                          <div className="grid w-155 grid-cols-[220px_minmax(0,1fr)] gap-4 p-4">
                            <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
                              <p className="text-sm font-semibold text-foreground">
                                {category.label}
                              </p>
                              <p className="mt-2 text-sm text-muted-foreground">
                                {category.description}
                              </p>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {items.map((item) => {
                                const Icon = item.icon
                                return (
                                  <NavigationMenuLink asChild key={item.href}>
                                    <Link
                                      to={item.href}
                                      aria-current={
                                        activeItem.href === item.href
                                          ? 'page'
                                          : undefined
                                      }
                                      className={cn(
                                        'rounded-2xl border border-border/60 bg-card/50 p-4 transition-colors hover:bg-secondary/60',
                                        activeItem.href === item.href &&
                                          'border-primary/40 bg-primary/10',
                                      )}
                                    >
                                      <Icon className="size-4 text-muted-foreground" />
                                      <div className="mt-3 text-sm font-medium text-foreground">
                                        {item.label}
                                      </div>
                                      <div className="mt-1 text-sm text-muted-foreground">
                                        {item.description}
                                      </div>
                                    </Link>
                                  </NavigationMenuLink>
                                )
                              })}
                            </div>
                          </div>
                        </NavigationMenuContent>
                      </NavigationMenuItem>
                    )
                  })}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <DesktopActionCluster />
            </div>
            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle />
              <MobileNavigationDrawer />
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center justify-between gap-4 border-t border-border/50 px-4 py-3 sm:px-6 md:px-8">
          <div>
            <p className="text-sm font-medium text-foreground">
              {activeItem.label}
            </p>
            <p className="text-sm text-muted-foreground">
              {activeItem.description}
            </p>
          </div>
          {!onActivePage && (
            <Link
              to={activeItem.href}
              className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              Open page
            </Link>
          )}
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>
    </ShellFrame>
  )
}

function CommandBarShell({ children }: NavigationShellProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { activeItem, activeChildHref, activeCategory } = useShellContext()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <ShellFrame>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
            <div className="hidden md:block">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link
                        to={
                          getNavItemsForCategory(activeCategory.id)[0]?.href ??
                          '/'
                        }
                      >
                        {activeCategory.label}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{activeItem.label}</BreadcrumbPage>
                  </BreadcrumbItem>
                  {activeChildHref ? (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>
                          {
                            activeItem.children?.find(
                              (child) => child.href === activeChildHref,
                            )?.label
                          }
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  ) : null}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="hidden min-w-64 items-center justify-between rounded-full border-border/60 bg-card/70 md:flex"
              onClick={() => setOpen(true)}
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                <Search className="size-4" />
                Jump to a page
              </span>
              <span className="text-xs text-muted-foreground">⌘K</span>
            </Button>
            <div className="hidden md:block">
              <DesktopActionCluster />
            </div>
            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(true)}
                aria-label="Open command menu"
              >
                <Search className="size-5" />
              </Button>
              <MobileNavigationDrawer />
            </div>
          </div>
        </div>
      </header>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search pages and jump instantly..." />
        <CommandList>
          <CommandEmpty>No pages found.</CommandEmpty>
          {navCategories.map((category, index) => {
            const items = getNavItemsForCategory(category.id)
            return (
              <div key={category.id}>
                <CommandGroup heading={category.label}>
                  {items.map((item) => {
                    const Icon = item.icon
                    return (
                      <CommandItem
                        key={item.href}
                        value={[
                          item.label,
                          item.description,
                          ...item.keywords,
                        ].join(' ')}
                        onSelect={() => {
                          navigate(item.href)
                          setOpen(false)
                        }}
                        className={cn(
                          'rounded-xl',
                          isItemActive(location.pathname, item.href) &&
                            'bg-accent/70',
                        )}
                      >
                        <Icon className="size-4" />
                        <div className="flex flex-1 flex-col gap-0.5">
                          <span>{item.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {item.description}
                          </span>
                        </div>
                        <CommandShortcut>{category.label}</CommandShortcut>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
                {index < navCategories.length - 1 ? <CommandSeparator /> : null}
              </div>
            )
          })}
        </CommandList>
      </CommandDialog>

      <main className="flex flex-1 flex-col">{children}</main>
    </ShellFrame>
  )
}

export function ProtectedNavigationShell({ children }: NavigationShellProps) {
  const { navigationLayout } = useThemeCustomization()

  switch (navigationLayout) {
    case 'floating-sidebar':
      return <SidebarShell variant="floating">{children}</SidebarShell>
    case 'categorized-topnav':
      return <CategorizedTopNavShell>{children}</CategorizedTopNavShell>
    case 'mega-menu':
      return <MegaMenuShell>{children}</MegaMenuShell>
    case 'command-bar':
      return <CommandBarShell>{children}</CommandBarShell>
    case 'sidebar':
    default:
      return <SidebarShell>{children}</SidebarShell>
  }
}
