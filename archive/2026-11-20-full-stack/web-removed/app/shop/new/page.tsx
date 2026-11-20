import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { RegisterShopForm } from "./register-form";

export const metadata: Metadata = { title: "Register a shop" };

export default function RegisterShopPage() {
  return (
    <div className="flex min-h-full flex-col bg-paper">
      <header className="border-b border-rule px-4 py-4 sm:px-8">
        <Link href="/profile" className="inline-flex rounded-md" aria-label="Quire home">
          <Logo subtitle="For print shops" />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <RegisterShopForm />
      </main>
    </div>
  );
}
