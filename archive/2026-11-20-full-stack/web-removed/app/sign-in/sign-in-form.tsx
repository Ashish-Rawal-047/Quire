"use client";

import { ArrowLeft, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { api, ApiError, formatWait, safeNextPath } from "@/lib/api";

type Step = { kind: "email" } | { kind: "code"; email: string; challengeId: string; resendAt: number };

/** Seconds left until `until`. The clock is read only in timers and event handlers (never while
rendering), so the page can be prerendered. */
function useCountdown(until: number | null, startedAt: number): number {
  const [now, setNow] = React.useState(startedAt);
  React.useEffect(() => {
    if (!until) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [until]);
  const reference = Math.max(now, startedAt);
  return until ? Math.max(0, Math.ceil((until - reference) / 1000)) : 0;
}

function describe(err: unknown): string {
  if (!(err instanceof ApiError)) return "Something went wrong. Try again.";
  const p = err.problem;
  switch (p.code) {
    case "invalid_email":
    case "invalid_request":
      return "Enter a valid email address.";
    case "rate_limited":
      return `Too many codes requested. Try again in ${formatWait(p.retry_after ?? 60)}.`;
    case "wrong_code":
      return p.attempts_left
        ? `That code isn't right. ${p.attempts_left} ${p.attempts_left === 1 ? "try" : "tries"} left.`
        : "That code isn't right, and it can't be used again. Send a new code.";
    case "code_expired":
      return "This code has expired or was already used. Send a new code.";
    case "verify_locked":
      return `Too many wrong codes for this address. Try again in ${formatWait(p.retry_after ?? 1800)}.`;
    case "account_disabled":
      return "This account is disabled.";
    default:
      return p.title;
  }
}

export function SignInForm() {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>({ kind: "email" });
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [requestedAt, setRequestedAt] = React.useState(0);
  const resendIn = useCountdown(step.kind === "code" ? step.resendAt : null, requestedAt);
  const codeRef = React.useRef<HTMLInputElement>(null);

  async function requestCode(address: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api<{ challenge_id: string; resend_after: number }>("/auth/otp/request", {
        method: "POST",
        body: { email: address },
      });
      const sentAt = Date.now();
      setRequestedAt(sentAt);
      setStep({ kind: "code", email: address, challengeId: res.challenge_id, resendAt: sentAt + res.resend_after * 1000 });
      setCode("");
      if (step.kind === "code") setNotice("We sent a new code. Earlier codes no longer work.");
      window.setTimeout(() => codeRef.current?.focus(), 0);
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (step.kind !== "code") return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api("/auth/otp/verify", { method: "POST", body: { challenge_id: step.challengeId, code } });
      const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
      router.replace(next);
    } catch (err) {
      setError(describe(err));
      setBusy(false);
    }
  }

  if (step.kind === "email") {
    return (
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          void requestCode(email.trim());
        }}
        noValidate
      >
        <div>
          <h1 className="text-title font-semibold text-ink">Sign in to Quire</h1>
          <p className="mt-1 text-body text-ink-2">
            We&rsquo;ll email you a 6-digit code. No password needed, and a new account is created the first time.
          </p>
        </div>
        <Field label="Email address" error={error ?? undefined}>
          <Input
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leading={<Mail />}
            placeholder="you@example.com"
            required
          />
        </Field>
        <Button type="submit" size="lg" block loading={busy} disabled={!email.trim()}>
          Send code
        </Button>
      </form>
    );
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={verify} noValidate>
      <div>
        <h1 className="text-title font-semibold text-ink">Check your email</h1>
        <p className="mt-1 text-body text-ink-2">
          Enter the code we sent to <span className="font-medium text-ink">{step.email}</span>. It works once and expires in
          10 minutes.
        </p>
      </div>
      {notice ? <Callout tone="info">{notice}</Callout> : null}
      <Field label="Sign-in code" error={error ?? undefined}>
        <Input
          ref={codeRef}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="font-mono text-title-sm tracking-[0.4em]"
          placeholder="••••••"
        />
      </Field>
      <Button type="submit" size="lg" block loading={busy} disabled={code.length !== 6}>
        Sign in
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setStep({ kind: "email" });
            setError(null);
            setNotice(null);
          }}
        >
          <ArrowLeft aria-hidden />
          Use a different email
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={resendIn > 0 || busy}
          onClick={() => void requestCode(step.email)}
        >
          {resendIn > 0 ? (
            <span>
              Resend code in <span className="tabular">{resendIn}s</span>
            </span>
          ) : (
            "Resend code"
          )}
        </Button>
      </div>
    </form>
  );
}
