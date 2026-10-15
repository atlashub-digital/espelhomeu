import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

describe("loadEnv", () => {
  it("treats blank optional provider variables as unset", () => {
    const env = loadEnv({
      NODE_ENV: "production",
      PORT: "4000",
      HOST: "0.0.0.0",
      WEB_ORIGINS: "https://espelho.lia.doctor",
      WEB_BASE_URL: "https://espelho.lia.doctor",
      API_PUBLIC_BASE_URL: "https://api.espelhomeu.lia.doctor",
      COMMERCE_ENABLED: "true",
      BR_PIX_PROVIDER: "pixgo",
      PIXGO_API_KEY: "real-key",
      PIXGO_WEBHOOK_SECRET: "real-secret",
      STRIPE_SECRET_KEY: "",
      STRIPE_PUBLISHABLE_KEY: "",
      STRIPE_WEBHOOK_SECRET: "",
      MISTICPAY_CLIENT_ID: "",
      MISTICPAY_CLIENT_SECRET: "",
      REVENUE_TELEGRAM_BOT_TOKEN: "",
      REVENUE_TELEGRAM_CHAT_ID: "",
      REVENUE_DISCORD_WEBHOOK_URL: "",
    });

    expect(env.PIXGO_API_KEY).toBe("real-key");
    expect(env.STRIPE_SECRET_KEY).toBeUndefined();
    expect(env.MISTICPAY_CLIENT_ID).toBeUndefined();
    expect(env.REVENUE_DISCORD_WEBHOOK_URL).toBeUndefined();
  });
});
