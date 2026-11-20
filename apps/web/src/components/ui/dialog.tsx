"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/**
 * Accessible modal (focus trap, Esc, labelled). On phones it docks to the bottom as a sheet
 * so actions sit in thumb reach; from `sm` up it is a centred dialog.
 */
export function DialogContent({
  title,
  description,
  children,
  footer,
  className,
  hideClose,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  hideClose?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-scrim data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex max-h-[min(88dvh,44rem)] flex-col bg-surface shadow-overlay outline-none",
          "inset-x-0 bottom-0 rounded-t-lg data-[state=open]:animate-sheet-in",
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(92vw,30rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:data-[state=open]:animate-rise-in",
          className,
        )}
      >
        <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-rule-strong sm:hidden" />
        <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-4 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            <DialogPrimitive.Title className="text-title font-semibold text-ink">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-body text-ink-muted">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          {hideClose ? null : (
            <DialogPrimitive.Close
              className="-mr-2 -mt-1 flex size-10 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-hover hover:text-ink"
              aria-label="Close"
            >
              <X className="size-5" aria-hidden />
            </DialogPrimitive.Close>
          )}
        </div>
        {children ? <div className="overflow-y-auto px-5 py-2 sm:px-6">{children}</div> : null}
        {footer ? (
          <div className="flex flex-col-reverse gap-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:flex-row sm:justify-end sm:px-6 sm:pb-6">
            {footer}
          </div>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
