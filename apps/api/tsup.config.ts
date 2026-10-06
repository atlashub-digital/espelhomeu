import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "node22",
  platform: "node",
  sourcemap: true,
  clean: true,
  // O pacote partilhado é TypeScript puro: inclui-o no bundle.
  noExternal: ["@espelhomeu/shared"],
});
