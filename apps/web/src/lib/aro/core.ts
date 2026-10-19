import { offerCodes, UUID, type CheckoutCapability } from "@espelhomeu/shared";
export { offerCodes, UUID, validSession, activeProductRefs, type CheckoutCapability, type CheckoutSession } from "@espelhomeu/shared";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
export const bumpIds: Record<string, string> = {
  p01: "p02",
  p02: "p03",
  p04: "p05",
  p05: "p04",
};
export const sessionCookie = "espelho_aro_checkout";
function key(secret: string) {
  return createHash("sha256")
    .update("espelhomeu:aro:cookie:v1:")
    .update(secret)
    .digest();
}
export function sealSession(capability: CheckoutCapability, secret: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(capability), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}
export function openSession(
  value: string | undefined,
  secret: string,
  now = Date.now(),
): CheckoutCapability | null {
  if (!value || value.length > 3000) return null;
  try {
    const data = Buffer.from(value, "base64url"),
      decipher = createDecipheriv(
        "aes-256-gcm",
        key(secret),
        data.subarray(0, 12),
      );
    decipher.setAuthTag(data.subarray(12, 28));
    const c = JSON.parse(
      Buffer.concat([
        decipher.update(data.subarray(28)),
        decipher.final(),
      ]).toString("utf8"),
    );
    if (
      !UUID.test(c.id) ||
      !UUID.test(c.orderId) ||
      typeof c.secret !== "string" ||
      c.secret.length < 16 ||
      !Object.values(offerCodes).includes(c.offer) ||
      !Number.isFinite(c.exp) ||
      c.exp <= now
    )
      return null;
    return c;
  } catch {
    return null;
  }
}
/** Compare with the actual HTTP Host: Next can normalize nextUrl to its internal hostname. */
export function sameOrigin(origin: string | null, host: string | null, protocol: string) {
  if (!origin || !host) return false;
  try {
    const url = new URL(origin);
    return url.origin === protocol + "//" + host;
  } catch { return false; }
}

export function protectedAsset(pathname: string) {
  try {
    const path = decodeURIComponent(pathname);
    const file = path.split("/").pop() ?? "";
    if (!/\/conteudo\//.test(path)) {
      return (
        /\.(pdf|zip|md|docx)$/i.test(path) ||
        /\/cartao_reflexao_\d+\.png$/i.test(path)
      );
    }
    // Dentro de /conteudo/: capa e imagens editoriais de marketing são públicas;
    // o conteúdo pago (capítulos, cartões, PDFs) permanece reservado.
    return (
      !/^capa[._-]/i.test(file) &&
      !/^MEDIA_EDITORIAL_[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(file)
    );
  } catch { return true; }
}
