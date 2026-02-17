import { useMemo, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@workspace/ui/components/ui/avatar'
import { Badge } from '@workspace/ui/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@workspace/ui/components/ui/command'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@workspace/ui/components/ui/dropdown-menu'
import { Field, FieldLabel } from '@workspace/ui/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@workspace/ui/components/ui/input-group'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/ui/popover'
import { Switch } from '@workspace/ui/components/ui/switch'
import { Button } from '@workspace/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'
import { Input } from '@workspace/ui/components/ui/input'
import { Textarea } from '@workspace/ui/components/ui/textarea'
import { ThemeEditorPanel } from './components/theme-editor-panel'
import { MainLayout } from '@/components/layouts/main-layout'
import { AlertTriangle, ArrowUp, AtSign, Bell, Bold, Book, CheckCircle2, Globe, Info, Italic, Paperclip, Plus, Settings, Underline, User, X } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/ui/tabs'
import { Progress } from '@workspace/ui/components/ui/progress'
import { Slider } from '@workspace/ui/components/ui/slider'
import { Checkbox } from '@workspace/ui/components/ui/checkbox'
import { Label } from '@workspace/ui/components/ui/label'
import { Toggle } from '@workspace/ui/components/ui/toggle'
import { Separator } from '@workspace/ui/components/ui/separator'
import { Skeleton } from '@workspace/ui/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/ui/accordion'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@workspace/ui/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@workspace/ui/components/ui/tooltip'
const SAMPLE_DATA = {
  mentionable: [
    {
      type: 'page',
      title: 'Meeting Notes',
      image: '📝',
    },
    {
      type: 'page',
      title: 'Project Dashboard',
      image: '📊',
    },
    {
      type: 'page',
      title: 'Ideas & Brainstorming',
      image: '💡',
    },
    {
      type: 'page',
      title: 'Calendar & Events',
      image: '📅',
    },
    {
      type: 'page',
      title: 'Documentation',
      image: '📚',
    },
    {
      type: 'page',
      title: 'Goals & Objectives',
      image: '🎯',
    },
    {
      type: 'page',
      title: 'Budget Planning',
      image: '💰',
    },
    {
      type: 'page',
      title: 'Team Directory',
      image: '👥',
    },
    {
      type: 'page',
      title: 'Technical Specs',
      image: '🔧',
    },
    {
      type: 'page',
      title: 'Analytics Report',
      image: '📈',
    },
    {
      type: 'user',
      title: 'shadcn',
      image: 'https://github.com/shadcn.png',
      workspace: 'Workspace',
    },
    {
      type: 'user',
      title: 'maxleiter',
      image: 'https://github.com/maxleiter.png',
      workspace: 'Workspace',
    },
    {
      type: 'user',
      title: 'evilrabbit',
      image: 'https://github.com/evilrabbit.png',
      workspace: 'Workspace',
    },
  ],
  models: [
    {
      name: 'Auto',
    },
    {
      name: 'Agent Mode',
      badge: 'Beta',
    },
    {
      name: 'Plan Mode',
    },
  ],
}
function MentionableIcon({
  item,
}: {
  item: (typeof SAMPLE_DATA.mentionable)[0]
}) {
  return item.type === 'page'
    ? (
      <span className="flex size-4 items-center justify-center">
        {item.image}
      </span>
    )
    : (
      <Avatar className="size-4">
        <AvatarImage src={item.image} />
        <AvatarFallback>{item.title[0]}</AvatarFallback>
      </Avatar>
    )
}
export function NotionPromptForm() {
  const [mentions, setMentions] = useState<string[]>([])
  const [mentionPopoverOpen, setMentionPopoverOpen] = useState(false)
  const [modelPopoverOpen, setModelPopoverOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState<
    (typeof SAMPLE_DATA.models)[0]
  >(SAMPLE_DATA.models[0])
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false)
  const grouped = useMemo(() => {
    return SAMPLE_DATA.mentionable.reduce(
      (acc, item) => {
        const isAvailable = !mentions.includes(item.title)
        if (isAvailable) {
          if (!acc[item.type]) {
            acc[item.type] = []
          }
          acc[item.type].push(item)
        }
        return acc
      },
      {} as Record<string, typeof SAMPLE_DATA.mentionable>,
    )
  }, [mentions])
  const hasMentions = mentions.length > 0
  return (
    <form
      data-slot="card"
    >
      <Field>
        <FieldLabel htmlFor="notion-prompt" className="sr-only">
          Prompt
        </FieldLabel>
        <InputGroup className="rounded-xl">
          <InputGroupTextarea
            id="notion-prompt"
            placeholder="Ask, search, or make anything..."
          />
          <InputGroupAddon align="block-start" className="pt-3">
            <Popover
              open={mentionPopoverOpen}
              onOpenChange={setMentionPopoverOpen}
            >
              <PopoverTrigger asChild>
                <InputGroupButton
                  variant="outline"
                  size={hasMentions ? 'icon-sm' : 'sm'}
                  className="transition-transform"
                  data-slot="badge"
                >
                  <AtSign />
                  {' '}
                  {!hasMentions && 'Add context'}
                </InputGroupButton>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search pages..." />
                  <CommandList>
                    <CommandEmpty>No pages found</CommandEmpty>
                    {Object.entries(grouped).map(([type, items]) => (
                      <CommandGroup
                        key={type}
                        heading={type === 'page' ? 'Pages' : 'Users'}
                      >
                        {items.map((item) => (
                          <CommandItem
                            key={item.title}
                            value={item.title}
                            onSelect={(currentValue: string) => {
                              setMentions((prev) => [...prev, currentValue])
                              setMentionPopoverOpen(false)
                            }}
                            data-slot="badge"
                            className="rounded-lg mb-2 mx-2"
                          >
                            <MentionableIcon item={item} />
                            {item.title}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <div className="no-scrollbar -m-1.5 flex gap-1 overflow-y-auto p-1.5">
              {mentions.map((mention) => {
                const item = SAMPLE_DATA.mentionable.find(
                  (item) => item.title === mention,
                )
                if (!item) {
                  return null
                }
                return (
                  <InputGroupButton
                    key={mention}
                    size="sm"
                    variant="secondary"
                    className="rounded-full !pl-2"
                    onClick={() => {
                      setMentions((prev) => prev.filter((m) => m !== mention))
                    }}
                    data-slot="badge"
                  >
                    <MentionableIcon item={item} />
                    {item.title}
                    <X />
                  </InputGroupButton>
                )
              })}
            </div>
          </InputGroupAddon>
          <InputGroupAddon align="block-end" className="gap-1">
            <InputGroupButton
              size="icon-sm"
              className="rounded-full"
              aria-label="Attach file"
              data-slot="badge"
            >
              <Paperclip />
            </InputGroupButton>
            <DropdownMenu
              open={modelPopoverOpen}
              onOpenChange={setModelPopoverOpen}
            >
              <DropdownMenuTrigger asChild>
                <InputGroupButton
                  size="sm"
                  className="rounded-full"
                  data-slot="badge"
                >
                  {selectedModel.name}
                </InputGroupButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-48">
                <DropdownMenuGroup className="w-48">
                  <DropdownMenuLabel className="text-muted-foreground text-xs">
                    Select Agent Mode
                  </DropdownMenuLabel>
                  {SAMPLE_DATA.models.map((model) => (
                    <DropdownMenuCheckboxItem
                      key={model.name}
                      checked={model.name === selectedModel.name}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedModel(model)
                        }
                      }}
                      className="pl-2 *:[span:first-child]:right-2 *:[span:first-child]:left-auto"
                    >
                      {model.name}
                      {model.badge && (
                        <Badge
                          variant="secondary"
                          className="h-5 rounded-sm bg-blue-100 px-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                        >
                          {model.badge}
                        </Badge>
                      )}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu open={scopeMenuOpen} onOpenChange={setScopeMenuOpen}>
              <DropdownMenuTrigger asChild>
                <InputGroupButton
                  size="sm"
                  className="rounded-full"
                  data-slot="badge"
                >
                  <Globe />
                  {' '}
                  All Sources
                </InputGroupButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-72">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    asChild
                    onSelect={(e) => e.preventDefault()}
                  >
                    <label htmlFor="web-search">
                      <Globe />
                      {' '}
                      Web Search
                      {' '}
                      <Switch
                        id="web-search"
                        className="ml-auto"
                        defaultChecked
                      />
                    </label>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    asChild
                    onSelect={(e) => e.preventDefault()}
                  >
                    <label htmlFor="apps">
                      <Globe />
                      {' '}
                      Apps and Integrations
                      <Switch id="apps" className="ml-auto" defaultChecked />
                    </label>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Globe />
                    {' '}
                    All Sources I can access
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Avatar className="size-4">
                        <AvatarImage src="https://github.com/shadcn.png" />
                        <AvatarFallback>CN</AvatarFallback>
                      </Avatar>
                      shadcn
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-72 p-0 [--radius:1rem]">
                      <Command>
                        <CommandInput
                          placeholder="Find or use knowledge in..."
                          autoFocus
                        />
                        <CommandList>
                          <CommandEmpty>No knowledge found</CommandEmpty>
                          <CommandGroup>
                            {SAMPLE_DATA.mentionable
                              .filter((item) => item.type === 'user')
                              .map((user) => (
                                <CommandItem
                                  key={user.title}
                                  value={user.title}
                                  onSelect={() => {
                                    // Handle user selection here
                                    console.log('Selected user:', user.title)
                                  }}
                                >
                                  <Avatar className="size-4">
                                    <AvatarImage src={user.image} />
                                    <AvatarFallback>
                                      {user.title[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  {user.title}
                                  {' '}
                                  <span className="text-muted-foreground">
                                    -
                                    {' '}
                                    {user.workspace}
                                  </span>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem>
                    <Book />
                    {' '}
                    Help Center
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <Plus />
                    {' '}
                    Connect Apps
                  </DropdownMenuItem>
                  <DropdownMenuLabel className="text-muted-foreground text-xs">
                    We&apos;ll only search in the sources selected here.
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <InputGroupButton
              aria-label="Send"
              className="ml-auto rounded-full"
              variant="default"
              size="icon-sm"
            >
              <ArrowUp />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </Field>
    </form>
  )
}
export default function ThemeSettingsPage() {
  return (
    <MainLayout>
      <div className="flex flex-1 flex-col gap-6 px-6 py-10 mx-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Theme Editor
            </p>
            <h1 className="text-2xl font-semibold text-foreground">Customize</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Customize your design system visually.
            </p>
          </div>
        </header>
        <div className="grid gap-6 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
          {/* LEFT: Controls */}
          <Card className="flex flex-col lg:sticky lg:top-6 lg:max-h-[calc(100dvh)]">
            <CardHeader>
              <CardTitle>Controls</CardTitle>
              <CardDescription>Presets and variables</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden py-4">
              <ThemeEditorPanel />
            </CardContent>
          </Card>
          {/* RIGHT: Live Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>
                Your components using this theme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PreviewSandbox />
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
function PreviewSandbox() {
  const [progress, setProgress] = useState(60)
  const [sliderVal, setSliderVal] = useState([40])
  // Animate progress on mount
  useState(() => {
    const timer = setTimeout(() => setProgress(72), 500)
    return () => clearTimeout(timer)
  })
  return (
    <div className="space-y-6">
      {/* ── Buttons ── */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Buttons</h3>
        <div className="flex flex-wrap gap-2">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Danger</Button>
          <Button variant="link">Link</Button>
          <Button size="icon"><Settings className="h-4 w-4" /></Button>
        </div>
      </section>
      <Separator />
      {/* ── Badges ── */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Badges</h3>
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
        </div>
      </section>
      <Separator />
      {/* ── Card with Inputs ── */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Card &amp; Inputs</h3>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Project Settings</CardTitle>
            <CardDescription>Update your project configuration.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="preview-name">Name</Label>
                <Input id="preview-name" placeholder="My Project" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="preview-select">Category</Label>
                <Select>
                  <SelectTrigger id="preview-select">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="dev">Development</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preview-desc">Description</Label>
              <Textarea id="preview-desc" placeholder="Brief description…" className="min-h-[60px]" />
            </div>
          </CardContent>
        </Card>
      </section>
      <Separator />
      {/* ── Tabs ── */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tabs</h3>
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="text-sm text-muted-foreground pt-2">
            A high-level summary of project activity.
          </TabsContent>
          <TabsContent value="analytics" className="text-sm text-muted-foreground pt-2">
            Charts and metrics live here.
          </TabsContent>
          <TabsContent value="settings" className="text-sm text-muted-foreground pt-2">
            Configuration and preferences.
          </TabsContent>
        </Tabs>
      </section>
      <Separator />
      {/* ── Controls Row: Switch, Checkbox, Toggle, Slider ── */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Controls</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch id="preview-switch" defaultChecked />
              <Label htmlFor="preview-switch" className="text-sm">Notifications</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="preview-switch-off" />
              <Label htmlFor="preview-switch-off" className="text-sm">Dark mode</Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox id="preview-check" defaultChecked />
              <Label htmlFor="preview-check" className="text-sm">Accept terms</Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox id="preview-check-off" />
              <Label htmlFor="preview-check-off" className="text-sm">Send analytics</Label>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex gap-1">
              <Toggle aria-label="Bold" size="sm"><Bold className="h-4 w-4" /></Toggle>
              <Toggle aria-label="Italic" size="sm"><Italic className="h-4 w-4" /></Toggle>
              <Toggle aria-label="Underline" size="sm" defaultPressed><Underline className="h-4 w-4" /></Toggle>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">
                Volume —
                {sliderVal[0]}
                %
              </Label>
              <Slider value={sliderVal} onValueChange={setSliderVal} max={100} step={1} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Progress</Label>
              <Progress value={progress} />
            </div>
          </div>
        </div>
      </section>
      <Separator />
      {/* ── Avatars ── */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Avatars</h3>
        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>shadcn</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar>
                  <AvatarImage src="https://github.com/maxleiter.png" />
                  <AvatarFallback>ML</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>maxleiter</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar>
                  <AvatarFallback>AB</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>Fallback avatar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </section>
      <Separator />
      {/* ── Alerts ── */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Alerts</h3>
        <div className="grid gap-2">
          <Alert>
            <Bell className="h-4 w-4" />
            <AlertTitle>Heads up!</AlertTitle>
            <AlertDescription>You can add components using the CLI.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Something went wrong with your request.</AlertDescription>
          </Alert>
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>Changes saved successfully.</AlertDescription>
          </Alert>
          <Alert variant="info">
            <Info className="h-4 w-4" />
            <AlertTitle>Note</AlertTitle>
            <AlertDescription>This feature is in beta.</AlertDescription>
          </Alert>
        </div>
      </section>
      <Separator />
      {/* ── Accordion ── */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Accordion</h3>
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>Is it accessible?</AccordionTrigger>
            <AccordionContent>
              Yes. It adheres to the WAI-ARIA design pattern.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Is it styled?</AccordionTrigger>
            <AccordionContent>
              Yes. It comes with default styles via the neumorphism CSS layer.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
      <Separator />
      {/* ── Table ── */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Table</h3>
        <div className="rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Project Alpha</TableCell>
                <TableCell><Badge variant="secondary">Active</Badge></TableCell>
                <TableCell className="text-right">$2,500</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Project Beta</TableCell>
                <TableCell><Badge variant="outline">Pending</Badge></TableCell>
                <TableCell className="text-right">$1,200</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Project Gamma</TableCell>
                <TableCell><Badge variant="secondary">Active</Badge></TableCell>
                <TableCell className="text-right">$4,800</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>
      <Separator />
      {/* ── Skeleton Loading ── */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Skeleton</h3>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </section>
      <Separator />
      {/* ── Dropdown & Popover ── */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Menus &amp; Popovers</h3>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Dropdown
                <Settings className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                {' '}
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                {' '}
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell className="mr-2 h-4 w-4" />
                {' '}
                Notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">Popover</Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Dimensions</h4>
                <div className="grid gap-2">
                  <div className="grid grid-cols-3 items-center gap-2">
                    <Label className="text-xs">Width</Label>
                    <Input className="col-span-2 h-8" defaultValue="100%" />
                  </div>
                  <div className="grid grid-cols-3 items-center gap-2">
                    <Label className="text-xs">Height</Label>
                    <Input className="col-span-2 h-8" defaultValue="auto" />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </section>
      <Separator />
      {/* ── Toasts ── */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Toasts</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast('Default toast', { description: 'This is a default notification.' })}
          >
            Default
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success('Success', { description: 'Operation completed.' })}
          >
            Success
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.error('Error', { description: 'Something went wrong.' })}
          >
            Error
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info('Info', { description: 'Here is some information.' })}
          >
            Info
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.warning('Warning', { description: 'Please be careful.' })}
          >
            Warning
          </Button>
        </div>
      </section>
      <Separator />
      {/* ── Prompt Form ── */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Prompt Form</h3>
        <NotionPromptForm />
      </section>
      {/* ── Neumorphic Orb ── */}
      <div className="flex flex-col items-start gap-4 rounded-3xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-2xl font-bold tracking-tight">
            Surface Physics
          </p>
          <p className="text-muted-foreground text-sm">
            Switch to the Neumorphism preset to preview nested depth.
          </p>
        </div>
        <div className="neu-float neu-orb">
          <div className="neu-orb-inner">
            <div className="neu-orb-core" />
          </div>
        </div>
      </div>
    </div>
  )
}