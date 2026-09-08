import { PERIODS, parseHistory, reduceHistory } from './data.js';

/** Read-only, bounded history cache. One request batches all missing entities. */
export class HistoryCache {
  constructor(onChange) { this.onChange = onChange; this.entries = new Map(); this.generation = 0; }
  clear() { this.generation++; this.entries.clear(); }
  get(entity, period) { return this.entries.get(`${period}:${entity}`); }
  async load(hass, entities, period, refreshSeconds, force = false) {
    if (!hass?.callWS || !entities.length) return;
    const now = Date.now();
    const ids = entities.filter(id => {
      const item = this.get(id, period);
      return !item || (item.status !== 'loading' && (force || now - item.fetched >= refreshSeconds * 1000));
    });
    if (!ids.length) return;
    const start = now - PERIODS[period] * 86400000;
    const generation = this.generation;
    ids.forEach(id => this.entries.set(`${period}:${id}`, { status: 'loading', start, end: now, points: [], fetched: now }));
    this.onChange();
    try {
      const response = await hass.callWS({
        type: 'history/history_during_period', start_time: new Date(start).toISOString(), end_time: new Date(now).toISOString(),
        entity_ids: ids, include_start_time_state: true, significant_changes_only: false, minimal_response: true, no_attributes: true,
      });
      if (generation !== this.generation) return;
      ids.forEach(id => this.entries.set(`${period}:${id}`, {
        status: 'ready', start, end: now, fetched: now,
        points: reduceHistory(parseHistory(response?.[id], start, now)),
      }));
    } catch {
      if (generation !== this.generation) return;
      ids.forEach(id => this.entries.set(`${period}:${id}`, { status: 'error', start, end: now, fetched: now, points: [] }));
    }
    if (generation === this.generation) this.onChange();
  }
}
