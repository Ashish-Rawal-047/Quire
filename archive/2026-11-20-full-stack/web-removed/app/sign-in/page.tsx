import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="flex min-h-full flex-col bg-paper">
      <header className="px-4 py-4 sm:px-8">
        <Link href="/" className="inline-flex rounded-md" aria-label="Quire home">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm rounded-lg border border-rule bg-surface p-6 sm:p-8">
          <SignInForm />
        </div>
      </main>
      {process.env.NODE_ENV !== "production" ? (
        <footer className="px-4 pb-6 text-center text-caption text-ink-muted">
          Local development: codes arrive in the test inbox at localhost:8025.
        </footer>
      ) : null}
    </div>
  );
}
