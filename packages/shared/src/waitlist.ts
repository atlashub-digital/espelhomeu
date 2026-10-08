import { z } from "zod";
import { Market } from "./market";

/** Versão do texto de consentimento mostrado no formulário da lista de espera. Mudar sempre que o texto mudar. */
export const WAITLIST_CONSENT_VERSION = "lista-espera-2026-10-08";

/**
 * Inscrição na lista de espera da primeira turma. Só guarda o mínimo: email e país.
 * A declaração de 18+ e o consentimento são obrigatórios e ficam registados pela versão do texto.
 */
export const WaitlistSignup = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  market: Market,
  adult: z.literal(true),
  consent: z.literal(true),
  consentVersion: z.string().min(1).max(64),
});
export type WaitlistSignup = z.infer<typeof WaitlistSignup>;
