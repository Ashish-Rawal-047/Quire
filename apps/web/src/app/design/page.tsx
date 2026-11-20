import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/ui/logo";
import { slugify } from "./_components/section";
import { Components } from "./_sections/components";
import { Foundations } from "./_sections/foundations";
import { Patterns } from "./_sections/patterns";
import { Screens } from "./_sections/screens";

export const metadata: Metadata = {
  title: "Design system",
  description: "Quire's design tokens, components and product patterns.",
};

// [label, specimen title] — ids are derived from specimen titles (see slugify).
const TOC: { href: string; label: string; items: [string, string][] }[] = [
  {
    href: "#foundations",
    label: "Foundations",
    items: [
      ["Principles", "Principles"],
      ["Colour", "Colour"],
      ["Order status", "Order status"],
      ["Typography", "Typography"],
      ["Spacing & shape", "Spacing & shape"],
      ["Iconography", "Iconography"],
    ],
  },
  {
    href: "#components",
    label: "Components",
    items: [
      ["Buttons", "Buttons"],
      ["Inputs", "Text inputs"],
      ["Selection", "Selection controls"],
      ["Status", "Status & labels"],
      ["Feedback", "Feedback"],
      ["Overlays", "Overlays"],
      ["Navigation", "Navigation"],
    ],
  },
  {
    href: "#patterns",
    label: "Patterns",
    items: [
      ["Shop list", "Shop list"],
      ["Upload", "Upload"],
      ["Privacy choice", "Privacy choice"],
      ["Price", "Price"],
      ["Job ticket", "Job ticket"],
      ["Timeline & receipt", "Order timeline & access receipt"],
      ["Order queue", "Order queue"],
      ["Printers", "Printers"],
    ],
  },
  {
    href: "#screens",
    label: "Screens",
    items: [
      ["Customer app", "Customer app"],
      ["Shop workspace", "Shop workspace"],
    ],
  },
];

export default function DesignSystemPage() {
  return (
    <div className="min-h-full bg-paper">
      <header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Quire home">
              <Logo />
            </Link>
            <span aria-hidden className="h-5 w-px bg-rule-strong" />
            <span className="text-body font-medium text-ink-2">Design system</span>
            <span className="hidden rounded-sm bg-sunken px-1.5 font-mono text-caption text-ink-muted sm:inline">v0.1</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px] gap-12 px-4 sm:px-8">
        <nav aria-label="Design system sections" className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-48 shrink-0 overflow-y-auto py-10 lg:block">
          <ul className="flex flex-col gap-6">
            {TOC.map((group) => (
              <li key={group.href}>
                <a href={group.href} className="text-small font-semibold text-ink hover:text-brand-ink">
                  {group.label}
                </a>
                <ul className="mt-2 flex flex-col gap-1.5 border-l border-rule pl-3">
                  {group.items.map(([label, title]) => (
                    <li key={label}>
                      <a href={`#${slugify(title)}`} className="text-small text-ink-muted transition-colors hover:text-ink">
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 pb-24 pt-10">
          <div className="max-w-3xl pb-6">
            <h1 className="font-display text-display font-extrabold tracking-[-0.025em] text-ink sm:text-display-lg">
              Paper, ink and <em className="text-brand-ink">plain words</em>.
            </h1>
            <p className="mt-4 text-body-lg text-ink-2">
              The visual language for Quire&rsquo;s customer app and shop workspace. One palette, one type family, three
              radii and a single overlay shadow, so every screen reads as one product.
            </p>
          </div>
          <Foundations />
          <Components />
          <Patterns />
          <Screens />
        </main>
      </div>
    </div>
  );
}
