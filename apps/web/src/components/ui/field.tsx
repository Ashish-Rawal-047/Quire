"use client";

import { CircleExclamationPoint } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/cn";

type FieldContextValue = {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
};

const FieldContext = React.createContext<FieldContextValue | null>(null);

/** Inputs call this to pick up id / aria wiring from the surrounding <Field>. */
export function useFieldControl() {
  return React.useContext(FieldContext);
}

export interface FieldProps {
  label: React.ReactNode;
  /** Short guidance shown under the label's control. */
  hint?: React.ReactNode;
  /** Error message; marks the control invalid and is announced to screen readers. */
  error?: React.ReactNode;
  required?: boolean;
  /** Visually hide the label (it stays available to assistive tech). */
  hideLabel?: boolean;
  /** Content aligned to the right of the label, e.g. a "Reset" link. */
  labelAside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  id?: string;
}

export function Field({
  label,
  hint,
  error,
  required = false,
  hideLabel,
  labelAside,
  className,
  children,
  id: idProp,
}: FieldProps) {
  const autoId = React.useId();
  const id = idProp ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error), required }}>
      <div className={cn("flex flex-col gap-1.5", className)}>
        <div className={cn("flex items-baseline justify-between gap-3", hideLabel && "sr-only")}>
          <label htmlFor={id} className="text-small font-medium text-ink">
            {label}
            {required ? (
              <span className="text-ink-muted" aria-hidden>
                {" "}
                *
              </span>
            ) : null}
          </label>
          {labelAside}
        </div>
        {children}
        {error ? (
          <p id={errorId} className="flex items-start gap-1.5 text-small text-danger-ink" role="alert">
            <CircleExclamationPoint className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}
        {hint ? (
          <p id={hintId} className="text-small text-ink-muted">
            {hint}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

export const controlBase = cn(
  "w-full rounded-md border border-rule-strong bg-surface text-input text-ink sm:text-body",
  "placeholder:text-ink-faint transition-[border-color,box-shadow] duration-150",
  "hover:border-ink-faint",
  "focus-visible:border-focus focus-visible:shadow-[0_0_0_3px_var(--brand-tint-strong)] focus-visible:outline-none",
  "aria-invalid:border-danger aria-invalid:focus-visible:shadow-[0_0_0_3px_var(--danger-tint)]",
  "disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-muted",
);

function useControlProps<T extends { id?: string; "aria-describedby"?: string; required?: boolean }>(
  props: T,
) {
  const field = useFieldControl();
  return {
    id: props.id ?? field?.id,
    "aria-describedby": props["aria-describedby"] ?? field?.describedBy,
    "aria-invalid": field?.invalid || undefined,
    required: props.required ?? field?.required,
  };
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Leading adornment, e.g. ₹ or a search icon. */
  leading?: React.ReactNode;
  /** Trailing adornment, e.g. a unit or a clear button. */
  trailing?: React.ReactNode;
  inputSize?: "md" | "lg";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, leading, trailing, inputSize = "md", ...props },
  ref,
) {
  const control = useControlProps(props);
  const input = (
    <input
      ref={ref}
      {...props}
      {...control}
      className={cn(
        controlBase,
        inputSize === "lg" ? "h-12 px-4" : "h-10 px-3",
        leading ? (inputSize === "lg" ? "pl-11" : "pl-9") : null,
        trailing ? "pr-10" : null,
        className,
      )}
    />
  );
  if (!leading && !trailing) return input;
  return (
    <div className="relative">
      {leading ? (
        <span
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 flex items-center text-ink-muted [&_svg]:size-[18px]",
            inputSize === "lg" ? "pl-4" : "pl-3",
          )}
        >
          {leading}
        </span>
      ) : null}
      {input}
      {trailing ? (
        <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-small text-ink-muted">
          {trailing}
        </span>
      ) : null}
    </div>
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 3, ...props }, ref) {
  const control = useControlProps(props);
  return (
    <textarea
      ref={ref}
      rows={rows}
      {...props}
      {...control}
      className={cn(controlBase, "min-h-20 resize-y px-3 py-2.5", className)}
    />
  );
});

/** Native select: best-in-class accessibility and mobile pickers, styled to match. */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  const control = useControlProps(props);
  return (
    <div className="relative">
      <select
        ref={ref}
        {...props}
        {...control}
        className={cn(controlBase, "h-10 cursor-pointer appearance-none pl-3 pr-9", className)}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
      >
        <path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
});
