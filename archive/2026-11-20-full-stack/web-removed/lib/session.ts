"use client";

import * as React from "react";
import { api, ApiError } from "./api";

export type Membership = { shop_id: string; shop_code: string; shop_name: string; role: "owner" | "staff" };
export type Invitation = { id: string; shop_name: string; role: "staff"; expires_at: string };
export type Me = {
  user: { id: string; email: string; display_name: string | null };
  memberships: Membership[];
  invitations: Invitation[];
};

type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | { status: "ready"; me: Me };

/** The signed-in account, from the server. Nothing about identity or roles is kept client-side. */
export function useMe(): State & { refresh: () => void; setMe: (me: Me) => void } {
  const [state, setState] = React.useState<State>({ status: "loading" });
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    api<Me>("/me", { signal: controller.signal })
      .then((me) => setState({ status: "ready", me }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) setState({ status: "signed_out" });
        else setState({ status: "error", message: err instanceof ApiError ? err.problem.title : "Something went wrong" });
      });
    return () => controller.abort();
  }, [attempt]);

  return {
    ...state,
    refresh: () => setAttempt((n) => n + 1),
    setMe: (me: Me) => setState({ status: "ready", me }),
  };
}

/** Send signed-out visitors to sign in, then back to where they were. */
export function useRequireSignIn(status: State["status"]) {
  React.useEffect(() => {
    if (status === "signed_out") {
      const here = window.location.pathname + window.location.search;
      window.location.replace(`/sign-in?next=${encodeURIComponent(here)}`);
    }
  }, [status]);
}
