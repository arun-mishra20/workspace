import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { Tabs, TabsList, TabsTrigger } from '@workspace/ui/components/ui/tabs'
import { getActiveNavChild, getActiveNavItem, navItems } from './nav-config'

const NavTabs = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const activeItem = useMemo(() => {
    return getActiveNavItem(location.pathname)
  }, [location.pathname])

  const current = activeItem?.href ?? '/'

  const currentChild = useMemo(() => {
    return getActiveNavChild(location.pathname, activeItem)?.href ?? null
  }, [activeItem, location.pathname])

  return (
    <div className="flex flex-col items-center gap-2">
      <Tabs value={current} onValueChange={(value) => navigate(value)}>
        <TabsList className="rounded-sm">
          {navItems.map((item) => (
            <TabsTrigger
              key={item.href}
              value={item.href}
              asChild
              className="rounded-sm font-normal font-xs font-sans transition-all duration-200 data-[state=active]:text-foreground"
            >
              <Link to={item.href} className="flex items-center gap-1">
                {current === item.href ? (
                  <item.icon className="size-4 text-primary transition-all duration-200" />
                ) : null}
                <span className="transition-all duration-200">
                  {item.label}
                </span>
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {activeItem?.children && currentChild ? (
        <Tabs value={currentChild} onValueChange={(value) => navigate(value)}>
          <TabsList className="h-8 rounded-sm bg-muted/60 p-1">
            {activeItem.children.map((item) => (
              <TabsTrigger
                key={item.href}
                value={item.href}
                asChild
                className="h-6 rounded-sm px-3 text-xs font-normal data-[state=active]:text-foreground"
              >
                <Link to={item.href} className="flex items-center gap-1.5">
                  {currentChild === item.href ? (
                    <item.icon className="size-3.5 text-foreground transition-all duration-200" />
                  ) : null}
                  <span>{item.label}</span>
                </Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : null}
    </div>
  )
}

export default NavTabs
