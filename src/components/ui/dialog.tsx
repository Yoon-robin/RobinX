import * as React from "react"
import { cn } from "cn"
import { Dialog as DialogPrimitive } from "radix-ui"

import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

// 창 제목 줄(끌기·최소화·닫기)은 대화상자가 열려 있어도 쓸 수 있다. 그곳을 누른 것은 바깥 클릭으로 보지 않는다.
function keepOpenOnTitlebar(handler?: (event: Event) => void) {
  return (event: Event) => {
    if ((event.target as Element | null)?.closest?.("[data-app-titlebar]")) {
      event.preventDefault()
      return
    }
    handler?.(event)
  }
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "below-titlebar fixed inset-0 isolate z-50 duration-200 ease-(--ease-out-quint) data-closed:duration-[120ms] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * 창 내용이 그려질 때(포커스가 창 안으로 옮겨 가기 전에) 그때 포커스가 있던 요소를 기억한다.
 * DialogContent 함수는 창이 닫혀 있을 때도 불리므로 거기서는 열기 직전을 알 수 없다.
 */
function RememberOpener({ into }: { into: React.RefObject<Element | null> }) {
  React.useLayoutEffect(() => {
    into.current = document.activeElement
  }, [into])
  return null
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  onInteractOutside,
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  // 열기 직전에 포커스가 있던 요소 (RememberOpener가 채운다). Radix는 DialogTrigger로 연 창만 닫을 때 포커스를 되돌려 주고,
  // 상태로 여는 창(남은 흔적 찾기·강제 제거 등)은 body로 가 버려서 키보드로 쓰던 사람이 처음부터 다시 Tab을 눌러야 했다.
  const opener = React.useRef<Element | null>(null)
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        onInteractOutside={keepOpenOnTitlebar(onInteractOutside as (event: Event) => void)}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event)
          if (event.defaultPrevented) return
          const el = opener.current
          if (el instanceof HTMLElement && el !== document.body && el.isConnected) {
            event.preventDefault()
            el.focus({ preventScroll: true })
          }
        }}
        className={cn(
          "fixed top-[max(4rem,12vh)] left-1/2 z-50 grid max-h-[calc(100vh-max(4rem,12vh)-1rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 gap-4 overflow-y-auto bg-popover p-4 text-sm text-popover-foreground duration-200 ease-(--ease-out-quint) outline-none data-closed:duration-150 sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        <RememberOpener into={opener} />
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button
              variant="ghost"
              className="absolute top-2 right-2"
              size="icon-sm"
            >
              <XIcon
              />
              <span className="sr-only">닫기</span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
