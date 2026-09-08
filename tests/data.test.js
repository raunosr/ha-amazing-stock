import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig, normalizeEntity, numberValue, attributeAt, parseHistory, reduceHistory, plotGeometry, escapeHtml, timestamp } from '../src/data.js';

test('unavailable and invalid prices never become zero', () => {
  for (const input of [undefined, null, '', 'unknown', 'unavailable', true, NaN, Infinity, '1,234.50', '12 USD']) assert.equal(numberValue(input), null);
  assert.equal(numberValue('0'), 0); assert.equal(numberValue('−1,25 %'), -1.25); assert.equal(numberValue('1 234,50'), 1234.5);
});
test('configuration enforces the price sensor contract and rejects unsafe mappings', () => {
  assert.equal(normalizeConfig({ entities: ['sensor.msft'] }).entities[0].entity, 'sensor.msft');
  for (const config of [{ entities: ['light.stock'] }, { entities: ['sensor.a', 'sensor.a'] }, { entities: [{ entity: 'sensor.a', attributes: { change: '__proto__.value' } }] }, { entities: ['sensor.a'], default_period: 'all' }, { entities: [{ entity: 'sensor.a', delay_minutes: '1,5' }] }]) assert.throws(() => normalizeConfig(config));
  assert.equal(attributeAt({ quote: { daily: 2.5 } }, 'quote.daily'), 2.5);
  assert.equal(attributeAt({}, 'constructor.name'), undefined);
});
test('Avanza fields work without integration-specific configuration', () => {
  const hass = { states: { 'sensor.a': { state: '120.50', last_updated: '2026-01-02T12:00:00Z', attributes: { name: 'Example', unit_of_measurement: 'USD', change: -1.5, changePercent: -1.23, changeOneWeek: 5, changePercentOneWeek: 4.32 } } } };
  const item = normalizeEntity(hass, { entity: 'sensor.a' });
  assert.equal(item.name, 'Example'); assert.equal(item.currency, 'USD'); assert.equal(item.price, 120.5);
  assert.deepEqual(item.changes.week, { value: 5, percent: 4.32 });
  assert.equal(item.quoteTime, null); assert.equal(item.delayMinutes, null); assert.notEqual(item.updated, null);
});
test('generic mappings override aliases and do not mutate source state', () => {
  const state = { state: '0', attributes: { name: 'Auto', changePercent: 7, quote: { daily: -2, at: 1750000000 } } };
  const item = normalizeEntity({ states: { 'sensor.a': state } }, { entity: 'sensor.a', name: 'Custom', currency: 'EUR', attributes: { change_percent: 'quote.daily', quote_time: 'quote.at', name: null } });
  assert.equal(item.price, 0); assert.equal(item.available, true); assert.equal(item.name, 'Custom');
  assert.equal(item.changes.day.percent, -2); assert.equal(item.quoteTime, 1750000000000); assert.equal(state.attributes.changePercent, 7);
  assert.equal(normalizeEntity({}, { entity: 'sensor.a' }).missing, true);
});
test('history decodes compressed and normal states with gaps and actual timestamps', () => {
  const start = 1750000000000, end = start + 10000;
  const points = parseHistory([{ s: '10', lu: (start - 1000) / 1000 }, { state: 'unknown', last_updated: new Date(start + 1000).toISOString() }, { s: '12', lu: (start + 2000) / 1000 }, { s: '13', lu: (end + 1000) / 1000 }], start, end);
  assert.deepEqual(points, [{ time: start, value: 10 }, { time: start + 1000, value: null }, { time: start + 2000, value: 12 }]);
  assert.equal(plotGeometry(points, 400, 178, start, end).path.match(/M/g).length, 2);
  assert.equal(timestamp('not-a-time'), null);
});
test('downsampling preserves extrema and never connects through unavailable intervals', () => {
  const original = Array.from({ length: 20000 }, (_, i) => ({ time: 1750000000000 + i * 1000, value: i % 17 === 8 ? null : Math.sin(i) }));
  original[403].value = 999; original[777].value = -999;
  const reduced = reduceHistory(original);
  assert.ok(reduced.length <= 600); assert.ok(reduced.some(p => p.value === 999)); assert.ok(reduced.some(p => p.value === -999));
  for (let i = 1; i < reduced.length; i++) {
    if (reduced[i - 1].value !== null && reduced[i].value !== null) {
      const between = original.filter(p => p.time > reduced[i - 1].time && p.time < reduced[i].time);
      assert.ok(between.every(p => p.value !== null));
    }
  }
});
test('flat and empty history remain valid; text is HTML escaped', () => {
  assert.equal(plotGeometry([], 400, 178, 0, 10), null);
  const flat = plotGeometry([{ time: 1, value: 0 }, { time: 10, value: 0 }], 400, 178, 0, 10);
  assert.ok(Number.isFinite(flat.y(0))); assert.doesNotMatch(flat.path, /NaN|Infinity/);
  assert.equal(escapeHtml('<img src="x" onerror=\'a\'>&'), '&lt;img src=&quot;x&quot; onerror=&#39;a&#39;&gt;&amp;');
});
