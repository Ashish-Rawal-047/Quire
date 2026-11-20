"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Callout, Skeleton } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { api, ApiError } from "@/lib/api";
import { useMe, useRequireSignIn } from "@/lib/session";
import { PROFILE_FIELDS, type ProfileKey, type Shop } from "@/lib/shops";

export function fieldErrors(err: unknown): Partial<Record<string, string>> {
  if (!(err instanceof ApiError) || !err.problem.errors) return {};
  const out: Record<string, string> = {};
  for (const e of err.problem.errors) {
    const key = e.loc[e.loc.length - 1];
    out[key] = e.msg.replace(/^Value error, /, "");
  }
  return out;
}

export function RegisterShopForm() {
  const state = useMe();
  useRequireSignIn(state.status);
  const router = useRouter();
  const [values, setValues] = React.useState<Partial<Record<ProfileKey, string>>>({});
  const [errors, setErrors] = React.useState<Partial<Record<string, string>>>({});
  const [problem, setProblem] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setProblem(null);
    const body = Object.fromEntries(Object.entries(values).filter(([, v]) => v && v.trim()));
    try {
      const shop = await api<Shop>("/shops", { method: "POST", body });
      router.push(`/shop/${shop.id}/settings`);
    } catch (err) {
      setErrors(fieldErrors(err));
      setProblem(err instanceof ApiError && !err.problem.errors ? err.problem.title : null);
      setBusy(false);
    }
  }

  if (state.status !== "ready") {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={submit} noValidate>
      <div>
        <Link href="/profile" className="inline-flex items-center gap-1.5 text-small text-ink-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden />
          Profile
        </Link>
        <h1 className="mt-3 text-headline font-semibold text-ink">Register your shop</h1>
        <p className="mt-1 text-body text-ink-2">
          You&rsquo;ll be the owner. The shop stays private until it has prices and a printer set up and you publish it.
        </p>
      </div>
      {problem ? <Callout tone="danger">{problem}</Callout> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {PROFILE_FIELDS.map((f) => (
          <Field
            key={f.key}
            label={f.label}
            required={"required" in f && f.required}
            error={errors[f.key]}
            className={f.key === "name" || f.key.startsWith("address") ? "sm:col-span-2" : undefined}
          >
            <Input
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              autoComplete={f.autoComplete}
              inputMode={"inputMode" in f ? f.inputMode : undefined}
              maxLength={f.key === "pincode" ? 6 : 120}
            />
          </Field>
        ))}
      </div>
      <Button type="submit" size="lg" loading={busy} disabled={!values.name?.trim()} className="self-start">
        Register shop
      </Button>
    </form>
  );
}
