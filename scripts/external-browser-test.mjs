import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { serve } from './serve.mjs';

const server = await serve(), browser = await chromium.launch({ headless: true });
await mkdir('artifacts', { recursive: true });
try {
  for (const device of [
    { name: 'desktop', width: 1000, height: 1100, touch: false },
    { name: 'phone', width: 390, height: 844, touch: true },
    { name: 'tablet', width: 820, height: 1180, touch: true },
  ]) {
    const context = await browser.newContext({ viewport: device, hasTouch: device.touch, isMobile: device.touch });
    const page = await context.newPage(), errors = [];
    // Model HA's asynchronously initialized ha-card, not just an undefined tag.
    await page.addInitScript(() => customElements.define('ha-card', class extends HTMLElement {
      connectedCallback() { this.style.display = 'none'; queueMicrotask(() => { this.style.display = ''; }); }
    }));
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const card = page.locator('amazing-stock-card');
    await expect(card.locator('.asset-row')).toHaveCount(5);
    await page.evaluate(() => {
      window.externalRequests = [];
      window.externalHass = { ...window.demoHass, callWS: async request => {
        window.externalRequests.push(request);
        if (window.externalError) throw { code: window.externalError };
        const end = Date.UTC(2026, 8, 8), start = Date.UTC(request.period === 'max' ? 1998 : 2016, 0, 2);
        return { provider: 'avanza', source: 'Avanza', period: request.period, start, end, resolution: 'week',
          instrument: { id: '123', symbol: 'MSFT', currency: window.testCurrency || 'USD', market: 'NASDAQ', kind: 'stock' },
          points: Array.from({ length: 120 }, (_, i) => ({ time: start + (end - start) * i / 119, value: 30 + i * 2 + Math.sin(i) * 10 })), change: { value: 243.15, percent: 810.5 } };
      } };
      const states = { ...window.externalHass.states };
      const entities = Array.from({ length: 20 }, (_, i) => {
        const entity = `sensor.external_${i}`;
        states[entity] = { entity_id: entity, state: '493.95', last_updated: new Date().toISOString(), attributes: { name: i ? `Example ${i}` : 'Microsoft with a deliberately long display name', unit_of_measurement: 'USD' } };
        return { entity, history_id: '123' };
      });
      window.externalHass.states = states;
      window.externalConfig = { entities, show_header: false, history_provider: 'avanza', default_period: 'max', grid_options: { columns: 12, rows: 8 } };
      window.demoCard.hass = window.externalHass;
      window.demoCard.style.lineHeight = '1.5';
      window.demoCard.layout = 'grid';
      window.demoCard.setConfig(window.externalConfig);
    });
    await expect(card.locator('.chart .line')).toBeVisible();
    await expect(card.locator('header')).toHaveCount(0);
    await expect(card.locator('.detail-symbol')).toHaveText('MSFT');
    await expect(card.locator('.periods button')).toHaveCount(7);
    await expect(card.locator('.chart')).toContainText('1998');
    await expect(card.locator('.history-note')).toContainText('Avanza');
    await expect(card.locator('.identity .small').first()).toContainText('MSFT');
    await expect.poll(() => card.locator('.rows').evaluate(el => el.clientHeight)).toBeGreaterThanOrEqual(79);
    await expect.poll(() => card.evaluate(el => Math.round(el.getBoundingClientRect().height))).toBe(504);
    if (device.name === 'desktop') await expect.poll(() => card.locator('.chart').evaluate(el => el.clientHeight)).toBe(180);
    if (device.width < 580) assert.ok(await card.locator('.detail-title').evaluate(el => el.scrollWidth > el.clientWidth), 'Long title truncates without adding another line');
    await card.scrollIntoViewIfNeeded();
    if (device.touch) {
      const list = card.locator('.rows'), rect = await list.boundingBox(), heading = await card.locator('.detail-heading').boundingBox();
      const x = rect.x + rect.width / 2, y = Math.min(rect.y + rect.height - 12, device.height - 12), distance = Math.min(120, y - rect.y - 12);
      assert.ok(distance > 30);
      const cdp = await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 0 }] });
      for (let i = 1; i <= 12; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - distance * i / 12, id: 0 }] });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect.poll(() => list.evaluate(el => el.scrollTop)).toBeGreaterThan(20);
      assert.equal((await card.locator('.detail-heading').boundingBox()).y, heading.y);
      assert.equal(await page.evaluate(() => window.demoCard._selected), 'sensor.external_0');
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `artifacts/demo-external-${device.name}.png` });
    await card.locator('[data-action="toggle"]').click();
    await expect(card.locator('.detail')).toHaveCount(0);
    await expect(card.locator('.list-toolbar [data-action="toggle"]')).toBeVisible();
    await card.locator('[data-action="toggle"]').click();
    await expect(card.locator('.detail')).toBeVisible();
    await page.evaluate(() => window.demoCard.setConfig({ ...window.externalConfig, show_header: true, title: 'My portfolio', icon: 'mdi:finance', show_sparklines: false }));
    await expect(card.locator('h2')).toHaveText('My portfolio');
    await expect(card.locator('header ha-icon')).toHaveAttribute('icon', 'mdi:finance');
    await expect(card.locator('.spark')).toHaveCount(0);
    await expect(card.locator('.chart .line')).toBeVisible();
    await page.evaluate(() => { window.testCurrency = 'EUR'; window.demoCard.setConfig(window.externalConfig); });
    await expect(card.locator('.chart-message')).toContainText('eri valuuttoja');
    await expect(card.locator('.chart .line')).toHaveCount(0);
    await expect(card.locator('.spark')).toHaveCount(0);
    await page.evaluate(() => { window.testCurrency = ''; window.externalError = 'unknown_command'; window.demoCard.setConfig(window.externalConfig); });
    await expect(card.locator('.chart-message')).toContainText('Amazing Stock Data');
    await page.evaluate(() => { window.externalError = ''; });
    await card.locator('[data-action="retry"]').click();
    await expect(card.locator('.chart .line')).toBeVisible();
    // Real editor emits and retains title/icon/visibility/provider options.
    await page.evaluate(() => {
      window.demoEditor = document.createElement('amazing-stock-card-editor');
      window.demoEditor.setConfig(window.externalConfig); window.demoEditor.hass = window.externalHass;
      window.demoEditor.addEventListener('config-changed', event => { window.lastEditorConfig = event.detail.config; });
      document.body.append(window.demoEditor);
    });
    const editor = page.locator('amazing-stock-card-editor');
    await editor.locator('[data-field="show_header"]').check();
    await editor.locator('[data-field="title"]').fill('Oma salkku'); await editor.locator('[data-field="title"]').press('Tab');
    await editor.locator('[data-field="icon"]').fill(''); await editor.locator('[data-field="icon"]').press('Tab');
    assert.equal(await page.evaluate(() => window.lastEditorConfig.icon), '');
    assert.equal(await page.evaluate(() => window.lastEditorConfig.title), 'Oma salkku');
    await editor.locator('[data-field="show_chart"]').uncheck();
    await editor.locator('[data-field="show_sparklines"]').uncheck();
    assert.equal(await page.evaluate(() => window.lastEditorConfig.show_chart), false);
    assert.equal(await page.evaluate(() => window.lastEditorConfig.show_sparklines), false);
    assert.equal(await page.evaluate(() => window.lastEditorConfig.history_provider), 'avanza');
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`${device.name}: external periods, source identity, compact controls, scrolling, currency check and editor passed`);
  }
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
