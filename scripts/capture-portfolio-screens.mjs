import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const outDir = path.join(root, 'output', 'ppt', 'img');
const baseUrl = 'http://127.0.0.1:51482';

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function screenshot(page, fileName) {
  await page.screenshot({
    path: path.join(outDir, fileName),
    fullPage: false,
    animations: 'disabled',
  });
}

async function safeClick(page, selector, delay = 700) {
  await page.waitForSelector(selector, { timeout: 8000 });
  await page.click(selector);
  await wait(delay);
}

await ensureDir(outDir);

const browser = await chromium.launch({
  headless: true,
});

const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

await context.addCookies([
  {
    name: 'isolation_user_info',
    value: encodeURIComponent(JSON.stringify({
      id: 1,
      name: 'Portfolio User',
      generation: 'YB',
      gender: 'M',
    })),
    domain: '127.0.0.1',
    path: '/',
  },
]);

const page = await context.newPage();
page.setDefaultTimeout(10000);

await page.goto(`${baseUrl}/isolation/step2`, { waitUntil: 'networkidle' });
await wait(900);
await screenshot(page, 'screen_01_step2_3d_scroll_cue.png');

await page.mouse.wheel(0, 1600);
await wait(1000);
await screenshot(page, 'screen_02_step2_3d_motion.png');

await page.goto(`${baseUrl}/isolation/step3`, { waitUntil: 'networkidle' });
await wait(1000);
await screenshot(page, 'screen_03_step3_main_menu.png');

await safeClick(page, '.layering-menu-button--chat', 900);
await screenshot(page, 'screen_04_step3_warm_chat.png');

await safeClick(page, '.layering-modal__close', 450);
await safeClick(page, '.layering-menu-button--result', 1400);
await screenshot(page, 'screen_05_step3_personal_result.png');

await safeClick(page, '.layering-modal__close', 450);
await safeClick(page, '.layering-menu-button--stats', 1400);
await screenshot(page, 'screen_06_step3_stats_particles.png');

const nextButton = page.locator('.layering-stats-next button');
if (await nextButton.count()) {
  await nextButton.first().click();
  await wait(900);
  await screenshot(page, 'screen_07_step3_stats_question_grid.png');
}

const firstQuestion = page.locator('.layering-question-card').first();
if (await firstQuestion.count()) {
  await firstQuestion.click();
  await wait(900);
  await screenshot(page, 'screen_08_step3_stats_pie_detail.png');
}

await browser.close();

console.log('Portfolio screen captures saved to', outDir);
