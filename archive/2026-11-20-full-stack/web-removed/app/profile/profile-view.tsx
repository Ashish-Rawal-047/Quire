"use client";

import { ArrowRight, LogOut, MailOpen, Plus, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { CustomerShell } from "@/components/shell/customer-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout, Skeleton } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { type Me, useMe, useRequireSignIn } from "@/lib/session";

export function initialsFor(me: Me | null): string {
  if (!me) return "";
  const source = me.user.display_name || me.user.email.split("@")[0];
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function NameForm({ me, onSaved }: { me: Me; onSaved: (me: Me) => void }) {
  const [name, setName] = React.useState(me.user.display_name ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const dirty = name.trim() !== (me.user.display_name ?? "");
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          onSaved(await api<Me>("/me", { method: "PATCH", body: { display_name: name.trim() || null } }));
          toast.success("Name saved");
        } catch (err) {
          setError(err instanceof ApiError ? err.problem.title : "Couldn't save");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Your name" error={error ?? undefined} className="min-w-48 flex-1">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" />
        </Field>
        <Button type="submit" variant="secondary" loading={busy} disabled={!dirty}>
          Save
        </Button>
      </div>
      <p className="text-small text-ink-muted">Shown to the owners of shops you work at.</p>
    </form>
  );
}

export function ProfileView() {
  const state = useMe();
  useRequireSignIn(state.status);
  const router = useRouter();
  const me = state.status === "ready" ? state.me : null;
  const [busy, setBusy] = React.useState<string | null>(null);

  async function respond(id: string, action: "accept" | "decline") {
    setBusy(id);
    try {
      state.setMe(await api<Me>(`/me/invitations/${id}/${action}`, { method: "POST" }));
      toast.success(action === "accept" ? "You've joined the shop" : "Invitation declined");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.problem.title : "Something went wrong");
      state.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function signOut(everywhere: boolean) {
    setBusy(everywhere ? "all" : "one");
    try {
      await api(everywhere ? "/auth/logout-all" : "/auth/logout", { method: "POST" });
    } finally {
      router.replace("/sign-in");
    }
  }

  return (
    <CustomerShell active="profile" initials={initialsFor(me)}>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-10 pt-6">
        <div>
          <h1 className="text-headline font-semibold text-ink">Profile</h1>
          {me ? <p className="mt-1 text-body text-ink-2">{me.user.email}</p> : <Skeleton className="mt-2 h-5 w-48" />}
        </div>

        {state.status === "error" ? <Callout tone="danger">{state.message}</Callout> : null}

        {me && me.invitations.length > 0 ? (
          <Panel as="section" aria-labelledby="invites-title">
            <PanelHeader title={<span id="invites-title">Shop invitations</span>} description="Join a shop as staff. You'll keep ordering as yourself." />
            <ul className="divide-y divide-rule px-5 pb-2 pt-2">
              {me.invitations.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-tint text-brand-ink">
                      <MailOpen className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-body font-medium text-ink">{inv.shop_name}</p>
                      <p className="text-small text-ink-muted">
                        As staff · expires {new Date(inv.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => respond(inv.id, "decline")}>
                      Decline
                    </Button>
                    <Button size="sm" loading={busy === inv.id} disabled={busy !== null} onClick={() => respond(inv.id, "accept")}>
                      Accept
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        <Panel as="section" aria-labelledby="account-title" className="pb-5">
          <PanelHeader title={<span id="account-title">Account</span>} />
          <div className="px-5 pt-3">{me ? <NameForm me={me} onSaved={state.setMe} /> : <Skeleton className="h-16 w-full" />}</div>
        </Panel>

        <Panel as="section" aria-labelledby="shops-title">
          <PanelHeader
            title={<span id="shops-title">Your shops</span>}
            description="Shops you own or work at. Each shop's role applies only there."
            action={
              <Button asChild size="sm" variant="secondary">
                <Link href="/shop/new">
                  <Plus aria-hidden />
                  Register a shop
                </Link>
              </Button>
            }
          />
          <div className="px-5 pb-3 pt-2">
            {!me ? (
              <Skeleton className="h-12 w-full" />
            ) : me.memberships.length === 0 ? (
              <p className="py-3 text-small text-ink-muted">You don&rsquo;t own or work at any shop.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {me.memberships.map((m) => (
                  <li key={m.shop_id}>
                    <Link
                      href={`/shop/${m.shop_id}/settings`}
                      className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-hover"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-rule bg-paper text-ink-2">
                        <Store className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body font-medium text-ink">{m.shop_name}</span>
                        <span className="font-mono text-caption text-ink-muted">{m.shop_code}</span>
                      </span>
                      <Badge tone={m.role === "owner" ? "brand" : "neutral"} size="sm">
                        {m.role === "owner" ? "Owner" : "Staff"}
                      </Badge>
                      <ArrowRight className="size-4 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" loading={busy === "one"} disabled={!me || busy !== null} onClick={() => signOut(false)}>
            <LogOut aria-hidden />
            Sign out
          </Button>
          <Button variant="ghost" loading={busy === "all"} disabled={!me || busy !== null} onClick={() => signOut(true)}>
            Sign out on all devices
          </Button>
        </div>
      </div>
    </CustomerShell>
  );
}
