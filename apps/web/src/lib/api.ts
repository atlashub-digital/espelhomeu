import { HealthResponse } from "@espelhomeu/shared";

/** Aceita "api.dominio" ou "https://api.dominio/"; sem esquema assume https. */
export function normalizeApiUrl(raw: string | undefined): string {
  const value = raw?.trim() || "http://localhost:4000";
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withScheme.replace(/\/+$/, "");
}

const API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

export async function getApiHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
    if (!res.ok) return null;
    return HealthResponse.parse(await res.json());
  } catch {
    return null;
  }
}
