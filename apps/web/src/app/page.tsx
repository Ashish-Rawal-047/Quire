import { Check, FileUp, PackageCheck, Printer } from "lucide-react";
import Link from "next/link";
import { PrinterHero } from "@/components/demo/printer-hero";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/ui/logo";
import { LandingEntry } from "./landing-entry";

const STEPS = [
  { icon: FileUp, title: "Upload and choose", text: "Pick a nearby shop, add a PDF or photo, and set colour, sides, copies and paper size. The price updates as you go." },
  { icon: Printer, title: "The shop prints", text: "The shop sees your settings and a preview, accepts the order and prints it. You follow every step live." },
  { icon: PackageCheck, title: "Collect with a code", text: "Show your 4-digit pickup code at the counter. Your access receipt lists everything that happened to your file." },
];

const SIDES = [
  {
    title: "For customers",
    points: [
      "Find a nearby shop and compare prices before you go",
      "Upload a PDF or photo and see the exact price as you choose settings",
      "Track your order live and collect with a pickup code",
    ],
  },
  {
    title: "For print shops",
    points: [
      "Orders arrive with files, settings and payment already sorted",
      "Preview, accept and print from one screen",
      "Hand over with a pickup code: no mix-ups at the counter",
      "Set your own prices and see the day's earnings",
    ],
  },
];

export default function Landing() {
  return (
    <div className="min-h-full bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <Link href="/design" className="hidden rounded-md px-3 py-2 text-small font-medium text-ink-2 hover:bg-hover hover:text-ink sm:block">
            Design system
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-6 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:pt-12">
          <div>
            <p className="text-small font-medium text-brand-ink">Print ordering for neighbourhood shops</p>
            <h1 className="mt-3 font-display text-display font-extrabold tracking-[-0.025em] text-ink sm:text-display-lg">
              Private printing at your <em className="text-brand-ink">local shop<span className="-ml-[0.06em]">.</span></em>
            </h1>
            <p className="mt-5 max-w-xl text-body-lg text-ink-2">
              Quire lets you send documents to a nearby print shop, pay online and collect when they&rsquo;re ready, without
              sharing your files on WhatsApp or a pen drive.
            </p>
            <div className="mt-8">
              <LandingEntry />
            </div>
          </div>
          <div className="hidden justify-center lg:flex">
            <PrinterHero />
          </div>
        </section>

        <section aria-labelledby="how-title" className="border-y border-rule bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
            <h2 id="how-title" className="text-headline font-semibold text-ink">
              How it works
            </h2>
            <ol className="mt-8 grid gap-8 sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex flex-col gap-3">
                  <span className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-md bg-brand-tint text-brand-ink">
                      <s.icon className="size-5" aria-hidden />
                    </span>
                    <span className="font-mono text-small text-ink-muted">0{i + 1}</span>
                  </span>
                  <h3 className="text-title-sm font-semibold text-ink">{s.title}</h3>
                  <p className="text-body text-ink-2">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="sides-title" className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
          <h2 id="sides-title" className="text-headline font-semibold text-ink">
            Made for both sides of the counter
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {SIDES.map((side) => (
              <div key={side.title} className="rounded-lg border border-rule bg-surface p-6">
                <h3 className="text-title-sm font-semibold text-ink">{side.title}</h3>
                <ul className="mt-4 flex flex-col gap-3">
                  {side.points.map((point) => (
                    <li key={point} className="flex gap-3 text-body text-ink-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-brand-ink" strokeWidth={2.5} aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-small text-ink-muted sm:px-8">
          <span>Quire · a product case study. Shops, people and orders are fictional.</span>
          <Link href="/design" className="hover:text-ink">
            Design system &amp; components
          </Link>
        </div>
      </footer>
    </div>
  );
}
