import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { serve } from './serve.mjs';

const server = await serve();
const browser = await chromium.launch({ headless: true });
const errors = [], external = [];
try {
  await mkdir('artifacts', { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1000, height: 1100 } });
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:')) external.push(request.url()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const card = page.locator('amazing-stock-card');
  await expect(card.locator('.asset-row')).toHaveCount(5);
  await expect(card.locator('.chart .line')).toBeVisible();
  assert.equal(await page.evaluate(() => window.demoCalls.length), 1, 'Week history batched once');
  await page.screenshot({ path: 'artifacts/demo-desktop.png', fullPage: true });
  await page.evaluate(() => {
    const states = { ...window.demoHass.states };
    const entities = Array.from({ length: 30 }, (_, index) => {
      const entity = `sensor.example_${index}`;
      states[entity] = { ...states['sensor.microsoft'], entity_id: entity, attributes: { ...states['sensor.microsoft'].attributes, name: `Example ${index + 1}` } };
      return entity;
    });
    window.gridHass = { ...window.demoHass, states };
    window.demoCard.hass = window.gridHass;
    window.demoCard.layout = 'grid';
    window.demoCard.setConfig({ entities, grid_options: { columns: 12, rows: 8 } });
  });
  await expect(card.locator('.asset-row')).toHaveCount(30);
  await expect.poll(() => card.evaluate(el => Math.round(el.getBoundingClientRect().height))).toBe(504);
  assert.equal(await card.locator('ha-card').evaluate(el => Math.round(el.getBoundingClientRect().height)), 504);
  await expect(card.locator('.chart')).toBeHidden();
  const fixedHeader = await card.locator('header').boundingBox();
  const list = card.locator('.rows'); await list.hover(); await page.mouse.wheel(0, 450);
  await expect.poll(() => list.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  assert.equal((await card.locator('header').boundingBox()).y, fixedHeader.y, 'Header does not scroll');
  await list.evaluate(el => { el.scrollTop = 600; });
  await page.evaluate(() => {
    window.gridHass = { ...window.gridHass, states: { ...window.gridHass.states, 'sensor.example_0': { ...window.gridHass.states['sensor.example_0'], state: '510.21' } } };
    window.demoCard.hass = window.gridHass;
  });
  assert.equal(await list.evaluate(el => el.scrollTop), 600, 'Price updates preserve scroll position');
  await page.screenshot({ path: 'artifacts/demo-grid-scroll.png', fullPage: true });
  await page.evaluate(() => { window.demoCard.style.setProperty('--row-height', '40px'); window.demoCard.style.setProperty('--row-gap', '10px'); });
  await expect.poll(() => card.evaluate(el => Math.round(el.getBoundingClientRect().height))).toBe(390);
  await page.evaluate(() => {
    window.demoCard.style.removeProperty('--row-height'); window.demoCard.style.removeProperty('--row-gap');
    window.demoCard.setConfig({ entities: window.demoCard._config.entities, grid_options: { rows: 4 } });
  });
  await expect.poll(() => card.evaluate(el => Math.round(el.getBoundingClientRect().height))).toBe(248);
  await expect(card.locator('.detail')).toBeHidden();
  assert.ok(await list.evaluate(el => el.clientHeight > 60 && el.scrollHeight > el.clientHeight), 'Short grid retains usable scroll area');
  await page.evaluate(() => { window.demoCard.layout = undefined; window.demoCard.hass = window.demoHass; window.demoCard.setConfig(window.demoConfig); });
  await expect(card.locator('.chart .line')).toBeVisible();
  await card.locator('.rows').evaluate(el => { el.scrollTop = 0; });
  await card.locator('[data-entity="sensor.nokia"]').click();
  await expect(card.locator('.detail-title')).toHaveText('Nokia');
  await card.locator('[data-period="month"]').click();
  await expect(card.locator('.chart .line')).toBeVisible();
  assert.equal(await page.evaluate(() => window.demoCalls.at(-1).entity_ids[0]), 'sensor.nokia');
  await card.locator('[data-action="more"]').click();
  assert.equal(await page.evaluate(() => window.lastMoreInfo), 'sensor.nokia');
  await card.locator('[data-action="toggle"]').click(); await expect(card.locator('.detail')).toHaveCount(0);
  await card.locator('[data-action="toggle"]').click(); await expect(card.locator('.detail')).toBeVisible();
  await page.setViewportSize({ width: 360, height: 1050 });
  await expect(card.locator('.week').first()).toBeHidden();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'No mobile overflow');
  await page.screenshot({ path: 'artifacts/demo-mobile.png', fullPage: true });
  await page.locator('#theme').click(); await page.screenshot({ path: 'artifacts/demo-light.png', fullPage: true });
  await page.locator('#edit').click();
  const editor = page.locator('amazing-stock-card-editor');
  await expect(editor.locator('.item')).toHaveCount(5);
  await editor.locator('[data-action="remove"]').last().click();
  await expect(card.locator('.asset-row')).toHaveCount(4);
  await editor.locator('#add-entity').fill('sensor.world'); await editor.locator('[data-action="add"]').click();
  await expect(card.locator('.asset-row')).toHaveCount(5);
  await editor.locator('[data-action="up"]').nth(1).click();
  await expect(card.locator('.asset-row').first()).toHaveAttribute('data-entity', 'sensor.nokia');
  await editor.locator('summary').first().click();
  await editor.locator('#field-0-name').fill('Custom Nokia'); await editor.locator('#field-0-name').press('Tab');
  await expect(card.locator('.name').first()).toHaveText('Custom Nokia');
  await card.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    window.demoCard.setConfig({ entities: [{ entity: 'sensor.microsoft', name: '<img src=x onerror=alert(1)>' }] });
    window.demoCard.hass = { ...window.demoHass, states: { ...window.demoHass.states, 'sensor.microsoft': { ...window.demoHass.states['sensor.microsoft'], state: 'unavailable' } } };
  });
  await expect(card.locator('img')).toHaveCount(0); await expect(card.locator('.number')).toContainText('Ei saatavilla');
  await page.evaluate(() => {
    window.demoCard.hass = { ...window.demoHass, callWS: async () => { throw Error('unavailable'); } };
    window.demoCard.setConfig({ entities: ['sensor.microsoft'] });
  });
  await expect(card.locator('[data-action="retry"]')).toBeVisible();
  await page.evaluate(() => { window.demoCard.hass = { ...window.demoHass, callWS: async () => ({}) }; });
  await card.locator('[data-action="retry"]').click(); await expect(card.locator('.chart-message')).toContainText('ei ole tallennettua historiaa');
  // Replacing a card invalidates in-flight history from the old configuration.
  await page.evaluate(() => {
    window.demoCard.hass = { ...window.demoHass, callWS: () => new Promise(resolve => { window.finishOld = resolve; }) };
    window.demoCard.setConfig({ entities: ['sensor.microsoft'], show_sparklines: false });
    window.demoCard.setConfig({ entities: [], show_sparklines: false });
    window.finishOld({ 'sensor.microsoft': [{ s: '99', lu: Date.now() / 1000 }] });
  });
  await expect(card.locator('.empty')).toBeVisible();
  await expect(card.locator('.chart')).toHaveCount(0);
  assert.deepEqual(errors, [], 'No browser errors'); assert.deepEqual(external, [], 'No external network requests');
  console.log('Browser checks passed: selection, periods, history, editor, responsive themes, grid sizing, scrolling, escaping, unavailable data, retry and stale requests');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
