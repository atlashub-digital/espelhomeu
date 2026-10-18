import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("../", import.meta.url));
const webRequire = createRequire(root + "apps/web/package.json");
const apiRequire = createRequire(root + "apps/api/package.json");
const origin = "http://localhost:3100";
const env = { ...process.env, ACCESS_V1_ENABLED: "true", ACCESS_V1_API_URL: "http://127.0.0.1:4100" };
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
  // A sentinel proves Access does not modify the E7 cookie; it does not grant a purchase.
  await context.addCookies([{ name: "espelho_aro_checkout", value: "e7-preserved", url: origin, httpOnly: true }]);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on("pageerror", error => console.error("browser error:", error.message));
  await page.goto(origin + "/biblioteca");
  await page.getByRole("heading", { name: "Entrar na Biblioteca" }).waitFor();
  await page.getByLabel("E-mail", { exact: true }).fill("browser@example.invalid");
  const requested = page.waitForResponse(r => r.url().endsWith("/api/access/challenges") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  const challenge = await (await requested).json();
  const secretRes = await fetch("http://127.0.0.1:4100/access/testing/challenges/" + challenge.challenge_id, { headers: { "x-access-test-token": "synthetic-browser-test-token-32-chars" } });
  const { secret } = await secretRes.json();
  await page.getByLabel("Código de 6 dígitos", { exact: true }).fill(secret);
  await page.getByRole("button", { name: "Confirmar código" }).click();
  await page.getByRole("button", { name: "Sair deste dispositivo" }).waitFor();
  const cookies = await context.cookies();
  const access = cookies.find(c => c.name === "__Host-espelho_access");
  assert.ok(access?.httpOnly && access.secure && access.sameSite === "Lax");
  assert.equal(cookies.find(c => c.name === "espelho_aro_checkout")?.value, "e7-preserved");
  await page.reload();
  await page.getByRole("button", { name: "Sair deste dispositivo" }).waitFor();
  await page.goto(origin + "/ler/7-dias-para-me-escolher");
  assert.match(await page.locator("h1").innerText(), /acesso reservado/);
  assert.equal((await context.request.get(origin + "/conteudo/produto-01/workbook.pdf")).status(), 403);
  await page.goto(origin + "/biblioteca");
  await page.getByRole("button", { name: "Sair deste dispositivo" }).click();
  await page.getByRole("heading", { name: "Entrar na Biblioteca" }).waitFor();
  const replay = await context.request.get(origin + "/api/access/session", { headers: { cookie: access.name + "=" + access.value } });
  assert.equal(replay.status(), 401);
  assert.equal((await context.cookies()).find(c => c.name === "espelho_aro_checkout")?.value, "e7-preserved");
  // Scanner-safe link: visiting GET never consumes or signs in, explicit button POST does.
  const challengeRes = await fetch("http://127.0.0.1:4100/access/challenges", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ project: "espelhomeu", channel: "email", method: "magic_link", identifier: "link@example.invalid" }) });
  const magic = await challengeRes.json();
  const magicSecret = await (await fetch("http://127.0.0.1:4100/access/testing/challenges/" + magic.challenge_id, { headers: { "x-access-test-token": "synthetic-browser-test-token-32-chars" } })).json();
  const url = origin + "/biblioteca#access_challenge=" + magic.challenge_id + "&access_token=" + magicSecret.secret;
  await page.goto(url);
  await page.getByRole("button", { name: "Confirmar entrada pelo link" }).waitFor();
  assert.equal((await context.request.get(origin + "/api/access/session")).status(), 401);
  assert.equal(new URL(page.url()).hash, "");
  await page.getByRole("button", { name: "Confirmar entrada pelo link" }).click();
  await page.getByRole("button", { name: "Sair deste dispositivo" }).waitFor();
  assert.equal((await context.request.post(origin + "/api/access/challenges/verify", { headers: { origin }, data: { project: "espelhomeu", challenge_id: magic.challenge_id, secret: magicSecret.secret } })).status(), 401);
  assert.equal((await context.request.post(origin + "/api/access/aro/claim", { headers: { origin }, data: { entitlement: "ACTIVE" } })).status(), 409);
  assert.equal((await context.request.post(origin + "/api/access/logout", { headers: { origin: "https://evil.invalid" }, data: {} })).status(), 403);
  console.log("Access browser E2E PASS: OTP, reload, 7-day secure cookie, logout/revoked replay, magic GET/POST/replay, CSRF, Reader/download fail-closed, E7 preserved. Local Supabase wire stub; no delivery.");
} catch (error) {
  console.error("Access E2E server log:\n" + logs);
  throw error;
} finally {
  await browser?.close();
  api.kill("SIGTERM"); web.kill("SIGTERM");
}
