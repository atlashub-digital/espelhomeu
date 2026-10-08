"use server";

import { WAITLIST_CONSENT_VERSION, WaitlistSignup } from "@espelhomeu/shared";
import { postWaitlist } from "@/lib/api";

export type WaitlistState = { status: "idle" | "ok" | "invalid" | "error" };

export async function joinWaitlist(_prev: WaitlistState, formData: FormData): Promise<WaitlistState> {
  const parsed = WaitlistSignup.safeParse({
    email: formData.get("email"),
    market: formData.get("market"),
    adult: formData.get("adult") === "on",
    consent: formData.get("adult") === "on",
    consentVersion: WAITLIST_CONSENT_VERSION,
  });
  if (!parsed.success) return { status: "invalid" };
  return { status: (await postWaitlist(parsed.data)) ? "ok" : "error" };
}
