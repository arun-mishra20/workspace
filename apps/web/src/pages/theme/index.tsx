import { useMemo, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/ui/avatar"
import { Badge } from "@workspace/ui/components/ui/badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/ui/command"
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
} from "@workspace/ui/components/ui/dropdown-menu"
import { Field, FieldLabel } from "@workspace/ui/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@workspace/ui/components/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/ui/popover"
import { Switch } from "@workspace/ui/components/ui/switch"
import { Button } from "@workspace/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/ui/card";
import { Input } from "@workspace/ui/components/ui/input";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { ThemeEditorPanel } from "./components/theme-editor-panel";
import { MainLayout } from "@/components/layouts/main-layout";
import { ArrowUp, AtSign, Book, Globe, Paperclip, Plus, X } from "lucide-react"



const SAMPLE_DATA = {
  mentionable: [
    {
      type: "page",
      title: "Meeting Notes",
      image: "📝",
    },
    {
      type: "page",
      title: "Project Dashboard",
      image: "📊",
    },
    {
      type: "page",
      title: "Ideas & Brainstorming",
      image: "💡",
    },
    {
      type: "page",
      title: "Calendar & Events",
      image: "📅",
    },
    {
      type: "page",
      title: "Documentation",
      image: "📚",
    },
    {
      type: "page",
      title: "Goals & Objectives",
      image: "🎯",
    },
    {
      type: "page",
      title: "Budget Planning",
      image: "💰",
    },
    {
      type: "page",
      title: "Team Directory",
      image: "👥",
    },
    {
      type: "page",
      title: "Technical Specs",
      image: "🔧",
    },
    {
      type: "page",
      title: "Analytics Report",
      image: "📈",
    },
    {
      type: "user",
      title: "shadcn",
      image: "https://github.com/shadcn.png",
      workspace: "Workspace",
    },
    {
      type: "user",
      title: "maxleiter",
      image: "https://github.com/maxleiter.png",
      workspace: "Workspace",
    },
    {
      type: "user",
      title: "evilrabbit",
      image: "https://github.com/evilrabbit.png",
      workspace: "Workspace",
    },
  ],
  models: [
    {
      name: "Auto",
    },
    {
      name: "Agent Mode",
      badge: "Beta",
    },
    {
      name: "Plan Mode",
    },
  ],
}

function MentionableIcon({
  item,
}: {
  item: (typeof SAMPLE_DATA.mentionable)[0]
}) {
  return item.type === "page" ? (
    <span className="flex size-4 items-center justify-center">
      {item.image}
    </span>
  ) : (
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
      {} as Record<string, typeof SAMPLE_DATA.mentionable>
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
                  size={!hasMentions ? "sm" : "icon-sm"}
                  className="transition-transform"
                  data-slot="badge"
                >
                  <AtSign /> {!hasMentions && "Add context"}
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
                        heading={type === "page" ? "Pages" : "Users"}
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
                  (item) => item.title === mention
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
                <InputGroupButton size="sm" className="rounded-full"
                  data-slot="badge"
                >
                  <Globe /> All Sources
                </InputGroupButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-72">
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    asChild
                    onSelect={(e) => e.preventDefault()}
                  >
                    <label htmlFor="web-search">
                      <Globe /> Web Search{" "}
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
                      <Globe /> Apps and Integrations
                      <Switch id="apps" className="ml-auto" defaultChecked />
                    </label>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Globe /> All Sources I can access
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
                              .filter((item) => item.type === "user")
                              .map((user) => (
                                <CommandItem
                                  key={user.title}
                                  value={user.title}
                                  onSelect={() => {
                                    // Handle user selection here
                                    console.log("Selected user:", user.title)
                                  }}
                                >
                                  <Avatar className="size-4">
                                    <AvatarImage src={user.image} />
                                    <AvatarFallback>
                                      {user.title[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  {user.title}{" "}
                                  <span className="text-muted-foreground">
                                    - {user.workspace}
                                  </span>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuItem>
                    <Book /> Help Center
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <Plus /> Connect Apps
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
  );
}

function PreviewSandbox() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="destructive">Danger</Button>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Sample Card</CardTitle>
          <CardDescription>
            Card, inputs, and typography using the selected preset.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Project name" />
          <Textarea placeholder="Brief product description..." />
          <p className="text-muted-foreground text-sm">
            Muted text remains accessible in each preset.
          </p>
        </CardContent>
      </Card>

      <NotionPromptForm />


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
  );
}
