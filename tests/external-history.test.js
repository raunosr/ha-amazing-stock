import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, historySource, availablePeriods } from '../src/data.js';
import { HistoryCache } from '../src/history.js';

const item = { entity: 'sensor.avanza_stock_123' };
const config = { entities: [item], history_provider: 'avanza' };
const reply = request => ({ provider: 'avanza', period: request.period, start: 1, end: 10, instrument: { id: '123', currency: 'USD', symbol: 'EXM' }, points: [{ time: 1, value: 10 }, { time: 5, value: null }, { time: 10, value: 20 }], change: { value: 10, percent: 100 } });

test('heading options and provider identification preserve recorder defaults', () => {
  const normalized = normalizeConfig(config);
  assert.equal(normalized.show_header, true);
  assert.equal(normalized.icon, 'mdi:chart-line');
  assert.equal(normalizeConfig({ ...config, show_header: false, icon: '' }).icon, '');
  assert.deepEqual(historySource(config, item), { provider: 'avanza', instrument_id: '123' });
  assert.deepEqual(availablePeriods({}, item), ['day', 'week', 'month', 'year']);
  assert.ok(availablePeriods(config, item).includes('max'));
  assert.equal(historySource(config, { ...item, history_provider: 'home_assistant' }).provider, 'home_assistant');
  for (const invalid of [{ icon: '<script>' }, { show_header: 'false' }, { history_provider: 'https://example.com' }, { entities: [{ ...item, history_id: '../1' }] }]) assert.throws(() => normalizeConfig({ ...config, ...invalid }));
});

test('external history uses authenticated HA transport and never requests recorder for long periods', async () => {
  const calls = [], cache = new HistoryCache(() => {});
  await cache.load({ callWS: async request => { calls.push(request); return reply(request); } }, [item], 'max', 300, false, config);
  assert.deepEqual(calls, [{ type: 'amazing_stock_data/history', entity_id: item.entity, provider: 'avanza', instrument_id: '123', period: 'max' }]);
  assert.equal(cache.get(item.entity, 'max').points[1].value, null);
  assert.equal(cache.instrument(item.entity).symbol, 'EXM');
});

test('missing companion integration and missing instrument are actionable without recorder fallback', async () => {
  const cache = new HistoryCache(() => {});
  let calls = 0;
  const hass = { callWS: async () => { calls++; throw { code: 'unknown_command' }; } };
  await cache.load(hass, [item], 'max', 300, false, config);
  assert.equal(cache.get(item.entity, 'max').error, 'unknown_command');
  await cache.load(hass, [{ entity: 'sensor.custom' }], 'week', 300, false, config);
  assert.equal(cache.get('sensor.custom', 'week').error, 'missing_instrument');
  assert.equal(calls, 1);
});

test('external stale responses and mismatched instruments never populate the chart', async () => {
  const cache = new HistoryCache(() => {});
  let finish;
  const pending = cache.load({ callWS: request => new Promise(resolve => { finish = () => resolve(reply(request)); }) }, [item], 'max', 300, false, config);
  cache.clear(); finish(); await pending;
  assert.equal(cache.get(item.entity, 'max'), undefined);
  await cache.load({ callWS: async request => ({ ...reply(request), instrument: { id: '456' } }) }, [item], 'max', 300, false, config);
  assert.equal(cache.get(item.entity, 'max').error, 'invalid_response');
});

test('a mixed watchlist batches recorder requests and limits external concurrency', async () => {
  let running = 0, maximum = 0, recorder = 0;
  const cache = new HistoryCache(() => {});
  const items = [{ entity: 'sensor.local', history_provider: 'home_assistant' }, ...Array.from({ length: 8 }, (_, i) => ({ entity: `sensor.external_${i}`, history_id: '123' }))];
  await cache.load({ callWS: async request => {
    if (request.type.startsWith('history/')) { recorder++; return {}; }
    maximum = Math.max(maximum, ++running);
    await new Promise(resolve => setTimeout(resolve, 5));
    running--; return reply(request);
  } }, items, 'week', 300, false, config);
  assert.equal(recorder, 1); assert.equal(maximum, 3);
});
