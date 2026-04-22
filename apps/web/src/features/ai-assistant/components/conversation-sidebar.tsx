import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  differenceInCalendarDays,
  formatDistanceToNow,
  isThisWeek,
  parseISO,
} from 'date-fns'
import groupBy from 'lodash/groupBy'
import {
  MessageSquare,
  MoreHorizontal,
  PenLine,
  Pin,
  PinOff,
  Plus,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'

import {
  deleteConversation,
  listConversations,
  pinConversation,
  renameConversation,
} from '@/features/ai-assistant/api/assistant'
import { useAiAssistant } from '@/features/ai-assistant/ai-assistant-context'
import { Button } from '@workspace/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/ui/dropdown-menu'
import { ScrollArea } from '@workspace/ui/components/ui/scroll-area'
import { cn } from '@workspace/ui/lib/utils'

export function ConversationSidebar() {
  const { conversationId, loadConversation, startNewConversation } =
    useAiAssistant()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['ai-conversations'],
    queryFn: () => listConversations(50, 0),
    staleTime: 10_000,
  })

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const handleRename = async (id: string) => {
    const trimmed = editTitle.trim()
    if (!trimmed) {
      setEditingId(null)
      return
    }
    try {
      await renameConversation(id, trimmed)
      await queryClient.invalidateQueries({ queryKey: ['ai-conversations'] })
    } catch {
      // silently fail
    }
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteConversation(id)
      if (conversationId === id) {
        startNewConversation()
      }
      await queryClient.invalidateQueries({ queryKey: ['ai-conversations'] })
    } catch {
      // silently fail
    }
  }

  const handlePin = async (id: string, currentlyPinned: boolean) => {
    try {
      await pinConversation(id, !currentlyPinned)
      await queryClient.invalidateQueries({ queryKey: ['ai-conversations'] })
    } catch {
      // silently fail
    }
  }

  const conversations = data?.data ?? []

  function getGroup(updatedAt: string): string {
    const diff = differenceInCalendarDays(new Date(), parseISO(updatedAt))
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
    if (isThisWeek(parseISO(updatedAt), { weekStartsOn: 1 })) return 'This week'
    return 'Earlier'
  }

  const pinned = conversations.filter((c) => c.pinnedAt !== null)
  const unpinned = conversations.filter((c) => c.pinnedAt === null)

  const GROUP_ORDER = ['Today', 'Yesterday', 'This week', 'Earlier']
  const grouped = groupBy(unpinned, (c) => getGroup(c.updatedAt))

  return (
    <div className="flex h-full w-fit flex-col border-r border-border/60 bg-sidebar">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase">
          Threads
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={startNewConversation}
          aria-label="New conversation"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-2">
          {isLoading ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              Loading…
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              No past conversations
            </div>
          ) : (
            <>
              {pinned.length > 0 && (
                <div className="mb-1">
                  <p className="mb-0.5 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    Pinned
                  </p>
                  {pinned.map((conv) => (
                    <ConversationRow
                      key={conv.id}
                      conv={conv}
                      isActive={conversationId === conv.id}
                      isEditing={editingId === conv.id}
                      editTitle={editTitle}
                      onSelect={() => void loadConversation(conv.id)}
                      onEditTitleChange={setEditTitle}
                      onRenameStart={() => {
                        setEditTitle(conv.title)
                        setEditingId(conv.id)
                      }}
                      onRenameCommit={() => void handleRename(conv.id)}
                      onRenameCancel={() => setEditingId(null)}
                      onDelete={() => void handleDelete(conv.id)}
                      onPin={() => void handlePin(conv.id, true)}
                    />
                  ))}
                </div>
              )}

              {GROUP_ORDER.filter((g) => grouped[g]?.length).map((group) => (
                <div key={group} className="mb-1">
                  <p className="mb-0.5 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                    {group}
                  </p>
                  {grouped[group]!.map((conv) => (
                    <ConversationRow
                      key={conv.id}
                      conv={conv}
                      isActive={conversationId === conv.id}
                      isEditing={editingId === conv.id}
                      editTitle={editTitle}
                      onSelect={() => void loadConversation(conv.id)}
                      onEditTitleChange={setEditTitle}
                      onRenameStart={() => {
                        setEditTitle(conv.title)
                        setEditingId(conv.id)
                      }}
                      onRenameCommit={() => void handleRename(conv.id)}
                      onRenameCancel={() => setEditingId(null)}
                      onDelete={() => void handleDelete(conv.id)}
                      onPin={() => void handlePin(conv.id, false)}
                    />
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

interface ConversationRowProps {
  conv: {
    id: string
    title: string
    updatedAt: string
    pinnedAt: string | null
  }
  isActive: boolean
  isEditing: boolean
  editTitle: string
  onSelect: () => void
  onEditTitleChange: (v: string) => void
  onRenameStart: () => void
  onRenameCommit: () => void
  onRenameCancel: () => void
  onDelete: () => void
  onPin: () => void
}

function ConversationRow({
  conv,
  isActive,
  isEditing,
  editTitle,
  onSelect,
  onEditTitleChange,
  onRenameStart,
  onRenameCommit,
  onRenameCancel,
  onDelete,
  onPin,
}: ConversationRowProps) {
  const isPinned = conv.pinnedAt !== null

  return (
    <div
      className={cn(
        'group relative mx-1 flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary/12 text-foreground font-medium'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
      )}
    >
      {isPinned ? (
        <Pin
          className={cn(
            'size-3.5 shrink-0 rotate-45',
            isActive ? 'text-primary' : 'text-muted-foreground/60',
          )}
        />
      ) : (
        <MessageSquare
          className={cn('size-3.5 shrink-0', isActive ? 'text-primary' : '')}
        />
      )}

      {isEditing ? (
        <input
          className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-ring"
          value={editTitle}
          onChange={(e) => onEditTitleChange(e.target.value)}
          onBlur={onRenameCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onRenameCommit()
            if (e.key === 'Escape') onRenameCancel()
          }}
          autoFocus
        />
      ) : (
        <div className="min-w-0 flex-1 overflow-hidden">
          <button
            type="button"
            className="w-full overflow-hidden text-left"
            onClick={onSelect}
          >
            <p className="truncate text-xs leading-tight">{conv.title}</p>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground/60">
              {formatDistanceToNow(parseISO(conv.updatedAt), {
                addSuffix: true,
              })}
            </p>
          </button>
        </div>
      )}

      {!isEditing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="shrink-0 rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground data-[state=open]:text-foreground"
              aria-label="Conversation options"
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onPin}>
              {isPinned ? (
                <>
                  <PinOff className="mr-2 size-3.5" />
                  Unpin
                </>
              ) : (
                <>
                  <Pin className="mr-2 size-3.5" />
                  Pin
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRenameStart}>
              <PenLine className="mr-2 size-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="mr-2 size-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
