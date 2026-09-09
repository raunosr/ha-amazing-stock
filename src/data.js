/** The card's data contract. No knowledge of integrations or network APIs. */
export const PERIODS = { day: 1, week: 7, month: 30, year: 365, five_years: 1826, ten_years: 3653, max: null };
export const RECORDER_PERIODS = ['day', 'week', 'month', 'year'];

/** Provider-specific identification stays at the history boundary. */
export function historySource(config, item) {
  const provider = item.history_provider ?? config.history_provider ?? 'home_assistant';
  return { provider, instrument_id: item.history_id || (provider === 'avanza' ? /^sensor\.avanza_stock_([0-9]{1,12})$/.exec(item.entity)?.[1] : undefined) };
}
export function availablePeriods(config, item) {
  return historySource(config, item).provider === 'home_assistant' ? RECORDER_PERIODS : Object.keys(PERIODS);
}
export const ATTRIBUTE_ALIASES = {
  name: ['name', 'friendly_name'],
  symbol: ['symbol', 'ticker', 'tickerSymbol', 'shortName'],
  currency: ['currency', 'unit_of_measurement'],
  kind: ['instrument_type', 'asset_type', 'type'],
  market: ['market', 'marketPlace', 'exchange'],
  quote_time: ['quote_time', 'timeOfLast', 'quote.timestamp'],
  change: ['change', 'day_change'],
  change_percent: ['change_percent', 'changePercent', 'day_change_percent'],
  week_change: ['week_change', 'changeOneWeek'],
  week_change_percent: ['week_change_percent', 'changePercentOneWeek'],
  month_change: ['month_change', 'changeOneMonth'],
  month_change_percent: ['month_change_percent', 'changePercentOneMonth'],
  year_change: ['year_change', 'changeOneYear'],
  year_change_percent: ['year_change_percent', 'changePercentOneYear'],
};
export const ENTITY_PATTERN = /^sensor\.[a-z0-9_]+$/;
export const BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export function numberValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const clean = value.trim().replace(/[\s\u00a0\u202f]/g, '').replace(/%$/, '').replace('−', '-');
  // Accept decimal commas, but never guess an ambiguous mixed separator format.
  if (!/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(clean)) return null;
  const result = Number(clean.replace(',', '.'));
  return Number.isFinite(result) ? result : null;
}

export function attributeAt(attributes, path) {
  if (typeof path !== 'string' || !path || path.length > 150) return undefined;
  const keys = path.split('.');
  if (keys.some(key => BLOCKED_KEYS.has(key))) return undefined;
  if (Object.hasOwn(attributes, path)) return attributes[path];
  return keys.reduce((value, key) => value && typeof value === 'object' && Object.hasOwn(value, key) ? value[key] : undefined, attributes);
}

export function mappedAttribute(attributes, mapping, key) {
  if (Object.hasOwn(mapping ?? {}, key)) return mapping[key] ? attributeAt(attributes, mapping[key]) : undefined;
  for (const path of ATTRIBUTE_ALIASES[key] ?? []) {
    const value = attributeAt(attributes, path);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

export function timestamp(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number' || /^\d+(\.\d+)?$/.test(String(value))) {
    const numeric = Number(value);
    const ms = numeric < 1e12 ? numeric * 1000 : numeric;
    return Number.isFinite(ms) && ms > 0 && ms < 8.64e15 ? ms : null;
  }
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export function normalizeConfig(input) {
  if (!input || !Array.isArray(input.entities)) throw new Error('Define entities as a list of sensor entities.');
  if (input.entities.length > 50) throw new Error('A card supports at most 50 entities.');
  const seen = new Set();
  const entities = input.entities.map(item => {
    const config = typeof item === 'string' ? { entity: item } : { ...item };
    if (!ENTITY_PATTERN.test(config.entity ?? '')) throw new Error('Each entity must be a sensor entity ID.');
    if (seen.has(config.entity)) throw new Error(`Duplicate entity: ${config.entity}`);
    seen.add(config.entity);
    if (config.attributes !== undefined && (!config.attributes || Array.isArray(config.attributes) || typeof config.attributes !== 'object')) throw new Error('attributes must be an object.');
    for (const [key, value] of Object.entries(config.attributes ?? {})) {
      if (!Object.hasOwn(ATTRIBUTE_ALIASES, key)) throw new Error(`Unknown attribute mapping: ${key}`);
      if (value !== null && (typeof value !== 'string' || value.length > 150 || value.split('.').some(part => BLOCKED_KEYS.has(part)))) throw new Error(`Invalid attribute path: ${key}`);
    }
    if (config.decimals !== undefined && (!Number.isInteger(config.decimals) || config.decimals < 0 || config.decimals > 8)) throw new Error('decimals must be between 0 and 8.');
    if (config.delay_minutes !== undefined && (typeof config.delay_minutes !== 'number' || !Number.isFinite(config.delay_minutes) || config.delay_minutes < 0)) throw new Error('delay_minutes must be a non-negative number.');
    if (config.history_provider !== undefined && !['home_assistant', 'avanza'].includes(config.history_provider)) throw new Error('Unknown history provider.');
    if (config.history_id !== undefined && (typeof config.history_id !== 'string' || !/^[0-9]{1,12}$/.test(config.history_id))) throw new Error('history_id must be an Avanza instrument ID as text.');
    return config;
  });
  const period = input.default_period ?? 'week';
  if (!Object.hasOwn(PERIODS, period)) throw new Error('Unknown default_period.');
  if (input.history_provider !== undefined && !['home_assistant', 'avanza'].includes(input.history_provider)) throw new Error('Unknown history provider.');
  const refresh = input.history_refresh ?? 300;
  if (!Number.isInteger(refresh) || refresh < 60 || refresh > 3600) throw new Error('history_refresh must be between 60 and 3600 seconds.');
  const rows = input.grid_options?.rows;
  if (rows !== undefined && rows !== 'auto' && (!Number.isInteger(rows) || rows < 1)) throw new Error('grid_options.rows must be a positive integer or auto.');
  if (input.title !== undefined && typeof input.title !== 'string') throw new Error('title must be text.');
  if (input.icon !== undefined && (typeof input.icon !== 'string' || (input.icon !== '' && !/^[a-z0-9_-]+:[a-zA-Z0-9_-]+$/.test(input.icon)))) throw new Error('icon must be an icon name such as mdi:finance, or an empty string.');
  if (input.show_header !== undefined && typeof input.show_header !== 'boolean') throw new Error('show_header must be true or false.');
  return { ...input, entities, default_period: period, show_header: input.show_header !== false, icon: input.icon ?? 'mdi:chart-line', show_chart: input.show_chart !== false, show_sparklines: input.show_sparklines !== false, compact: input.compact === true, history_refresh: refresh };
}

const textValue = value => typeof value === 'string' || typeof value === 'number' ? String(value) : '';

export function normalizeEntity(hass, config) {
  const state = hass?.states?.[config.entity];
  const attrs = state?.attributes ?? {};
  const get = key => mappedAttribute(attrs, config.attributes, key);
  const price = numberValue(state?.state);
  const available = price !== null;
  const changes = {};
  for (const period of Object.keys(PERIODS)) {
    const prefix = period === 'day' ? '' : `${period}_`;
    changes[period] = { value: numberValue(get(`${prefix}change`)), percent: numberValue(get(`${prefix}change_percent`)) };
  }
  return {
    entity: config.entity,
    name: textValue(config.name || get('name') || config.entity),
    symbol: textValue(config.symbol || get('symbol')),
    currency: textValue(config.currency ?? get('currency')),
    kind: textValue(config.kind || get('kind') || 'other').toLowerCase(),
    market: textValue(config.market || get('market')),
    source: textValue(config.source),
    price, available, missing: !state, changes,
    decimals: config.decimals ?? 2,
    quoteTime: timestamp(get('quote_time')),
    updated: timestamp(state?.last_updated),
    delayMinutes: config.delay_minutes === undefined ? null : Number(config.delay_minutes),
  };
}

/** HA history can contain compressed WebSocket or normal REST-style states. */
export function parseHistory(states, start, end) {
  const points = new Map();
  for (const state of Array.isArray(states) ? states : []) {
    const time = timestamp(state.lu ?? state.last_updated ?? state.lc ?? state.last_changed);
    if (time === null || time > end) continue;
    const value = numberValue(state.s ?? state.state);
    points.set(Math.max(start, time), { time: Math.max(start, time), value });
  }
  return [...points.values()].sort((a, b) => a.time - b.time);
}

/** Retain extrema and availability gaps instead of inventing intermediate values. */
export function reduceHistory(points, limit = 600) {
  if (!Number.isInteger(limit) || limit < 8) throw new Error('History limit must be at least 8.');
  if (points.length <= limit) return points;
  const bucketSize = Math.ceil(points.length / Math.floor(limit / 8));
  const result = new Map();
  for (let offset = 0; offset < points.length; offset += bucketSize) {
    const bucket = points.slice(offset, offset + bucketSize);
    let min = 0, max = 0;
    bucket.forEach((point, index) => {
      if (point.value !== null && (bucket[min].value === null || point.value < bucket[min].value)) min = index;
      if (point.value !== null && (bucket[max].value === null || point.value > bucket[max].value)) max = index;
    });
    const indexes = [...new Set([0, min, max, bucket.length - 1])].sort((a, b) => a - b);
    indexes.forEach((index, position) => {
      // Preserve a break between every sampled pair separated by missing data.
      const previous = indexes[position - 1];
      if (previous !== undefined) {
        const gap = bucket.slice(previous + 1, index).find(p => p.value === null);
        if (gap) result.set(gap.time, gap);
      }
      result.set(bucket[index].time, bucket[index]);
    });
  }
  return [...result.values()].sort((a, b) => a.time - b.time);
}

export function plotGeometry(points, width, height, start, end, margin = { left: 4, right: 70, top: 12, bottom: 25 }) {
  const valid = points.filter(p => p.value !== null && Number.isFinite(p.value));
  if (!valid.length) return null;
  const min = Math.min(...valid.map(p => p.value)), max = Math.max(...valid.map(p => p.value));
  const pad = (max - min) * 0.12 || Math.max(Math.abs(min) * 0.005, 0.01);
  const lo = min - pad, hi = max + pad;
  const x = time => margin.left + Math.max(0, Math.min(1, (time - start) / (end - start || 1))) * (width - margin.left - margin.right);
  const y = value => height - margin.bottom - (value - lo) / (hi - lo) * (height - margin.top - margin.bottom);
  let path = '', open = false;
  for (const point of points) {
    if (point.value === null) { open = false; continue; }
    path += `${open ? 'L' : 'M'}${x(point.time).toFixed(2)},${y(point.value).toFixed(2)} `;
    open = true;
  }
  return { path, x, y, min, max, lo, hi, valid, bottom: height - margin.bottom, right: width - margin.right };
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
