/**
 * Shop QR codes. The code on a shop's counter poster encodes a link to the shop's page,
 * e.g. https://<host>/<base>/shops/QX7K2P/, so a phone camera can open it and the in-app scanner can
 * read the shop code out of it. Bare codes and "quire:shop:CODE" are accepted too.
 */
import { shopByCode } from "./shops";
import type { DemoShop } from "./types";
import { BASE_PATH } from "@/lib/base-path";

export function shopQrValue(code: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}${BASE_PATH}/shops/${code}/`;
}

export function shopFromQrText(text: string): DemoShop | undefined {
  const t = text.trim();
  const fromLink = t.match(/\/shops\/([A-Za-z0-9]{6})(?:[/?#]|$)/)?.[1];
  const fromScheme = t.match(/^quire:shop:([A-Za-z0-9]{6})$/i)?.[1];
  const bare = /^[A-Za-z0-9]{6}$/.test(t) ? t : undefined;
  const code = (fromLink ?? fromScheme ?? bare)?.toUpperCase();
  return code ? shopByCode(code) : undefined;
}
