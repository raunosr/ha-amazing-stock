import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HistoryCache } from '../src/history.js';

test('batches entities and deduplicates simultaneous requests', async () => {
  let requests = 0, finish;
  const cache = new HistoryCache(() => {});
  const hass = { callWS: request => { requests++; assert.deepEqual(request.entity_ids, ['sensor.a', 'sensor.b']); assert.equal(request.no_attributes, true); return new Promise(resolve => { finish = resolve; }); } };
  const first = cache.load(hass, ['sensor.a', 'sensor.b'], 'week', 300);
  await cache.load(hass, ['sensor.a'], 'week', 300);
  assert.equal(requests, 1); finish({ 'sensor.a': [{ s: '10', lu: Date.now() / 1000 - 1 }] }); await first;
  assert.equal(cache.get('sensor.a', 'week').points[0].value, 10);
  assert.equal(cache.get('sensor.b', 'week').points.length, 0);
  await cache.load(hass, ['sensor.a'], 'week', 300); assert.equal(requests, 1);
});
test('old requests cannot populate a new configuration or disconnected card', async () => {
  let finish;
  const cache = new HistoryCache(() => {});
  const request = cache.load({ callWS: () => new Promise(resolve => { finish = resolve; }) }, ['sensor.a'], 'day', 300);
  cache.clear(); finish({ 'sensor.a': [{ s: '99', lu: Date.now() / 1000 }] }); await request;
  assert.equal(cache.get('sensor.a', 'day'), undefined);
});
test('permission or network errors are visible and retryable', async () => {
  const cache = new HistoryCache(() => {});
  await cache.load({ callWS: async () => { throw new Error('permission denied'); } }, ['sensor.a'], 'day', 300);
  assert.equal(cache.get('sensor.a', 'day').status, 'error');
  await cache.load({ callWS: async () => ({}) }, ['sensor.a'], 'day', 300, true);
  assert.equal(cache.get('sensor.a', 'day').status, 'ready');
});
