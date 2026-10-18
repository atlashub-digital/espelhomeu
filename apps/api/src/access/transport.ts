import nodemailer, { type Transporter } from "nodemailer";
import type { Env } from "../env";
export type Channel = "email" | "whatsapp";
export type Delivery = { channel: Channel; identifier: string; method: "otp" | "magic_link"; secret: string; challengeId: string };
export interface AccessTransport { send(message: Delivery): Promise<void> }
export function transport(env: Env, smtpOverride?: Pick<Transporter, "sendMail">): AccessTransport {
  const smtp = smtpOverride ?? nodemailer.createTransport({ host: env.ACCESS_V1_SMTP_HOST, port: env.ACCESS_V1_SMTP_PORT, secure: env.ACCESS_V1_SMTP_PORT === 465, requireTLS: true, auth: { user: "contact@atlashub.si", pass: env.HOSTINGER_EMAIL_TOKEN }, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 8000, logger: false, debug: false });
  return { async send(m) {
    const mode = m.channel === "email" ? env.ACCESS_V1_EMAIL_TRANSPORT : env.ACCESS_V1_WA_TRANSPORT;
    const allowed = (m.channel === "email" ? env.ACCESS_V1_EMAIL_ALLOWLIST : env.ACCESS_V1_WA_ALLOWLIST).split(",").map(v => v.trim().toLowerCase());
    if (mode !== "live" || (env.NODE_ENV === "production" ? !env.ACCESS_V1_LIVE_ENABLED : !allowed.includes(m.identifier))) throw new Error("delivery_disabled");
    const content = m.method === "otp" ? `O seu código Atlas Access é ${m.secret}. Válido por 5 minutos.` : `Confirme a entrada Atlas Access: ${env.ACCESS_V1_PUBLIC_ORIGIN}/biblioteca#access_challenge=${m.challengeId}&access_token=${m.secret} . Válido por 10 minutos.`;
    const text = content + " Não partilhe. Se não pediu, ignore. Para deixar de receber, não solicite novos códigos.";
    if (m.channel === "email") {
      if (env.ACCESS_V1_EMAIL_PROVIDER === "resend") {
        if (!env.RESEND_API_KEY) throw new Error("delivery_disabled");
        try {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
            body: JSON.stringify({ from: env.RESEND_FROM, to: [m.identifier], subject: "Confirmar entrada — Atlas Access", text, tags: [{ name: "category", value: "atlas-access" }] }),
            redirect: "error", signal: AbortSignal.timeout(8000),
          });
          if (!response.ok) throw new Error("delivery_failed");
          const result = await response.json() as { id?: string };
          if (typeof result.id !== "string" || !result.id) throw new Error("delivery_failed");
        } catch { throw new Error("delivery_failed"); }
        return;
      }
      if (!env.ACCESS_V1_SMTP_HOST || !env.HOSTINGER_EMAIL_TOKEN) throw new Error("delivery_disabled");
      const result = await smtp.sendMail({ from: "Atlas Access <contact@atlashub.si>", to: m.identifier, subject: "Confirmar entrada — Atlas Access", text });
      if (!result.accepted?.length || (result.rejected?.length ?? 0) > 0) throw new Error("delivery_failed");
    } else {
      if (!env.ATENDIMENTO_EVOLUTION_KEY) throw new Error("delivery_disabled");
      const response = await fetch(`${env.ATENDIMENTO_EVOLUTION_URL.replace(/\/+$/, "")}/message/sendText/atlashub-wa`, { method: "POST", headers: { apikey: env.ATENDIMENTO_EVOLUTION_KEY, "content-type": "application/json" }, body: JSON.stringify({ number: m.identifier.slice(1), text, delay: 100 }), redirect: "error", signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error("delivery_failed");
      const result = await response.json() as { status?: string };
      if (result.status && !["PENDING", "SERVER_ACK", "DELIVERY_ACK", "READ"].includes(result.status)) throw new Error("delivery_failed");
    }
  } };
}
