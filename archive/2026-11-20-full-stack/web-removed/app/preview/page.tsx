import type { Metadata } from "next";
import { Callout } from "@/components/ui/feedback";
import { Logo } from "@/components/ui/logo";
import { OrderFlow } from "./_components/order-flow";
import { ResponsiveStates } from "./_components/responsive";

export const metadata: Metadata = {
  title: "Visual review",
  robots: { index: false, follow: false },
};

/**
 * REVIEW-ONLY page (M0 visual review). Static compositions of planned screens, built from the
 * unchanged design system with sample data. Not wired to the API. Delete once the real screens exist.
 */
export default function PreviewPage() {
  return (
    <div className="min-h-full bg-paper px-4 py-8 sm:px-8">
      <header className="mx-auto max-w-[1500px]">
        <Logo subtitle="Visual review · static previews" />
        <Callout tone="warning" title="Static previews with sample data" className="mt-6 max-w-3xl">
          These screens are compositions of the design system for review. Buttons don&rsquo;t submit anything, and no
          upload, payment, printing or deletion happens on this page.
        </Callout>
      </header>
      <main className="mx-auto mt-10 flex max-w-[1500px] flex-col gap-16">
        <section aria-labelledby="flow-title">
          <h2 id="flow-title" className="mb-6 text-headline font-semibold text-ink">
            Customer order flow
          </h2>
          <OrderFlow />
        </section>
        <section aria-labelledby="resp-title">
          <h2 id="resp-title" className="mb-6 text-headline font-semibold text-ink">
            Responsive states
          </h2>
          <ResponsiveStates />
        </section>
      </main>
    </div>
  );
}
