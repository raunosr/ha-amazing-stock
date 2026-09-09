import { PERIODS, RECORDER_PERIODS, parseHistory, reduceHistory, historySource } from './data.js';

/** Both sources use HA's authenticated WebSocket; market HTTP lives in the optional integration. */
export class HistoryCache {
  constructor(onChange) { this.onChange = onChange; this.entries = new Map(); this.generation = 0; }
  clear() { this.generation++; this.entries.clear(); }
  get(entity, period) { return this.entries.get(`${period}:${entity}`); }
  instrument(entity) {
    for (const [key, entry] of this.entries) if (key.endsWith(`:${entity}`) && entry.instrument) return entry.instrument;
  }
  async load(hass, entities, period, refreshSeconds, force = false, config = {}) {
    if (!hass?.callWS || !entities.length) return;
    const now = Date.now(), generation = this.generation;
    const items = entities.map(item => typeof item === 'string' ? { entity: item } : item).filter(item => {
      const entry = this.get(item.entity, period);
      return !entry || (entry.status !== 'loading' && (force || now - entry.fetched >= refreshSeconds * 1000));
    });
    if (!items.length) return;
    const start = now - (PERIODS[period] ?? 0) * 86400000;
    const put = (item, data) => {
      if (generation === this.generation) this.entries.set(`${period}:${item.entity}`, { start, end: now, fetched: now, points: [], ...data });
    };
    const recorder = [], external = [];
    for (const item of items) {
      const source = historySource(config, item);
      put(item, { status: 'loading', provider: source.provider });
      (source.provider === 'home_assistant' ? recorder : external).push(item);
    }
    this.onChange();
    const loadRecorder = async () => {
      if (!recorder.length) return;
      try {
        if (!RECORDER_PERIODS.includes(period)) throw Error('unsupported_period');
        const response = await hass.callWS({
          type: 'history/history_during_period', start_time: new Date(start).toISOString(), end_time: new Date(now).toISOString(),
          entity_ids: recorder.map(item => item.entity), include_start_time_state: true, significant_changes_only: false, minimal_response: true, no_attributes: true,
        });
        recorder.forEach(item => put(item, { status: 'ready', provider: 'home_assistant', points: reduceHistory(parseHistory(response?.[item.entity], start, now)) }));
      } catch {
        recorder.forEach(item => put(item, { status: 'error', provider: 'home_assistant' }));
      }
      if (generation === this.generation) this.onChange();
    };
    // A watchlist may contain 50 sensors. Bound concurrent external requests.
    const worker = async () => {
      while (external.length && generation === this.generation) {
        const item = external.shift(), source = historySource(config, item);
        try {
          if (!source.instrument_id) throw { code: 'missing_instrument' };
          const response = await hass.callWS({ type: 'amazing_stock_data/history', entity_id: item.entity, ...source, period });
          if (generation !== this.generation) return;
          if (response?.provider !== source.provider || response?.instrument?.id !== source.instrument_id || response?.period !== period || !Array.isArray(response.points) || response.points.length > 20000 || !Number.isFinite(response.start) || !Number.isFinite(response.end) || response.end < response.start) throw { code: 'invalid_response' };
          const points = response.points.filter(point => Number.isFinite(point?.time) && point.time >= response.start && point.time <= response.end && (point.value === null || Number.isFinite(point.value))).sort((a, b) => a.time - b.time);
          put(item, { ...response, status: 'ready', points: reduceHistory(points) });
        } catch (error) {
          put(item, { status: 'error', provider: source.provider, error: error?.code ?? 'source_unavailable' });
        }
        if (generation === this.generation) this.onChange();
      }
    };
    await Promise.all([loadRecorder(), ...Array.from({ length: Math.min(3, external.length) }, worker)]);
  }
}
