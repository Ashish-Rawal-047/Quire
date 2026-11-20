"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { DEMO_CUSTOMER } from "@/lib/demo/seed";
import { actions } from "@/lib/demo/store";
import { CredentialsForm, SignInLayout } from "../sign-in-layout";

function nameFromEmail(email: string): string {
  const e = email.trim().toLowerCase();
  if (e === DEMO_CUSTOMER.email) return DEMO_CUSTOMER.name;
  const local = e.split("@")[0] ?? "";
  const words = local.split(/[._-]+/).filter(Boolean).slice(0, 2);
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ") || "Guest";
}

export default function CustomerSignIn() {
  const router = useRouter();
  const [email, setEmail] = React.useState(DEMO_CUSTOMER.email);
  const [password, setPassword] = React.useState("quire1234");
  const [error, setError] = React.useState<string | null>(null);

  return (
    <SignInLayout>
      <CredentialsForm
        title="Sign in to Quire"
        description="Order prints from shops near you and track them until pickup."
        email={email}
        onEmailChange={(v) => {
          setEmail(v);
          setError(null);
        }}
        password={password}
        onPasswordChange={setPassword}
        error={error}
        submitLabel="Sign in"
        onSubmit={() => {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setError("Enter a valid email address.");
            return;
          }
          actions.enterAsCustomer(nameFromEmail(email), DEMO_CUSTOMER.phone);
          router.push("/home");
        }}
        footer={
          <p className="text-center text-small text-ink-muted">
            Run a print shop?{" "}
            <Link href="/sign-in/shop" className="font-medium text-brand-ink hover:underline">
              Shop owner sign-in
            </Link>
          </p>
        }
      />
    </SignInLayout>
  );
}
