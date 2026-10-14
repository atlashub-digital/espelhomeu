import assert from "node:assert/strict";
import path from "node:path";

const routes = [
  "/",
  "/colecao",
  "/7-dias-para-me-escolher",
  "/eu-sou-bela-do-meu-jeito",
  "/21-dias-meu-melhor-reflexo",
  "/recomecar-depois-dos-40",
  "/diario-de-amor-proprio",
  "/jornada",
  "/membership",
];

/** Runs inside the existing CI browser/server lifecycle; never contacts payment providers. */
export async function verifySales({ browser, origin, evidence }) {
  const checks = [];
  for (const [name, viewport] of [
    ["desktop", { width: 1440, height: 1000 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
    });
    await context.addInitScript(() => {
      window.__salesEvents = [];
      window.addEventListener("espelhomeu:sales", (event) =>
        window.__salesEvents.push(event.detail),
      );
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      for (const route of routes) {
        const response = await page.goto(origin + route);
        assert.equal(response.status(), 200, route);
        await page.locator("h1").waitFor();
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator("h1").count(), 1, route);
        for (const image of await page.locator("main img").all()) {
          await image.scrollIntoViewIfNeeded();
          await image.evaluate((img) => img.decode());
          assert.notEqual(
            await image.getAttribute("alt"),
            null,
            `Missing alt: ${route}`,
          );
        }
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `Overflow: ${name} ${route}`,
        );
        const links = await page
          .locator("a[href]")
          .evaluateAll((anchors) =>
            anchors.map((anchor) => anchor.getAttribute("href")),
          );
        assert.ok(
          links.every(
            (href) => !/stripe\.com|pixgo|misticpay/i.test(href),
          ),
          `External payment link leaked into sales page: ${route}`,
        );
        if (
          route === "/colecao" ||
          [
            "/7-dias-para-me-escolher",
            "/eu-sou-bela-do-meu-jeito",
            "/21-dias-meu-melhor-reflexo",
            "/recomecar-depois-dos-40",
            "/diario-de-amor-proprio",
          ].includes(route)
        ) {
          assert.ok(
            links.some((href) => href?.startsWith("/checkout/")),
            `First-party checkout missing: ${route}`,
          );
        }
        if (route === "/jornada" || route === "/membership") {
          assert.ok(
            links.every((href) => !href?.startsWith("/checkout/")),
            `Future offer must not expose checkout: ${route}`,
          );
        }
        assert.equal(
          await page
            .locator('input[name="cpf"], input[autocomplete="cc-number"]')
            .count(),
          0,
        );
        assert.equal(
          (await page.locator("main").innerText()).includes(
            "Preço em definição",
          ),
          false,
        );
        if (route === "/")
          assert.equal(
            await page.getByTestId("collection-comparison").count(),
            0,
          );
        if (route === "/colecao") {
          assert.equal(
            await page.getByTestId("collection-comparison").count(),
            1,
          );
          const value = (
            await page.getByTestId("collection-value").innerText()
          ).replace(/\s/g, "");
          for (const amount of ["116,50", "79,90", "36,60"])
            assert.ok(value.includes(amount));
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: path.join(
            evidence,
            `${name}-sales-${route === "/" ? "home" : route.slice(1)}.png`,
          ),
          fullPage: true,
        });
        checks.push(
          `${name} S2 ${route}: render, media, no overflow, first-party checkout boundary, screenshot`,
        );
      }
      // Each interaction uses only temporary browser state. No checkout or member mutation.
      const attribution = {
        utm_source: "browser-smoke",
        utm_medium: "qa",
        utm_campaign: "collection-s1",
        utm_content: "mobile-desktop",
      };
      await page.goto(`${origin}/?${new URLSearchParams(attribution)}`);
      await page.waitForFunction(() =>
        window.__salesEvents.some((event) => event.name === "sales_page_view"),
      );
      for (const route of ["/colecao", "/7-dias-para-me-escolher"]) {
        const link = page.locator(`.sales-root a[href^="${route}?"]`).first();
        await link.waitFor();
        await link.click();
        await page.waitForURL((url) => url.pathname === route);
        const actual = new URL(page.url());
        for (const [key, value] of Object.entries(attribution))
          assert.equal(actual.searchParams.get(key), value, `${route} ${key}`);
      }
      checks.push(
        `${name} S1 four UTM values preserved through collection/product navigation`,
      );
      await page.getByTestId("quiz-start").click();
      for (let question = 0; question < 3; question++) {
        await page.getByTestId("quiz-option").first().click();
      }
      await page.getByTestId("quiz-result").waitFor();
      assert.ok(
        await page.getByTestId("quiz-result").locator("a[href]").count(),
        "Quiz offers a sample link",
      );
      await page.screenshot({
        path: path.join(evidence, `${name}-sales-quiz-result.png`),
        fullPage: true,
      });
      const quizEvents = await page.evaluate(() =>
        window.__salesEvents.map((event) => event.name),
      );
      assert.ok(quizEvents.includes("quiz_start"));
      assert.ok(quizEvents.includes("quiz_complete"));
      checks.push(
        `${name} S1 P01 three-question quiz completes and emits allowlisted events`,
      );

      const quizPaths = [
        ["Comece pela leitura.", "Dia 1 — ESCUTAR"],
        ["Comece por uma reflexão.", "Dia 2 — RECONHECER"],
        ["Comece com espaço para escrever.", "Cartões e Mapa do Que É Meu"],
      ];
      for (let choice = 0; choice < quizPaths.length; choice++) {
        await page
          .getByTestId("quiz-result")
          .getByRole("button", { name: "Recomeçar" })
          .click();
        await page.getByTestId("quiz-start").click();
        for (let question = 0; question < 3; question++)
          await page.getByTestId("quiz-option").nth(choice).click();
        assert.ok(
          (await page.getByTestId("quiz-result").innerText()).includes(
            quizPaths[choice][0],
          ),
        );
        await page.getByTestId("quiz-result").locator("a").click();
        await page.getByTestId("sample-body").waitFor();
        assert.equal(
          await page.getByTestId("sample-body").locator("h3").innerText(),
          quizPaths[choice][1],
        );
        await page.screenshot({
          path: path.join(evidence, `${name}-sales-quiz-path-${choice}.png`),
          fullPage: true,
        });
      }
      const eventData = JSON.stringify(
        await page.evaluate(() => window.__salesEvents),
      );
      assert.ok(
        !/answers|selection|respostas|Uma pequena pausa/.test(eventData),
      );
      checks.push(
        `${name} S1 P01 three distinct editorial paths and samples; no answers in events`,
      );
      for (const [route, titles] of [
        [
          "/eu-sou-bela-do-meu-jeito",
          [
            "Presença também é expressão",
            "Meu estilo tem história",
            "A minha assinatura",
            "Experimentar é permitido",
          ],
        ],
        [
          "/recomecar-depois-dos-40",
          ["CAPÍTULO 03", "CAPÍTULO 05", "CAPÍTULO 06", "CAPÍTULO 07"],
        ],
      ]) {
        await page.goto(origin + route);
        await page.locator('[data-sales-ready="true"]').waitFor();
        for (let i = 0; i < titles.length; i++) {
          await page.getByTestId("intent-option").nth(i).click();
          assert.ok(
            (await page.getByTestId("intent-result").innerText()).includes(
              titles[i],
            ),
          );
          assert.ok(
            (
              await page.getByTestId("sample-body").locator("h3").innerText()
            ).includes(titles[i]),
          );
        }
        await page.screenshot({
          path: path.join(
            evidence,
            `${name}-sales-intent-${route.slice(1)}.png`,
          ),
          fullPage: true,
        });
        checks.push(
          `${name} S1 ${route}: all four intentions route to matching canonical samples`,
        );
      }
      for (const route of ["/jornada", "/membership"]) {
        await page.goto(origin + route);
        await page.locator('[data-sales-ready="true"]').waitFor();
        assert.equal(
          await page.getByTestId("interest-consent").isChecked(),
          false,
        );
        assert.equal(await page.getByTestId("interest-email").count(), 0);
        await page.getByTestId("interest-consent").check();
        const href = await page
          .getByTestId("interest-email")
          .getAttribute("href");
        assert.ok(href.startsWith("mailto:"));
        assert.ok(
          decodeURIComponent(href).includes(
            route === "/jornada" ? "Jornada EspelhoMeu" : "EspelhoMeu contínuo",
          ),
        );
        assert.ok(!/utm_|quiz|cpf=/i.test(href));
        await page.screenshot({
          path: path.join(
            evidence,
            `${name}-sales-interest-${route.slice(1)}.png`,
          ),
          fullPage: true,
        });
        await page.getByTestId("interest-consent").uncheck();
        assert.equal(await page.getByTestId("interest-email").count(), 0);
        checks.push(
          `${name} S1 ${route}: purpose-specific manual interest request gated by consent, no email sent`,
        );
      }

      await page.goto(`${origin}/checkout/p01`);
      await page.locator("h1").waitFor();
      assert.ok(
        (await page.locator("main").innerText()).includes("7 Dias Para Me Escolher"),
      );
      assert.equal(
        await page.locator('input[autocomplete="cc-number"]').count(),
        0,
        "Raw card inputs are never rendered by EspelhoMeu",
      );
      await page
        .getByRole("button", { name: "Continuar para pagamento seguro" })
        .click();
      await page.getByRole("alert").waitFor();
      assert.ok(
        (await page.getByRole("alert").innerText()).includes(
          "temporariamente indisponível",
        ),
      );
      checks.push(
        `${name} S2 checkout P01: branded embedded surface + fail-closed when commerce runtime is disabled`,
      );

      await page.goto(`${origin}/diario-de-amor-proprio`);
      await page.waitForFunction(() =>
        window.__salesEvents.some((event) => event.name === "sales_page_view"),
      );
      await page.getByTestId("sample-open").click();
      await page.getByTestId("sample-body").waitFor();
      const firstSample = await page.getByTestId("sample-body").innerText();
      assert.ok(
        firstSample.trim().length > 20,
        "Real sample content is present",
      );
      await page.getByTestId("sample-next").click();
      await page.waitForFunction(
        (previous) =>
          document
            .querySelector('[data-testid="sample-body"]')
            ?.textContent.trim() !== previous.trim(),
        firstSample,
      );
      assert.notEqual(
        await page.getByTestId("sample-body").innerText(),
        firstSample,
      );
      assert.equal(
        await page
          .getByTestId("sample-body")
          .locator("input, textarea, [contenteditable=true]")
          .count(),
        0,
      );
      assert.ok(
        (
          await page.evaluate(() =>
            window.__salesEvents.map((event) => event.name),
          )
        ).includes("sample_open"),
      );
      await page.screenshot({
        path: path.join(evidence, `${name}-sales-journal-sample.png`),
        fullPage: true,
      });
      checks.push(
        `${name} S1 P05 sample opens and advances without collecting written answers`,
      );

      const demoResponse = await page.goto(`${origin}/s1-demo`);
      assert.equal(
        demoResponse.status(),
        200,
        "S1 demo enabled in preview environment",
      );
      const labels = {
        PUBLIC: "Acesso livre",
        PREVIEW: "Amostra disponível",
        LOCKED: "Bloqueado",
        ACQUIRED: "Adquirido",
      };
      for (const [state, label] of Object.entries(labels)) {
        await page
          .getByLabel("Estado de acesso", { exact: true })
          .selectOption(state);
        assert.equal(
          await page.getByTestId("access-demo-label").innerText(),
          label,
        );
      }
      assert.equal(
        await page.evaluate(() =>
          Object.keys(localStorage).some((key) =>
            /entitlement|acquired/i.test(key),
          ),
        ),
        false,
        "Access presentation never creates an entitlement",
      );
      await page.screenshot({
        path: path.join(evidence, `${name}-sales-access-demo.png`),
        fullPage: true,
      });
      checks.push(
        `${name} S1 preview-only access presentation supports four states without persisting a grant`,
      );
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  }
  return checks;
}
