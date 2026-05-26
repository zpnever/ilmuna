import * as AvatarPrimitive from '@radix-ui/react-avatar'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import { Slot } from '@radix-ui/react-slot'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-full text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/70',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--button-primary-bg)] text-[var(--button-primary-text)] shadow-lg shadow-black/10 hover:-translate-y-0.5 hover:bg-[var(--button-primary-hover-bg)]',
        secondary: 'bg-[var(--surface-elevated)] text-[var(--foreground)] ring-1 ring-[color:var(--border-subtle)] hover:bg-[var(--surface-muted)]',
        ghost: 'text-ink-700 hover:bg-black/5',
        gold: 'bg-gold-400 text-black hover:bg-gold-300',
        danger: 'bg-[#7f1d1d] text-white hover:bg-[#991b1b]',
      },
      size: {
        sm: 'h-9 px-3.5',
        md: 'h-11 px-5',
        lg: 'h-12 px-6',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ asChild, className, variant, size, ...props }: ButtonProps) {
  const Component = asChild ? Slot : 'button'
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-11 w-full rounded-2xl border border-[color:var(--border-subtle)] bg-[var(--surface-elevated)] px-4 text-sm text-[var(--foreground)] outline-none placeholder:text-ink-400 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'flex min-h-28 w-full rounded-3xl border border-[color:var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3 text-sm text-[var(--foreground)] outline-none placeholder:text-ink-400 focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20',
        className,
      )}
      {...props}
    />
  )
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-[color:var(--border-soft)] bg-[var(--surface-card)] p-5 shadow-[0_16px_60px_-30px_rgba(0,0,0,0.25)] backdrop-blur',
        className,
      )}
      {...props}
    />
  )
}

export function Badge({
  className,
  variant = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: 'neutral' | 'gold' | 'success' | 'outline'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        variant === 'neutral' && 'bg-black/5 text-ink-700',
        variant === 'gold' && 'bg-gold-400/15 text-gold-500',
        variant === 'success' && 'bg-emerald-500/12 text-emerald-700',
        variant === 'outline' && 'border border-black/10 text-ink-700',
        className,
      )}
      {...props}
    />
  )
}

export function Avatar({
  src,
  fallback,
  className,
}: {
  src: string
  fallback: string
  className?: string
}) {
  return (
    <AvatarPrimitive.Root
      className={cn('relative flex h-11 w-11 shrink-0 overflow-hidden rounded-full ring-1 ring-black/8', className)}
    >
      <AvatarPrimitive.Image className="h-full w-full object-cover" src={src} alt={fallback} />
      <AvatarPrimitive.Fallback className="flex h-full w-full items-center justify-center bg-ink-100 text-sm font-semibold text-ink-700">
        {fallback.slice(0, 2).toUpperCase()}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}

export function TabsRoot(props: TabsPrimitive.TabsProps) {
  return <TabsPrimitive.Root {...props} />
}

export function TabsList({ className, ...props }: TabsPrimitive.TabsListProps) {
  return (
    <TabsPrimitive.List
      className={cn('inline-flex rounded-full bg-[var(--surface-muted)] p-1 text-sm', className)}
      {...props}
    />
  )
}

export function TabsTrigger({ className, ...props }: TabsPrimitive.TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'rounded-full px-4 py-2 font-medium text-ink-500 transition data-[state=active]:bg-[var(--surface-elevated)] data-[state=active]:text-ink-900 data-[state=active]:shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

export function TabsContent({ className, ...props }: TabsPrimitive.TabsContentProps) {
  return <TabsPrimitive.Content className={cn('outline-none', className)} {...props} />
}

export function Dialog(props: DialogPrimitive.DialogProps) {
  return <DialogPrimitive.Root {...props} />
}

export const DialogTrigger = DialogPrimitive.Trigger

export function DialogContent({
  children,
  className,
  overlayClassName,
  hideCloseButton = false,
}: DialogPrimitive.DialogContentProps & {
  children: ReactNode
  overlayClassName?: string
  hideCloseButton?: boolean
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={cn('fixed inset-0 z-50 bg-black/35 backdrop-blur-sm', overlayClassName)} />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-[min(92vw,780px)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-[color:var(--border-subtle)] bg-[var(--surface-card)] p-6 shadow-2xl outline-none',
          className,
        )}
      >
        {children}
        {!hideCloseButton ? (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-2 text-ink-500 transition hover:bg-black/5 hover:text-ink-900">
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description

export function DropdownMenu(props: DropdownMenuPrimitive.DropdownMenuProps) {
  return <DropdownMenuPrimitive.Root {...props} />
}

export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

export function DropdownMenuContent({
  className,
  ...props
}: DropdownMenuPrimitive.DropdownMenuContentProps) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={10}
        className={cn(
          'z-50 min-w-64 rounded-[1.75rem] border border-[color:var(--border-subtle)] bg-[var(--surface-card)] p-2 shadow-2xl outline-none',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

export function DropdownMenuItem({
  className,
  ...props
}: DropdownMenuPrimitive.DropdownMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        'flex cursor-pointer items-center rounded-2xl px-4 py-3 text-sm text-ink-700 outline-none transition hover:bg-black/5 focus:bg-black/5',
        className,
      )}
      {...props}
    />
  )
}

export function ScrollArea({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <ScrollAreaPrimitive.Root className={cn('overflow-hidden', className)}>
      <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar
        className="flex touch-none select-none bg-transparent p-0.5 transition-colors"
        orientation="vertical"
      >
        <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-black/15" />
      </ScrollAreaPrimitive.Scrollbar>
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-500">{eyebrow}</p> : null}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">{title}</h1>
          {description ? <p className="max-w-2xl text-sm text-ink-500 sm:text-base">{description}</p> : null}
        </div>
      </div>
      {action}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <Card className="flex min-h-64 flex-col items-center justify-center gap-4 border-dashed text-center">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-ink-900">{title}</h3>
        <p className="mx-auto max-w-md text-sm text-ink-500">{description}</p>
      </div>
      {action}
    </Card>
  )
}
