import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("../", import.meta.url));
const webRequire = createRequire(path.join(root, "apps/web/package.json"));
const env = {
  ...process.env,
  HOST: "127.0.0.1",
  NEXT_PUBLIC_API_URL: "http://127.0.0.1:4000",
};
const web = spawn(
  process.execPath,
  [
    webRequire.resolve("next/dist/bin/next"),
    "start",
    "--hostname",
    "127.0.0.1",
  ],
  { cwd: path.join(root, "apps/web"), env, stdio: "pipe" },
);
const api = spawn(process.execPath, ["dist/server.js"], {
  cwd: path.join(root, "apps/api"),
  env,
  stdio: "pipe",
});
let serverLog = "";
for (const child of [web, api])
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (b) => {
      serverLog += b.toString();
    });
const origin = "http://127.0.0.1:3000";
const evidence = path.resolve(
  root,
  process.env.VISUAL_OUTPUT || "docs/evidence/track-a",
);
let browser;
async function waitFor(url) {
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server failed to start: ${url}\n${serverLog}`);
}
try {
  await Promise.all([waitFor(origin), waitFor("http://127.0.0.1:4000/health")]);
  const health = await (await fetch("http://127.0.0.1:4000/health")).json();
  assert.equal(health.status, "ok");
  assert.equal(health.db, "not_configured");
  await mkdir(evidence, { recursive: true });
  const smoke = spawn(process.execPath, ["automation/smoke-web.mjs"], {
    cwd: root,
    env: { ...env, SMOKE_WEB_URL: origin },
    stdio: "inherit",
  });
  assert.equal(await new Promise((r) => smoke.on("exit", r)), 0);
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.BROWSER_EXECUTABLE_PATH || undefined,
    args: process.env.BROWSER_EXECUTABLE_PATH
      ? [
          "--no-sandbox",
          "--single-process",
          "--no-zygote",
          "--in-process-gpu",
          "--use-gl=angle",
          "--use-angle=swiftshader",
        ]
      : [],
  });
  const errors = [],
    checks = [];
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const routes = [
    "/inicio",
    "/biblioteca",
    "/descobrir",
    "/ler/7-dias-para-me-escolher",
    "/ler/eu-sou-bela-do-meu-jeito",
    "/ler/uma-pausa-que-tambem-e-sua",
    "/programas",
    "/programas/7-dias-para-me-escolher/p01-dia-1",
    "/perfil",
    "/meu-espelho",
    "/comunidade",
    "/premium",
  ];
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 1000 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const route of routes) {
      const response = await page.goto(origin + route);
      assert.equal(response.status(), 200);
      await page.locator("h1").waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `Horizontal overflow: ${name} ${route}`,
      );
      for (const img of await page.locator('.product-main img').all()) {
        await img.scrollIntoViewIfNeeded();
        await img.evaluate(image => image.decode());
        assert.ok(await img.getAttribute("alt"));
      }
      await page.screenshot({
        path: path.join(
          evidence,
          `${name}-${route === "/ler/7-dias-para-me-escolher" ? "reader" : route.slice(1).replaceAll("/", "-")}.png`,
        ),
        fullPage: true,
      });
      checks.push(`${name} ${route}: render + no overflow + screenshot`);
    }
    await page.goto(origin + "/biblioteca");
    assert.equal(await page.locator(".publication-card").count(), 2);
    assert.equal(await page.locator('.publication-card a[href="/ler/uma-pausa-que-tambem-e-sua"]').count(), 0);
    for (const product of ["produto-01", "produto-02"])
      assert.equal(await page.locator('.publication-card img').evaluateAll((images, product) => images.filter(img => img.src.includes(product)).length, product), 1);
    checks.push(name + " Library: P01 + P02 covers; legacy Article excluded");
    await page.goto(origin + "/ler/eu-sou-bela-do-meu-jeito");
    assert.equal(await page.locator(".reader-sidebar li").count(), 7);
    const p02Titles = ["A beleza também pode ser uma assinatura", "O que me chama a atenção", "Meu estilo tem história", "Espelho: ferramenta, não tribunal", "Experimentar é permitido", "Presença também é expressão", "A minha assinatura"];
    for (let chapter = 1; chapter <= 7; chapter++) {
      assert.equal(await page.locator(".reader-content h2").innerText(), p02Titles[chapter - 1]);
      const picture = page.locator(".reader-content .reader-media img");
      await picture.scrollIntoViewIfNeeded();
      await picture.evaluate(image => image.decode());
      assert.ok((await picture.getAttribute("src")).includes("capitulo-" + String(chapter).padStart(2, "0")));
      const text = await page.locator(".reader-content").innerText();
      assert.ok(!/FICHA EDITORIAL|Checklist humano|Rever licença|99_ARQUIVO|\[CALLOUT|\[EXERCÍCIO|\[REFLEXÃO/.test(text));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.locator(".reader-content").screenshot({ path: path.join(evidence, name + "-p02-capitulo-" + chapter + ".png") });
      if (chapter < 7) await page.getByRole("button", { name: "Concluir e continuar" }).click();
    }
    for (const [file, signature] of [["caderno.pdf", "%PDF-"], ["cartoes.zip", "PK"]]) {
      const link = page.locator('.reader-content a[download][href$="' + file + '"]');
      const [download] = await Promise.all([page.waitForEvent("download"), link.click()]);
      assert.equal(await download.failure(), null);
      const response = await fetch(origin + "/conteudo/produto-02/" + file);
      assert.equal(response.status, 200);
      assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0, signature.length).toString(), signature);
    }
    await page.getByRole("button", { name: "Concluir leitura" }).click();
    assert.equal(await page.locator("progress").getAttribute("value"), "100");
    checks.push(name + " P02: seven chapters, images, no operational markers, workbook + cards downloads, completion");
    await page.goto(origin + "/ler/7-dias-para-me-escolher");
    await page.getByRole("button", { name: "Concluir e continuar" }).click();
    await page.getByRole("heading", { name: "Dia 1 — ESCUTAR", exact: true }).waitFor();
    assert.equal(await page.locator("progress").getAttribute("value"), "10");
    for (let day = 1; day <= 7; day++) {
      const img = page.locator(".reader-content .reader-media img");
      await img.scrollIntoViewIfNeeded();
      await img.evaluate(image => image.decode());
      assert.ok((await img.getAttribute("src")).includes("dia-" + String(day).padStart(2, "0")));
      await page.locator(".reader-content").screenshot({ path: path.join(evidence, name + "-guide-dia-" + day + ".png") });
      await page.getByRole("button", { name: "Concluir e continuar" }).click();
    }
    await page.getByRole("button", { name: "Concluir e continuar" }).click();
    const workbook = page.locator(".reader-content a[download]");
    assert.equal(await workbook.getAttribute("href"), "/conteudo/produto-01/workbook.pdf");
    const [download] = await Promise.all([page.waitForEvent("download"), workbook.click()]);
    assert.equal(await download.failure(), null);
    const pdf = await fetch(origin + "/conteudo/produto-01/workbook.pdf");
    assert.equal(pdf.status, 200);
    assert.ok(pdf.headers.get("content-type").includes("application/pdf"));
    assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
    await page.locator(".reader-content").screenshot({ path: path.join(evidence, name + "-workbook.png") });
    checks.push(name + " official media: seven Guide images + workbook download");

    await page.getByRole("button", { name: "Concluir leitura" }).click();
    assert.equal(await page.locator("progress").getAttribute("value"), "100");
    await page.getByRole("button", { name: /Uma carta antes do primeiro dia/ }).click();
    await page.getByRole("button", { name: "Continuar leitura" }).click();
    await page.getByRole("heading", { name: "Uma carta antes do primeiro dia", exact: true }).first().waitFor();
    checks.push(name + " Guide: ten chapters + navigation + progress + completion + resume");
    await page.goto(origin + "/ler/uma-pausa-que-tambem-e-sua");
    assert.ok((await page.locator(".reader-content").innerText()).includes("A manhã pode estar silenciosa"));
    checks.push(name + " Article: original editorial text rendered");
    await page.goto(origin + "/programas/7-dias-para-me-escolher");
    assert.equal(await page.locator(".journey-days li").count(), 7);
    await page.locator(".journey-days a").first().click();
    const titles = ["Escutar", "Reconhecer", "Respeitar", "Escolher referências", "Criar espaço", "Experimentar", "Continuar"];
    for (let day = 1; day <= 7; day++) {
      await page.getByRole("heading", { level: 1, name: titles[day - 1], exact: true }).waitFor();
      const dayImage = page.locator(".reader-content .reader-media img");
      await dayImage.scrollIntoViewIfNeeded();
      await dayImage.evaluate(image => image.decode());
      assert.ok((await dayImage.getAttribute("src")).includes("dia-" + String(day).padStart(2, "0")));
      await page.locator(".reader-content").screenshot({ path: path.join(evidence, name + "-journey-dia-" + day + ".png") });
      await page.getByText("Meu registro privado", { exact: true }).click();
      assert.ok((await page.locator(".journey-activities").innerText()).includes("Nada é enviado"));
      assert.equal(await page.locator("textarea").count(), 0);
      if (day < 7) await page.getByRole("link", { name: "Próximo encontro" }).click();
    }
    await page.getByRole("link", { name: "Encontro anterior" }).click();
    await page.getByRole("heading", { level: 1, name: "Experimentar", exact: true }).waitFor();
    checks.push(name + " Journey: seven ordered days + references + next/previous + private optional prompts");
    await page.goto(origin + "/biblioteca");
    await page.getByLabel("Buscar uma leitura").fill("Escolher");
    await page.getByRole("button", { name: "Explorar", exact: true }).click();
    await page.waitForURL("**/biblioteca?q=Escolher&tipo=");
    assert.equal(await page.locator(".publication-card").count(), 1);
    checks.push(`${name} catalog search: data-driven filtering`);
    await page.goto(origin + "/status");
    assert.ok(
      (await page.locator("main").innerText()).includes("not_configured"),
    );
    await page.goto(origin + "/");
    await page
      .getByLabel("Email", { exact: true })
      .fill("preview@example.invalid");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Quero entrar na lista" }).click();
    await page.locator("form [role=alert]").waitFor();
    assert.ok(
      (await page.locator("form [role=alert]").innerText()).includes(
        "Não foi possível guardar",
      ),
    );
    checks.push(
      `${name} waitlist: unchanged form + API 503 without DB + honest UI error`,
    );
  }
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(evidence, "verification.json"),
    JSON.stringify(
      {
        node: process.version,
        browser: await browser.version(),
        gate: "PENDING_HUMAN_PREVIEW_REVIEW",
        health,
        checks,
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log(
    `PASS browser verification (${checks.length} checks), evidence: ${evidence}`,
  );
} finally {
  if (browser) await browser.close();
  web.kill("SIGTERM");
  api.kill("SIGTERM");
}
