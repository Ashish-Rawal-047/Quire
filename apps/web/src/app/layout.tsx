import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import localFont from "next/font/local";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

// Fonts are bundled from npm and self-hosted by Next — no third-party font requests,
// and the app builds without network access.
const jakarta = localFont({
  variable: "--font-jakarta",
  display: "swap",
  // Plus Jakarta Sans: a warm geometric sans for the whole product, from headings to labels.
  src: [
    { path: "../../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2", style: "normal", weight: "200 800" },
    { path: "../../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-italic.woff2", style: "italic", weight: "200 800" },
  ],
});

export const metadata: Metadata = {
  title: { default: "Quire — private printing at local shops", template: "%s · Quire" },
  description:
    "Send documents to a local print shop, pay online and collect with a pickup code.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

/**
 * Resolves the theme before first paint (no flash): light unless the visitor chose Dark or
 * System. Kept tiny and dependency-free; storage access is guarded.
 */
const themeScript = `(function(){try{var t=null;try{t=localStorage.getItem("quire-theme")}catch(e){}
var m=window.matchMedia("(prefers-color-scheme: dark)");
function apply(){var r=t==="dark"?"dark":t==="system"?(m.matches?"dark":"light"):"light";document.documentElement.dataset.theme=r;}
apply();m.addEventListener("change",function(){if(t==="system")apply();});}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      data-theme="light"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${jakarta.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
