"use client";

import { Check, Circle, Crosshair, LogOut, MapPin, Store, Trash, UserPlus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { ShopShell } from "@/components/shell/shop-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Callout, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { DataList, Panel, PanelHeader } from "@/components/ui/panel";
import { Checkbox } from "@/components/ui/switch";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { type Me, useMe, useRequireSignIn } from "@/lib/session";
import { type Members, PROFILE_FIELDS, type ProfileKey, type Shop, setupChecklist, WEEKDAYS } from "@/lib/shops";
import { fieldErrors } from "../../new/register-form";

function problemText(err: unknown) {
  return err instanceof ApiError ? err.problem.title : "Something went wrong";
}

/* ── Setup checklist ───────────────────────────────────────────────────────────────────── */

function SetupPanel({ shop }: { shop: Shop }) {
  const steps = setupChecklist(shop);
  return (
    <Panel as="section" aria-labelledby="setup-title">
      <PanelHeader
        title={<span id="setup-title">Before customers can find you</span>}
        description="The shop stays private until every step is done and you publish it."
      />
      <ol className="flex flex-col gap-1 px-5 pb-4 pt-3">
        {steps.map((s) => (
          <li key={s.key} className="flex items-start gap-3 py-1.5">
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                s.done ? "bg-brand text-on-brand" : "border border-rule-strong text-ink-faint",
              )}
            >
              {s.done ? <Check className="size-3" strokeWidth={3} aria-hidden /> : <Circle className="size-2" aria-hidden />}
            </span>
            <span className="min-w-0">
              <span className={cn("block text-body", s.done ? "text-ink" : "text-ink-2")}>
                {s.label}
                <span className="sr-only">{s.done ? " — done" : " — not done"}</span>
              </span>
              {"later" in s && s.later ? <span className="block text-small text-ink-muted">{s.later}</span> : null}
            </span>
          </li>
        ))}
      </ol>
      <div className="border-t border-rule px-5 py-3 text-small text-ink-muted">
        Publishing becomes available once prices and a printer are set up.
      </div>
    </Panel>
  );
}

/* ── Profile ───────────────────────────────────────────────────────────────────────────── */

function ProfilePanel({ shop, onSaved }: { shop: Shop; onSaved: (s: Shop) => void }) {
  const owner = shop.your_role === "owner";
  const initial = React.useMemo(
    () => Object.fromEntries(PROFILE_FIELDS.map((f) => [f.key, shop[f.key] ?? ""])) as Record<ProfileKey, string>,
    [shop],
  );
  const [values, setValues] = React.useState(initial);
  const [errors, setErrors] = React.useState<Partial<Record<string, string>>>({});
  const [busy, setBusy] = React.useState(false);
  const changed = PROFILE_FIELDS.filter((f) => values[f.key].trim() !== initial[f.key]);

  if (!owner) {
    return (
      <Panel as="section" aria-labelledby="profile-title" className="pb-2">
        <PanelHeader title={<span id="profile-title">Shop details</span>} description="Only the owner can change these." />
        <DataList
          className="px-5"
          items={PROFILE_FIELDS.map((f) => [f.label.replace(" (optional)", ""), shop[f.key] || "—"])}
        />
      </Panel>
    );
  }

  return (
    <Panel as="section" aria-labelledby="profile-title">
      <PanelHeader title={<span id="profile-title">Shop details</span>} description="Shown to customers once the shop is published." />
      <form
        className="grid gap-4 px-5 pb-5 pt-4 @2xl/shop:grid-cols-2"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErrors({});
          const body = Object.fromEntries(changed.map((f) => [f.key, values[f.key].trim() || null]));
          try {
            onSaved(await api<Shop>(`/shops/${shop.id}`, { method: "PATCH", body }));
            toast.success("Shop details saved");
          } catch (err) {
            const fe = fieldErrors(err);
            setErrors(fe);
            if (!Object.keys(fe).length) toast.error(problemText(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        {PROFILE_FIELDS.map((f) => (
          <Field
            key={f.key}
            label={f.label}
            required={"required" in f && f.required}
            error={errors[f.key]}
            className={f.key === "name" || f.key.startsWith("address") ? "@2xl/shop:col-span-2" : undefined}
          >
            <Input
              value={values[f.key]}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              autoComplete={f.autoComplete}
              inputMode={"inputMode" in f ? f.inputMode : undefined}
              maxLength={f.key === "pincode" ? 6 : 120}
            />
          </Field>
        ))}
        <div className="@2xl/shop:col-span-2">
          <Button type="submit" loading={busy} disabled={changed.length === 0}>
            Save details
          </Button>
        </div>
      </form>
    </Panel>
  );
}

/* ── Location ──────────────────────────────────────────────────────────────────────────── */

function LocationPanel({ shop, onSaved }: { shop: Shop; onSaved: (s: Shop) => void }) {
  const owner = shop.your_role === "owner";
  const [lat, setLat] = React.useState(shop.latitude?.toString() ?? "");
  const [lng, setLng] = React.useState(shop.longitude?.toString() ?? "");
  const [busy, setBusy] = React.useState(false);
  const [locating, setLocating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function useDeviceLocation() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("This browser can't share its location. Enter the coordinates instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(5));
        setLng(pos.coords.longitude.toFixed(5));
        setLocating(false);
      },
      () => {
        setError("Location wasn't shared. You can enter the coordinates instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <Panel as="section" aria-labelledby="location-title">
      <PanelHeader
        title={<span id="location-title">Location</span>}
        description="Lets nearby customers find the shop. It becomes public when the shop is published."
      />
      <div className="flex flex-col gap-4 px-5 pb-5 pt-4">
        {owner ? (
          <>
            <div className="grid gap-4 @lg/shop:grid-cols-2">
              <Field label="Latitude" error={error ?? undefined}>
                <Input inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="28.56721" leading={<MapPin />} />
              </Field>
              <Field label="Longitude">
                <Input inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="77.24370" leading={<MapPin />} />
              </Field>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" loading={locating} onClick={useDeviceLocation}>
                <Crosshair aria-hidden />
                Use this device&rsquo;s location
              </Button>
              <Button
                type="button"
                loading={busy}
                disabled={!lat || !lng}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    onSaved(
                      await api<Shop>(`/shops/${shop.id}/location`, {
                        method: "PUT",
                        body: { latitude: Number(lat), longitude: Number(lng) },
                      }),
                    );
                    toast.success("Location saved");
                  } catch (err) {
                    setError(err instanceof ApiError && err.status === 422 ? "Enter a location in India, as decimal degrees." : problemText(err));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Save location
              </Button>
            </div>
            <p className="text-small text-ink-muted">
              Use &ldquo;this device&rsquo;s location&rdquo; only while you&rsquo;re at the shop. Your browser asks first, and
              nothing is saved until you press Save.
            </p>
          </>
        ) : (
          <p className="text-body text-ink-2">
            {shop.latitude !== null ? `${shop.latitude}, ${shop.longitude}` : "Not set yet."}
          </p>
        )}
      </div>
    </Panel>
  );
}

/* ── Opening hours ─────────────────────────────────────────────────────────────────────── */

type DayRow = { open: boolean; opens: string; closes: string };

function HoursPanel({ shop, onSaved }: { shop: Shop; onSaved: (s: Shop) => void }) {
  const owner = shop.your_role === "owner";
  const initial: DayRow[] = WEEKDAYS.map((_, day) => {
    const first = shop.hours.find((h) => h.weekday === day);
    return first ? { open: true, opens: first.opens_at, closes: first.closes_at } : { open: false, opens: "09:00", closes: "21:00" };
  });
  const split = WEEKDAYS.filter((_, d) => shop.hours.filter((h) => h.weekday === d).length > 1);
  const [rows, setRows] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const update = (day: number, patch: Partial<DayRow>) => setRows((r) => r.map((row, i) => (i === day ? { ...row, ...patch } : row)));

  return (
    <Panel as="section" aria-labelledby="hours-title">
      <PanelHeader title={<span id="hours-title">Opening hours</span>} description="Times are in India Standard Time." />
      <div className="px-5 pb-5 pt-3">
        {split.length ? (
          <Callout tone="info" className="mb-3">
            {split.join(", ")} {split.length === 1 ? "has" : "have"} more than one period. This editor shows the first; saving keeps only that one.
          </Callout>
        ) : null}
        <ul className="divide-y divide-rule">
          {rows.map((row, day) => (
            <li key={day} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
              {owner ? (
                <label className="flex w-36 cursor-pointer items-center gap-2.5 text-body text-ink">
                  <Checkbox checked={row.open} onCheckedChange={(v) => update(day, { open: v === true })} aria-label={`Open on ${WEEKDAYS[day]}`} />
                  {WEEKDAYS[day]}
                </label>
              ) : (
                <span className="w-36 text-body text-ink">{WEEKDAYS[day]}</span>
              )}
              {row.open ? (
                owner ? (
                  <div className="flex items-center gap-2">
                    <Input type="time" aria-label={`${WEEKDAYS[day]} opens`} value={row.opens} onChange={(e) => update(day, { opens: e.target.value })} className="w-32 tabular" />
                    <span className="text-small text-ink-muted">to</span>
                    <Input type="time" aria-label={`${WEEKDAYS[day]} closes`} value={row.closes} onChange={(e) => update(day, { closes: e.target.value })} className="w-32 tabular" />
                  </div>
                ) : (
                  <span className="text-body tabular text-ink-2">
                    {row.opens} – {row.closes}
                  </span>
                )
              ) : (
                <span className="text-body text-ink-muted">Closed</span>
              )}
            </li>
          ))}
        </ul>
        {error ? (
          <Callout tone="danger" className="mt-3">
            {error}
          </Callout>
        ) : null}
        {owner ? (
          <Button
            className="mt-4"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const intervals = rows.flatMap((r, weekday) => (r.open ? [{ weekday, opens_at: r.opens, closes_at: r.closes }] : []));
                onSaved(await api<Shop>(`/shops/${shop.id}/hours`, { method: "PUT", body: { intervals } }));
                toast.success("Opening hours saved");
              } catch (err) {
                setError(err instanceof ApiError && err.code === "invalid_hours" ? "Closing time must be after opening time." : problemText(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            Save hours
          </Button>
        ) : null}
      </div>
    </Panel>
  );
}

/* ── Staff ─────────────────────────────────────────────────────────────────────────────── */

function StaffPanel({ shop, me }: { shop: Shop; me: Me }) {
  const [data, setData] = React.useState<Members | null>(null);
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    api<Members>(`/shops/${shop.id}/members`, { signal: controller.signal })
      .then(setData)
      .catch((err) => {
        if (!controller.signal.aborted) setError(problemText(err));
      });
    return () => controller.abort();
  }, [shop.id, attempt]);

  const reload = () => setAttempt((n) => n + 1);

  async function act(key: string, fn: () => Promise<unknown>, success: string) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      toast.success(success);
      reload();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      setError(
        code === "already_invited"
          ? "That address already has a pending invitation."
          : code === "already_member"
            ? "That person is already a member."
            : code === "last_owner"
              ? "A shop must keep at least one owner."
              : problemText(err),
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel as="section" aria-labelledby="staff-title">
      <PanelHeader
        title={<span id="staff-title">Staff</span>}
        description="Staff can see orders, verify pickup codes and pause new orders. Only owners change prices, details or staff."
      />
      <div className="flex flex-col gap-4 px-5 pb-5 pt-3">
        {error ? <Callout tone="danger">{error}</Callout> : null}
        {!data ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <ul className="divide-y divide-rule">
            {data.members.map((m) => (
              <li key={m.user_id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-medium text-ink">
                    {m.display_name ?? m.email}
                    {m.user_id === me.user.id ? <span className="font-normal text-ink-muted"> (you)</span> : null}
                  </p>
                  {m.display_name ? <p className="truncate text-small text-ink-muted">{m.email}</p> : null}
                </div>
                <Badge tone={m.role === "owner" ? "brand" : "neutral"} size="sm">
                  {m.role === "owner" ? "Owner" : "Staff"}
                </Badge>
                {m.role === "staff" ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="danger-ghost" aria-label={`Remove ${m.display_name ?? m.email}`}>
                        <Trash aria-hidden />
                        Remove
                      </Button>
                    </DialogTrigger>
                    <DialogContent
                      title="Remove from this shop?"
                      description={`${m.display_name ?? m.email} will lose access straight away. Their own account and orders aren't affected.`}
                      footer={
                        <>
                          <DialogClose asChild>
                            <Button variant="secondary">Cancel</Button>
                          </DialogClose>
                          <DialogClose asChild>
                            <Button
                              variant="danger"
                              onClick={() => act(m.user_id, () => api(`/shops/${shop.id}/members/${m.user_id}`, { method: "DELETE" }), "Removed")}
                            >
                              Remove
                            </Button>
                          </DialogClose>
                        </>
                      }
                    />
                  </Dialog>
                ) : null}
              </li>
            ))}
            {data.invitations.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body text-ink-2">{i.email}</p>
                  <p className="text-small text-ink-muted">
                    Invited · expires {new Date(i.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <Badge tone="outline" size="sm">
                  Pending
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  loading={busy === i.id}
                  onClick={() => act(i.id, () => api(`/shops/${shop.id}/invitations/${i.id}`, { method: "DELETE" }), "Invitation cancelled")}
                >
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="flex flex-col gap-2 border-t border-rule pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            void act(
              "invite",
              () => api(`/shops/${shop.id}/invitations`, { method: "POST", body: { email: email.trim() } }).then(() => setEmail("")),
              "Invitation sent",
            );
          }}
        >
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Invite staff by email" className="min-w-48 flex-1">
              <Input type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
            </Field>
            <Button type="submit" variant="secondary" loading={busy === "invite"} disabled={!email.trim()}>
              <UserPlus aria-hidden />
              Send invitation
            </Button>
          </div>
          <p className="text-small text-ink-muted">They accept by signing in with that address.</p>
        </form>
      </div>
    </Panel>
  );
}


/* ── Page ──────────────────────────────────────────────────────────────────────────────── */

function LeaveShop({ shop }: { shop: Shop }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  return (
    <Panel as="section" className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <p className="text-body text-ink-2">You work here as staff.</p>
      <Button
        variant="danger-ghost"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api(`/me/memberships/${shop.id}`, { method: "DELETE" });
            router.push("/profile");
          } catch (err) {
            toast.error(problemText(err));
            setBusy(false);
          }
        }}
      >
        <LogOut aria-hidden />
        Leave this shop
      </Button>
    </Panel>
  );
}

function SettingsContent() {
  const { shopId } = useParams<{ shopId: string }>();
  const meState = useMe();
  useRequireSignIn(meState.status);
  const [shop, setShop] = React.useState<Shop | null>(null);
  const [missing, setMissing] = React.useState(false);
  const [savingOpen, setSavingOpen] = React.useState(false);

  React.useEffect(() => {
    const controller = new AbortController();
    api<Shop>(`/shops/${shopId}`, { signal: controller.signal })
      .then(setShop)
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) return; // useRequireSignIn redirects
        setMissing(true);
      });
    return () => controller.abort();
  }, [shopId]);

  const me = meState.status === "ready" ? meState.me : null;
  const operator = me?.user.display_name ?? me?.user.email.split("@")[0] ?? "";

  if (missing) {
    return (
      <div className="flex min-h-full items-center justify-center bg-paper p-6">
        <EmptyState
          icon={Store}
          title="Shop not found"
          action={
            <Button asChild variant="secondary">
              <Link href="/profile">Back to profile</Link>
            </Button>
          }
        >
          It doesn&rsquo;t exist, or you&rsquo;re not a member of it.
        </EmptyState>
      </div>
    );
  }

  return (
    <ShopShell
      active="settings"
      shopName={shop?.name ?? ""}
      shopCode={shop?.code ?? ""}
      operator={operator}
      operatorRole={shop?.your_role === "owner" ? "Owner" : "Staff"}
      hrefs={shop ? { settings: `/shop/${shop.id}/settings` } : {}}
      open={shop?.accepting_orders ?? false}
      openDescription={
        shop?.status === "listed" ? undefined : shop?.accepting_orders ? "Not listed yet: customers can't see the shop" : "Not listed yet"
      }
      onOpenChange={async (value) => {
        if (!shop || savingOpen) return;
        setSavingOpen(true);
        try {
          setShop(await api<Shop>(`/shops/${shop.id}/accepting`, { method: "PUT", body: { accepting: value } }));
        } catch (err) {
          toast.error(problemText(err));
        } finally {
          setSavingOpen(false);
        }
      }}
    >
      <div className="h-full overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 @3xl/shop:px-8">
          {!shop || !me ? (
            <>
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-72 w-full" />
            </>
          ) : (
            <>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-headline font-semibold text-ink">{shop.name}</h1>
                  <Badge tone={shop.status === "listed" ? "success" : "outline"} size="sm">
                    {shop.status === "listed" ? "Listed" : "Draft · not visible to customers"}
                  </Badge>
                </div>
                <p className="mt-1 text-small text-ink-muted">
                  Shop code <span className="font-mono text-ink-2">{shop.code}</span> · you&rsquo;re the {shop.your_role}
                </p>
              </div>
              {shop.your_role === "owner" && shop.status !== "listed" ? <SetupPanel shop={shop} /> : null}
              <ProfilePanel key={`p-${shop.id}`} shop={shop} onSaved={setShop} />
              <LocationPanel key={`l-${shop.id}`} shop={shop} onSaved={setShop} />
              <HoursPanel key={`h-${shop.id}-${shop.hours.length}`} shop={shop} onSaved={setShop} />
              {shop.your_role === "owner" ? <StaffPanel shop={shop} me={me} /> : <LeaveShop shop={shop} />}
            </>
          )}
        </div>
      </div>
    </ShopShell>
  );
}

export function SettingsView() {
  return (
    <React.Suspense fallback={<div className="min-h-full bg-paper" />}>
      <SettingsContent />
    </React.Suspense>
  );
}
