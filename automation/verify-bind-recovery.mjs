import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const liveResend = process.env.ACCESS_TEST_REAL_RESEND === "true";
const root = fileURLToPath(new URL("../", import.meta.url));
const webRequire = createRequire(root + "apps/web/package.json");
const apiRequire = createRequire(root + "apps/api/package.json");
import { startMockAro } from "./mock-aro.mjs";
const aro = await startMockAro();
const origin = "http://localhost:3100";
const env = { ...process.env, ARO_API_URL: aro.url, ARO_PUBLIC_KEY: "synthetic-public-key", ARO_SERVER_KEY: "synthetic-server-key-for-ci-only", RECOVERY_ARO_URL: aro.url, ACCESS_V1_ENABLED: "true", ACCESS_V1_API_URL: "http://127.0.0.1:4100" };
const api = spawn(process.execPath, [apiRequire.resolve("tsx/cli"), "automation/access-test-server.ts"], { cwd: root + "apps/api", env: { ...env, NODE_ENV: "test" }, stdio: "pipe" });
const web = spawn(process.execPath, [webRequire.resolve("next/dist/bin/next"), "dev", "--hostname", "localhost", "--port", "3100"], { cwd: root + "apps/web", env: { ...env, NODE_ENV: "development" }, stdio: "pipe" });
let logs = "";
for (const child of [api, web]) for (const stream of [child.stdout, child.stderr]) stream.on("data", b => { logs += b; });
let browser;
async function wait(url, expected = 200) {
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(url)).status === expected) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error("Server did not start: " + url + "\n" + logs);
}
try {
  await Promise.all([wait(origin + "/biblioteca"), wait("http://127.0.0.1:4100/access/session", 401)]);
  browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE_PATH || undefined, args: ["--no-sandbox"] });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const reader = origin + "/ler/7-dias-para-me-escolher";
  const bind = ctx => ctx.request.post(origin + "/api/access/bind", { headers: { origin }, data: {} });
  async function login(ctx, email = liveResend ? "atlashub.digital@gmail.com" : "browser@example.invalid", route = "/biblioteca") {
    const p = await ctx.newPage();
    await p.goto(origin + route);
    const recover = p.getByRole("button", { name: "Já comprei? Recuperar acesso" });
    if (await recover.count()) await recover.click();
    assert.notEqual(await p.locator('option[value="whatsapp"]').getAttribute("disabled"), null);
    await p.getByLabel("E-mail", { exact: true }).fill(email);
    const requested = p.waitForResponse(r => r.url().endsWith("/api/access/challenges") && r.request().method() === "POST");
    await p.getByRole("button", { name: "Continuar", exact: true }).click();
    const challenge = await (await requested).json();
    await p.getByRole("button", { name: /Reenviar em/ }).waitFor();
    assert.equal(await p.getByRole("button", { name: /Reenviar em/ }).isDisabled(), true);
    let secret;
    for (let attempt = 0; attempt < 90; attempt++) {
      const res = await fetch("http://127.0.0.1:4100/testing/email-code/" + encodeURIComponent(email), { headers: { "x-access-test-token": "synthetic-browser-test-token-32-chars" } });
      if (res.status === 200) {
        const delivery = await res.json();
        secret = delivery.secret;
        if (liveResend) {
          assert.equal(delivery.last_event, "delivered");
          console.log("Resend delivered id=" + delivery.email_id);
        }
        break;
      }
      assert.ok(res.status === 202, "Email read-back failed");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    assert.ok(secret, "Email delivery timed out");
    await p.getByLabel("Código de 6 dígitos", { exact: true }).fill(secret === "000000" ? "111111" : "000000");
    await p.getByRole("button", { name: "Confirmar código" }).click();
    await p.getByText("Código inválido ou expirado. Solicite um novo.", { exact: true }).waitFor();
    await p.getByLabel("Código de 6 dígitos", { exact: true }).fill(secret);
    const verified = p.waitForResponse(r => r.url().endsWith("/api/access/challenges/verify"));
    await p.getByRole("button", { name: "Confirmar código" }).click();
    assert.equal((await verified).status(), 200);
    return p;
  }
  // Real web checkout/BFF/cookie; ARO and payment remain synthetic.
  await page.goto(origin + "/checkout/p01");
  await page.getByLabel("Nome", { exact: true }).fill("CI Editorial QA");
  await page.getByLabel("Email").fill("qa@example.invalid");
  await page.getByLabel("CPF ou CNPJ do pagador").fill("52998224725");
  const checkoutResponse = page.waitForResponse(r => r.url().endsWith("/api/checkout/session"));
  await page.getByRole("button", { name: /Gerar PIX/ }).click();
  assert.equal((await checkoutResponse).status(), 201);
  await page.waitForURL("**/checkout/sucesso?**");
  const e7 = (await context.cookies()).find(c => c.name === "espelho_aro_checkout");
  assert.ok(e7?.httpOnly);
  const orderId = aro.requests.find(r => r.path === "/v1/checkout-sessions");
  assert.ok(orderId);
  await page.goto(reader);
  assert.doesNotMatch(await page.locator("h1").innerText(), /acesso reservado/i);
  console.log("PASS 1 checkout APPROVED → E7 → Reader abre sem OTP");
  assert.equal((await bind(context)).status(), 401);
  assert.equal((await context.request.post(origin + "/api/access/bind", { headers: { origin: "https://evil.invalid" }, data: {} })).status(), 403);
  console.log("PASS 2 binding sem OTP/sessão ou cross-origin recusado");
  const activation = await login(context);
  await activation.getByRole("button", { name: "Ativar recuperação com este contacto" }).click();
  await activation.getByRole("status").filter({ hasText: "Recuperação ativada" }).waitFor();
  assert.equal((await context.cookies()).find(c => c.name === "espelho_aro_checkout")?.value, e7.value);
  console.log("PASS 3 OTP no navegador → binding validado no ARO → confirmação; E7 preservado");
  // Honour the existing 60-second resend cooldown without slowing CI.
  await fetch("http://127.0.0.1:4100/testing/advance", { method: "POST", headers: { "x-access-test-token": "synthetic-browser-test-token-32-chars" } });
  const fresh = await browser.newContext({ viewport: { width: 390, height: 844 } });
  assert.equal((await fresh.cookies()).length, 0);
  const beforeRecovery = await fresh.newPage();
  await beforeRecovery.goto(reader);
  assert.match(await beforeRecovery.locator("h1").innerText(), /acesso reservado/i);
  for (const route of ["/biblioteca", "/programas/7-dias-para-me-escolher", "/programas/7-dias-para-me-escolher/p01-dia-1"]) {
    await beforeRecovery.goto(origin + route);
    await beforeRecovery.getByRole("button", { name: "Já comprei? Recuperar acesso" }).waitFor();
  }
  const recovered = await login(fresh, undefined, "/ler/7-dias-para-me-escolher");
  await recovered.locator(".reader-content").waitFor();
  assert.equal(await recovered.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await recovered.goto(origin + "/biblioteca");
  const readings = recovered.getByRole("region", { name: "As suas leituras" });
  assert.equal(await readings.locator(".publication-card").count(), 1);
  assert.equal(await readings.locator('.editorial-cover[href="/ler/7-dias-para-me-escolher"]').count(), 1);
  assert.equal(await recovered.getByRole("button", { name: "Já comprei? Recuperar acesso" }).count(), 0);
  assert.ok(!(await fresh.cookies()).some(c => c.name === "espelho_aro_checkout"));
  const session = (await fresh.cookies()).find(c => c.name === "__Host-espelho_access");
  assert.ok(session?.secure && session.httpOnly && session.sameSite === "Lax");
  assert.ok(session.expires * 1000 > Date.now() + 6 * 86400000);
  await recovered.goto(reader);
  assert.doesNotMatch(await recovered.locator("h1").innerText(), /acesso reservado/i);
  assert.equal((await bind(fresh)).status(), 403);
  console.log("PASS 4 dispositivo limpo sem E7 → OTP do mesmo contacto → sessão 7d → mesmo Reader");
  if (!liveResend) {
    const stranger = await browser.newContext();
    const blocked = await login(stranger, "link@example.invalid");
    await blocked.goto(reader);
    assert.match(await blocked.locator("h1").innerText(), /acesso reservado/i);
    console.log("PASS 5 outro contacto com OTP mas sem binding → Reader bloqueado");
  }
  const orderPath = aro.requests.find(r => r.path.startsWith("/v1/orders/"))?.path;
  assert.ok(orderPath);
  const purchasedOrder = orderPath.split("/").pop();
  aro.expire(purchasedOrder);
  await recovered.reload();
  assert.match(await recovered.locator("h1").innerText(), /acesso reservado/i);
  assert.equal((await bind(context)).status(), 409);
  console.log("PASS 6 entitlement expirado → Reader e novo binding bloqueados com sessão válida");
  aro.expire(purchasedOrder, false);
  aro.revoke(purchasedOrder);
  await recovered.reload();
  assert.match(await recovered.locator("h1").innerText(), /acesso reservado/i);
  aro.setState(purchasedOrder, "REFUNDED");
  await recovered.reload();
  assert.match(await recovered.locator("h1").innerText(), /acesso reservado/i);
  console.log("PASS 7 entitlement revogado / ordem REFUNDED → Reader bloqueado com sessão válida");
  if (liveResend) console.log("Real Resend PASS: 2 delivered emails; login → bind → fresh context → OTP → Reader; synthetic identity/ARO/payment.");
  else console.log("Binding browser E2E: Resend adapter + allowlist with local HTTP capture, Supabase/ARO HTTP doubles; external Resend delivery NOT tested.");
} catch (error) {
  if (!liveResend) console.error("Access E2E server log:\n" + logs);
  throw error;
} finally {
  await browser?.close();
  api.kill("SIGTERM"); web.kill("SIGTERM");
  await Promise.all([api, web].map(child => new Promise(resolve => child.once("exit", resolve))));
  await aro.close();
}
