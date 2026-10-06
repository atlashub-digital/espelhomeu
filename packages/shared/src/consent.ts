import { z } from "zod";

/**
 * Finalidades de consentimento (RGPD / LGPD). Fotos são dados sensíveis:
 * cada finalidade é opt-in explícito, registada com versão do texto e data,
 * e revogável a qualquer momento.
 */
export const ConsentPurpose = z.enum([
  "account", // conta e jornada dos 21 dias
  "photo_processing", // processar fotos para simulações (ex.: Meu Novo Cabelo)
  "agent_memory", // o Meu Espelho lembrar escolhas ao longo do tempo
  "testimonial", // usar imagem/citação em comunicação (nunca por defeito)
  "marketing_email",
]);
export type ConsentPurpose = z.infer<typeof ConsentPurpose>;

export const ConsentRecord = z.object({
  purpose: ConsentPurpose,
  granted: z.boolean(),
  textVersion: z.string().min(1),
  recordedAt: z.iso.datetime(),
});
export type ConsentRecord = z.infer<typeof ConsentRecord>;

/** Só adultos: a idade declarada tem de ser >= 18. */
export const AgeDeclaration = z.object({
  birthYear: z.number().int().min(1900),
});

export function isAdult(birthYear: number, now: Date = new Date()): boolean {
  // Conservador: só conta como adulta quem faz 18 até 31/12 do ano anterior.
  return now.getUTCFullYear() - birthYear - 1 >= 18;
}
