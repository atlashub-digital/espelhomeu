import {
  defineProject,
  defineTheme,
  moduleEnabled,
} from "@atlashub-digital/amf-experience-core";
import manifest from "../../../project.manifest.json";

export const theme = defineTheme({
  id: "espelhomeu-champagne",
  mode: "light",
  colors: {
    background: "#f8f1e9",
    foreground: "#3b2419",
    surface: "#fbf7f2",
    surfaceForeground: "#3b2419",
    primary: "#8a4a2b",
    primaryForeground: "#fbf7f2",
    accent: "#d9a383",
    accentForeground: "#3b2419",
    muted: "#7a5644",
    border: "#d9a383",
  },
  typography: {
    display: "var(--font-bodoni), Georgia, serif",
    body: "var(--font-jost), Arial, sans-serif",
  },
  radius: { sm: "0.5rem", md: "1rem", lg: "2rem", pill: "999px" },
  motion: { durationFast: "150ms", durationBase: "250ms", easing: "ease-out" },
});
export const project = defineProject({
  id: manifest.id,
  name: manifest.name,
  locale: manifest.locale,
  domains: manifest.domains,
  modules: manifest.modules,
  theme,
});
export const config = {
  markets: {
    BR: { locale: "pt-BR", currency: "BRL" },
    PT: { locale: "pt-PT", currency: "EUR" },
  },
  minimumAge: 18,
  founderOffer: {
    id: "founder-free",
    active: false,
    productRefs: [],
    label: "Comunidade Founder",
    note: "Abertura em breve. Sem cobrança nesta fase.",
  },
  content: manifest.content,
};
export const enabled = (key: Parameters<typeof moduleEnabled>[1]) =>
  moduleEnabled(project.modules, key);
