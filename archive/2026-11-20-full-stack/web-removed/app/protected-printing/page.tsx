import { ArrowLeft, Eye, Info, FileLock2, Printer, Receipt, TriangleExclamationPoint } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = { title: "Protected Printing" };

const INTENDED = [
  { icon: FileLock2, title: "No download button", text: "The shop prints from Quire and never gets a copy of your original file to save." },
  { icon: Eye, title: "Watermarked previews", text: "The shop checks pages on a preview stamped with your order number and its own name." },
  { icon: Printer, title: "Exact copies", text: "Only the copies you paid for are sent to the printer. Reprints need a reason you can see." },
  { icon: Receipt, title: "An access receipt", text: "You can see every preview, print and download, with times and who did it." },
];

export default function ProtectedPrintingPage() {
  return (
    <div className="min-h-full bg-paper">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
        <Link href="/" aria-label="Quire home">
          <Logo />
        </Link>
        <Link href="/home" className="inline-flex items-center gap-1.5 text-small text-ink-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden />
          Back
        </Link>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-4 pb-16 pt-4">
        <div>
          <h1 className="font-display text-display font-extrabold tracking-[-0.035em] text-ink">Protected Printing</h1>
          <p className="mt-3 text-body-lg text-ink-2">
            People print Aadhaar copies, bank statements and marksheets at neighbourhood shops every day, usually by
            forwarding them on WhatsApp. Protected Printing is how Quire is meant to keep those files out of the shop&rsquo;s
            downloads folder.
          </p>
        </div>

        <section aria-labelledby="intended-title">
          <h2 id="intended-title" className="text-headline font-semibold text-ink">
            How it&rsquo;s designed to work
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {INTENDED.map((p) => (
              <li key={p.title} className="rounded-lg border border-rule bg-surface p-5">
                <p.icon className="size-5 text-brand-ink" aria-hidden />
                <h3 className="mt-3 text-title-sm font-semibold text-ink">{p.title}</h3>
                <p className="mt-1 text-body text-ink-2">{p.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="limits-title" className="rounded-lg border border-warning-ink/30 bg-warning-tint p-6">
          <h2 id="limits-title" className="flex items-center gap-2 text-title font-semibold text-warning-ink">
            <TriangleExclamationPoint className="size-5" aria-hidden />
            What it can&rsquo;t do
          </h2>
          <ul className="mt-4 flex flex-col gap-2.5 text-body text-ink">
            {[
              "It reduces casual copying. It can't stop someone photographing the screen or the printed pages.",
              "A determined person with full control of the shop's computer could still find ways to keep a copy.",
              "Only print very sensitive documents at shops you trust.",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <Info className="mt-1 size-4 shrink-0 text-warning-ink" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
