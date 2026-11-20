"use client";

import { Download } from "lucide-react";
import QRCode from "qrcode";
import * as React from "react";
import { QrCode } from "@/components/patterns/job-ticket";
import { Button } from "@/components/ui/button";
import { shopQrValue } from "@/lib/demo/shop-qr";
import type { DemoShop } from "@/lib/demo/types";

export function useOrigin() {
  return React.useSyncExternalStore(
    () => () => undefined,
    () => window.location.origin,
    () => "",
  );
}

/** Draws a printable counter poster (PNG) with the shop's QR code and code. */
async function downloadPoster(shop: DemoShop, value: string) {
  const W = 1240;
  const H = 1754; // A4 at 150 dpi
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#1d4ed8";
  ctx.fillRect(0, 0, W, 300);
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 64px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Print here with Quire", W / 2, 150);
  ctx.font = "400 36px system-ui, sans-serif";
  ctx.fillText("Upload, pay online and collect when it's ready", W / 2, 220);
  ctx.fillStyle = "#0f1b2d";
  ctx.font = "600 60px system-ui, sans-serif";
  ctx.fillText(shop.name, W / 2, 420);
  ctx.fillStyle = "#5a6780";
  ctx.font = "400 34px system-ui, sans-serif";
  ctx.fillText(`${shop.area}, ${shop.city}`, W / 2, 480);
  const qr = await QRCode.toDataURL(value, { width: 760, margin: 1, color: { dark: "#0f1b2d", light: "#ffffff" } });
  const img = new Image();
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.src = qr;
  });
  ctx.drawImage(img, (W - 760) / 2, 560, 760, 760);
  ctx.fillStyle = "#0f1b2d";
  ctx.font = "600 44px ui-monospace, monospace";
  ctx.fillText(`Shop code  ${shop.code}`, W / 2, 1420);
  ctx.fillStyle = "#5a6780";
  ctx.font = "400 32px system-ui, sans-serif";
  ctx.fillText("Scan with your phone camera, or enter the shop code in Quire", W / 2, 1490);
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `quire-${shop.code}-qr-poster.png`;
  a.click();
}

/** The shop's QR code, as customers scan it, with a downloadable counter poster. */
export function ShopQrCard({ shop, compact }: { shop: DemoShop; compact?: boolean }) {
  const origin = useOrigin();
  const value = origin ? shopQrValue(shop.code, origin) : "";
  return (
    <div className="flex items-center gap-4">
      <div className={compact ? "w-24 shrink-0" : "w-32 shrink-0"}>
        {value ? (
          <QrCode value={value} label={`QR code for ${shop.name}`} className="rounded-md border border-rule" />
        ) : (
          <div className="aspect-square rounded-md border border-rule bg-sunken" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-caption font-medium uppercase tracking-[0.08em] text-ink-muted">Shop code</p>
        <p className="font-mono text-title-sm font-semibold tracking-[0.12em] text-ink">{shop.code}</p>
        <p className="mt-1 text-small text-ink-muted">Customers scan this or type the code to order from you.</p>
        {!compact ? (
          <Button size="sm" variant="secondary" className="mt-3" disabled={!value} onClick={() => void downloadPoster(shop, value)}>
            <Download aria-hidden />
            Download counter poster
          </Button>
        ) : null}
      </div>
    </div>
  );
}
