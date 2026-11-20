"use client";

import { ArrowLeft, Eye, EyeOff, Lock, Mail } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Button, IconButton } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Logo } from "@/components/ui/logo";
import { Checkbox } from "@/components/ui/switch";

export function SignInLayout({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-paper">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <Link href="/" className="inline-flex rounded-md" aria-label="Quire home">
          <Logo />
        </Link>
        <Link href="/" className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-small text-ink-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Link>
      </header>
      <main className="flex flex-1 justify-center px-4 pb-16 pt-2 sm:pt-8">
        <div className="flex w-full max-w-md flex-col gap-6">
          <div className="rounded-lg border border-rule bg-surface p-6 shadow-[0_1px_2px_rgb(15_27_45/0.04)] sm:p-8">{children}</div>
          {aside}
        </div>
      </main>
    </div>
  );
}

/** Email + password form. Credentials arrive pre-filled; any password of 4+ characters works. */
export function CredentialsForm({
  title,
  description,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  error,
  submitLabel,
  onSubmit,
  footer,
}: {
  title: string;
  description: string;
  email: string;
  onEmailChange: (v: string) => void;
  password: string;
  onPasswordChange: (v: string) => void;
  error?: string | null;
  submitLabel: string;
  onSubmit: () => void;
  footer?: React.ReactNode;
}) {
  const [show, setShow] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const rememberId = React.useId();
  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        window.setTimeout(() => {
          setBusy(false);
          onSubmit();
        }, 450);
      }}
    >
      <div>
        <h1 className="text-title font-semibold text-ink">{title}</h1>
        <p className="mt-1 text-body text-ink-2">{description}</p>
      </div>
      <Field label="Email" error={error ?? undefined}>
        <Input type="email" autoComplete="username" value={email} onChange={(e) => onEmailChange(e.target.value)} leading={<Mail />} />
      </Field>
      <Field label="Password">
        <Input
          type={show ? "text" : "password"}
          autoComplete="current-password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          leading={<Lock />}
          trailing={
            <IconButton type="button" size="sm" variant="ghost" label={show ? "Hide password" : "Show password"} onClick={() => setShow((v) => !v)}>
              {show ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            </IconButton>
          }
        />
      </Field>
      <label htmlFor={rememberId} className="flex cursor-pointer items-center gap-2.5 text-small text-ink-2">
        <Checkbox id={rememberId} defaultChecked />
        Keep me signed in on this device
      </label>
      <Button type="submit" size="lg" block loading={busy} disabled={!email.trim() || !password}>
        {submitLabel}
      </Button>
      {footer}
    </form>
  );
}
