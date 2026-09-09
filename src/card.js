import { normalizeConfig, normalizeEntity, plotGeometry, availablePeriods, escapeHtml as e } from './data.js';
import { HistoryCache } from './history.js';
import { STRINGS, language } from './i18n.js';
import { CARD_STYLES } from './styles.js';
import './editor.js';

const direction = value => value === null || value === 0 ? 'neutral' : value > 0 ? 'up' : 'down';
const ICONS = {
  'chart-line': '<path d="M3 3v18h18M6 15l5-5 4 3 6-8"/>',
  'chart-areaspline': '<path d="M3 3v18h18M5 18l5-10 5 6 6-10"/>',
  'information-outline': '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
  'chevron-up': '<path d="m6 15 6-6 6 6"/>',
  'clock-outline': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

export class AmazingStockCard extends HTMLElement {
  constructor() {
    super(); this.attachShadow({ mode: 'open' });
    this._visible = true; this._width = 600; this._height = 0;
    this._history = new HistoryCache(() => this._render());
    this._onVisibility = () => { if (!document.hidden) this._loadHistory(); };
    this.shadowRoot.addEventListener('click', event => this._click(event));
    this.shadowRoot.addEventListener('pointermove', event => this._tooltip(event));
    this.shadowRoot.addEventListener('pointerleave', () => { const tip = this.shadowRoot.querySelector('.tooltip'); if (tip) tip.hidden = true; });
  }
  static getConfigElement() { return document.createElement('amazing-stock-card-editor'); }
  static getStubConfig(hass) {
    return { entities: Object.values(hass?.states ?? {}).filter(s => s.entity_id?.startsWith('sensor.') && s.attributes?.device_class === 'monetary').slice(0, 5).map(s => s.entity_id) };
  }
  setConfig(input) {
    this._config = normalizeConfig(input);
    if (!this._config.entities.some(item => item.entity === this._selected)) this._selected = this._config.entities[0]?.entity;
    this._period = this._config.default_period; this._showChart = this._config.show_chart;
    this._applySizing();
    this._history.clear(); this._render(); this._startTimer(); this._loadHistory();
  }
  set hass(value) {
    const changed = !this._hass || this._hass.locale !== value.locale || this._hass.language !== value.language || this._config?.entities.some(item => this._hass.states?.[item.entity] !== value.states?.[item.entity]);
    this._hass = value;
    if (changed) { this._render(); this._loadHistory(); }
  }
  get hass() { return this._hass; }
  set layout(value) { this._layout = value; this._applySizing(); }
  get layout() { return this._layout; }
  _applySizing() {
    const rows = this._config?.grid_options?.rows;
    this.toggleAttribute('grid-sized', rows !== 'auto' && (this._layout === 'grid' || typeof rows === 'number'));
    this.style.setProperty('--stock-grid-rows', String(typeof rows === 'number' ? rows : this.getGridOptions().rows));
  }
  connectedCallback() {
    document.addEventListener('visibilitychange', this._onVisibility);
    this._resize = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && (Math.abs(width - this._width) > 1 || Math.abs(height - this._height) > 1)) {
        this._width = width; this._height = height; this._render();
      }
    });
    this._resize.observe(this);
    this._intersection = new IntersectionObserver(entries => {
      this._visible = entries[0].isIntersecting;
      if (this._visible) this._loadHistory();
    });
    this._intersection.observe(this);
    this._startTimer(); this._loadHistory();
  }
  disconnectedCallback() {
    clearInterval(this._timer); this._resize?.disconnect(); this._intersection?.disconnect();
    document.removeEventListener('visibilitychange', this._onVisibility); this._history.clear();
  }
  getCardSize() { return Math.ceil((120 + (this._showChart ? 330 : 0) + Math.min(320, (this._config?.entities.length ?? 0) * (this._config?.compact ? 53 : 65))) / 50); }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: 8, min_rows: 4 }; }
  _startTimer() {
    clearInterval(this._timer);
    if (this.isConnected && this._config) this._timer = setInterval(() => this._loadHistory(), this._config.history_refresh * 1000);
  }
  _loadHistory(force = false) {
    if (!this.isConnected || !this._visible || document.hidden || !this._hass || !this._config) return;
    if (this._config.show_sparklines || (this._showChart && this._period === 'week')) {
      const items = this._config.show_sparklines ? this._config.entities : this._config.entities.filter(item => item.entity === this._selected);
      void this._history.load(this._hass, items, 'week', this._config.history_refresh, force, this._config);
    }
    if (this._showChart && this._selected && this._period !== 'week') void this._history.load(this._hass, this._config.entities.filter(item => item.entity === this._selected), this._period, this._config.history_refresh, force, this._config);
  }
  _click(event) {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.entity) { this._selected = button.dataset.entity; this._showChart = true; }
    else if (button.dataset.period) this._period = button.dataset.period;
    else if (button.dataset.action === 'toggle') this._showChart = !this._showChart;
    else if (button.dataset.action === 'retry') { this._loadHistory(true); return; }
    else if (button.dataset.action === 'more') {
      this.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId: this._selected }, bubbles: true, composed: true })); return;
    } else return;
    this._render(); this._loadHistory();
  }
  _format(value, decimals = 2, sign = false) {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat(this._lang === 'fi' ? 'fi-FI' : 'en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, signDisplay: sign ? 'exceptZero' : 'auto' }).format(value);
  }
  _time(value, full = false) {
    if (!value) return '—';
    const timeZone = this._hass?.config?.time_zone;
    try { return new Intl.DateTimeFormat(this._lang === 'fi' ? 'fi-FI' : 'en-GB', { month: 'numeric', day: 'numeric', ...(full ? { year: 'numeric' } : {}), hour: '2-digit', minute: '2-digit', ...(timeZone ? { timeZone } : {}) }).format(value); }
    catch { return new Date(value).toISOString().slice(0, 16).replace('T', ' '); }
  }
  _meta(asset) { return [asset.symbol, asset.kind !== 'other' && (this._t.kinds[asset.kind] || asset.kind), asset.market, asset.source].filter(Boolean).join(' · '); }
  _currencyMismatch(asset, history) { return Boolean(history?.instrument?.currency && asset.currency && history.instrument.currency.toUpperCase() !== asset.currency.toUpperCase()); }
  _historyLabel(history) {
    if (!history || history.provider === 'home_assistant') return this._t.recorded;
    return `${history.source || 'Avanza'}${history.resolution ? ` · ${this._t.resolutions[history.resolution] || history.resolution}` : ''}`;
  }
  _spark(asset) {
    const history = this._history.get(asset.entity, 'week');
    const geometry = history?.status === 'ready' && !this._currencyMismatch(asset, history) && plotGeometry(history.points, 54, 25, history.start, history.end, { left: 1, right: 1, top: 2, bottom: 2 });
    return geometry ? `<svg class="spark" viewBox="0 0 54 25" aria-hidden="true"><path d="${geometry.path}"></path></svg>` : '';
  }
  _chart(asset) {
    const history = this._history.get(asset.entity, this._period), t = this._t;
    this._geometry = null;
    if (!history || history.status === 'loading') return `<div class="chart-message" role="status">${t.loading}</div>`;
    if (history.status === 'error') return `<div class="chart-message" role="status">${e(t.historyErrors[history.error] || t.historyError)}<button class="retry" data-action="retry">${t.retry}</button></div>`;
    if (this._currencyMismatch(asset, history)) return `<div class="chart-message" role="status">${t.currencyMismatch}</div>`;
    const width = Math.max(230, this._width - (this._width <= 580 ? 50 : 60));
    const height = this._chartHeight;
    const geometry = plotGeometry(history.points, width, height, history.start, history.end);
    if (!geometry) return `<div class="chart-message">${t.noHistory}</div>`;
    this._geometry = { ...geometry, width, history, asset };
    const ticks = [geometry.min, (geometry.min + geometry.max) / 2, geometry.max].filter((value, i, all) => all.indexOf(value) === i);
    const last = geometry.valid.at(-1);
    const formatDate = time => {
      const date = new Date(time);
      return this._period === 'day' ? this._time(time).split(' ').at(-1) : ['year', 'five_years', 'ten_years', 'max'].includes(this._period) ? `${date.getMonth() + 1}/${date.getFullYear()}` : `${date.getDate()}.${date.getMonth() + 1}.`;
    };
    return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${e(`${asset.name}: ${this._historyLabel(history)}, ${t.periodNames[this._period]}. ${t.range}: ${this._format(geometry.min, asset.decimals)}–${this._format(geometry.max, asset.decimals)} ${asset.currency}`)}">
      ${ticks.map(value => `<line class="grid" x1="4" x2="${geometry.right}" y1="${geometry.y(value)}" y2="${geometry.y(value)}"></line><text x="${width - 3}" y="${geometry.y(value) + 4}" text-anchor="end">${e(this._format(value, asset.decimals))}</text>`).join('')}
      <path class="line" d="${geometry.path}"></path><circle class="endpoint" cx="${geometry.x(last.time)}" cy="${geometry.y(last.value)}" r="3"></circle>
      ${[0, .5, 1].map((ratio, i) => `<text x="${geometry.x(history.start + (history.end - history.start) * ratio)}" y="${height - 3}" text-anchor="${['start', 'middle', 'end'][i]}">${e(formatDate(history.start + (history.end - history.start) * ratio))}</text>`).join('')}
    </svg><div class="tooltip" hidden></div>`;
  }
  _tooltip(event) {
    const chart = event.target.closest('.chart'), tip = this.shadowRoot.querySelector('.tooltip');
    if (!chart || !this._geometry || !tip) { if (tip) tip.hidden = true; return; }
    const { width, history, valid, asset, right } = this._geometry;
    const rect = chart.getBoundingClientRect(), x = (event.clientX - rect.left) / rect.width * width;
    const time = history.start + Math.max(0, Math.min(1, (x - 4) / (right - 4))) * (history.end - history.start);
    const point = valid.reduce((best, item) => Math.abs(item.time - time) < Math.abs(best.time - time) ? item : best);
    tip.textContent = `${this._time(point.time, true)} · ${this._format(point.value, asset.decimals)} ${asset.currency}`;
    tip.hidden = false;
  }
  _render() {
    if (!this._config || !this._hass) return;
    this._chartHeight = this.hasAttribute('grid-sized') && this.clientHeight <= 600 ? (this._width <= 580 ? 148 : 180) : 220;
    this.style.setProperty('--stock-chart-height', `${this._chartHeight}px`);
    this._lang = language(this._hass, this._config); this._t = STRINGS[this._lang];
    const t = this._t, c = this._config;
    const assets = c.entities.map(item => {
      const asset = normalizeEntity(this._hass, item), instrument = this._history.instrument(item.entity);
      if (instrument) {
        asset.symbol ||= instrument.symbol;
        asset.currency ||= instrument.currency;
        asset.market ||= instrument.market;
        if (asset.kind === 'other') asset.kind = instrument.kind || 'other';
      }
      return asset;
    });
    const selected = assets.find(item => item.entity === this._selected);
    const periods = selected ? availablePeriods(c, c.entities.find(item => item.entity === this._selected)) : [];
    if (!periods.includes(this._period)) this._period = 'week';
    const active = this.shadowRoot.activeElement;
    const scrollTop = this.shadowRoot.querySelector('.rows')?.scrollTop ?? 0;
    const focus = active?.dataset.entity ? `[data-entity="${active.dataset.entity}"]` : active?.dataset.period ? `[data-period="${active.dataset.period}"]` : active?.dataset.action ? `[data-action="${active.dataset.action}"]` : active?.classList.contains('rows') ? '.rows' : null;
    this.toggleAttribute('compact', c.compact);
    const history = selected && this._history.get(selected.entity, this._period);
    const isExternal = history && history.provider !== 'home_assistant';
    const change = isExternal ? (history.status === 'ready' && !this._currencyMismatch(selected, history) ? history.change : null) : selected?.changes[this._period];
    const partial = isExternal ? history.partial : history?.status === 'ready' && history.points.length && history.points[0].time > history.start + 3600000;
    const changeText = change && (change.percent !== null || change.value !== null) ? [change.value !== null && `${this._format(change.value, selected.decimals, true)} ${selected.currency}`, change.percent !== null && `${this._format(change.percent, 2, true)} %`].filter(Boolean).join(' · ') : t.noChange;
    const toggle = `<button class="icon-button" data-action="toggle" aria-label="${this._showChart ? t.close : t.show}" title="${this._showChart ? t.close : t.show}">${icon(this._showChart ? 'chevron-up' : 'chart-areaspline')}</button>`;
    const headingIcon = c.icon === 'mdi:chart-line' ? icon('chart-line') : `<ha-icon icon="${e(c.icon)}"></ha-icon>`;
    this.shadowRoot.innerHTML = `<style>${CARD_STYLES}</style><ha-card><div class="container ${c.show_sparklines ? '' : 'without-sparks'}">
      ${c.show_header ? `<header>${c.icon ? `<span class="heading-icon">${headingIcon}</span>` : ''}<h2>${e(c.title ?? t.title)}</h2><span class="count">${assets.length} ${t.assets}</span>${!this._showChart && assets.length ? toggle : ''}</header>` : !this._showChart && assets.length ? `<div class="list-toolbar"><span>${assets.length} ${t.assets}</span>${toggle}</div>` : ''}
      ${selected && this._showChart ? `<section class="detail" aria-label="${e(selected.name)}"><div class="detail-heading">${selected.symbol ? `<span class="detail-symbol">${e(selected.symbol)}</span>` : ''}<div class="detail-title" title="${e(selected.name)}">${e(selected.name)}</div><div class="detail-actions"><button class="icon-button" data-action="more" aria-label="${t.more}" title="${t.more}">${icon('information-outline')}</button>${toggle}</div></div>
        <div class="price-line"><div class="price">${e(this._format(selected.price, selected.decimals))}<span class="unit">${e(selected.currency)}</span></div><div class="return ${direction(change?.percent ?? change?.value ?? null)}">${e(changeText)}<span class="return-label">${isExternal ? t.chartChange : t.periodNames[this._period]}</span></div></div>
        ${!selected.available ? `<div class="meta" role="status">${selected.missing ? t.missing : t.unavailable}</div>` : ''}<div class="chart">${this._chart(selected)}</div>
        <div class="chart-bottom"><div class="periods" role="group" aria-label="${t.defaultPeriod}">${periods.map(key => `<button data-period="${key}" aria-pressed="${key === this._period}">${t.periods[key]}</button>`).join('')}</div><span class="history-note">${partial ? `${t.partial} · ` : ''}${e(this._historyLabel(history))}</span></div></section>` : ''}
      ${!assets.length ? `<div class="empty">${t.empty}</div>` : `<div class="columns" aria-hidden="true"><span>${t.asset}</span><span>${t.price}</span><span>${t.day}</span><span class="week-heading">${t.week}</span></div><div class="rows">${assets.map(asset => `<button class="asset-row" data-entity="${e(asset.entity)}" aria-pressed="${asset.entity === this._selected && this._showChart}"><span class="identity"><span><span class="name" title="${e(asset.name)}">${e(asset.name)}</span>${this._meta(asset) ? `<span class="small">${e(this._meta(asset))}</span>` : ''}</span></span><span class="number"><span class="sr-only">${t.price}: </span>${e(this._format(asset.price, asset.decimals))}<span class="small">${e(asset.available ? asset.currency : asset.missing ? t.missing : t.unavailable)}</span></span><span class="day ${direction(asset.available ? asset.changes.day.percent ?? asset.changes.day.value : null)}"><span class="sr-only">${t.day}: </span>${e(this._format(asset.available ? asset.changes.day.percent : null, 2, true))} %<small>${e(this._format(asset.available ? asset.changes.day.value : null, asset.decimals, true))} ${e(asset.currency)}</small></span><span class="week ${direction(asset.available ? asset.changes.week.percent : null)}"><span class="sr-only">${t.week}: </span>${c.show_sparklines ? this._spark(asset) : ''}${e(this._format(asset.available ? asset.changes.week.percent : null, 2, true))} %</span></button>`).join('')}</div>`}
      ${selected ? `<footer><span class="foot-time">${icon('clock-outline')}${t.sensorUpdated} ${e(this._time(selected.updated))}</span><span>${selected.quoteTime ? `${t.quoteTime} ${e(this._time(selected.quoteTime))}` : t.unknownTime}${selected.delayMinutes !== null ? ` · ${t.delay} ${e(selected.delayMinutes)} ${t.minutes}` : ''}</span></footer>` : ''}
    </div></ha-card>`;
    const rows = this.shadowRoot.querySelector('.rows');
    // HA's ha-card finishes its own render asynchronously. Measure after that
    // layout, otherwise its temporarily zero-height children shrink the graph.
    const chart = this.shadowRoot.querySelector('.chart');
    if (rows && chart && selected && this.hasAttribute('grid-sized')) {
      requestAnimationFrame(() => {
        if (!rows.isConnected || !chart.isConnected || this.clientHeight <= 440) return;
        if (rows.clientHeight < 80) {
          this._chartHeight = Math.max(100, this._chartHeight - (80 - rows.clientHeight));
          this.style.setProperty('--stock-chart-height', `${this._chartHeight}px`);
          chart.innerHTML = this._chart(selected);
        }
      });
    }
    if (rows) { rows.scrollTop = scrollTop; rows.tabIndex = 0; rows.setAttribute('role', 'region'); rows.setAttribute('aria-label', t.watchlist); }
    if (focus) this.shadowRoot.querySelector(focus)?.focus({ preventScroll: true });
  }
}
if (!customElements.get('amazing-stock-card')) customElements.define('amazing-stock-card', AmazingStockCard);
window.customCards ??= [];
if (!window.customCards.some(card => card.type === 'amazing-stock-card')) window.customCards.push({ type: 'amazing-stock-card', name: 'Amazing Stock Card', description: 'Investments from your existing sensors. Visual editor, history and attribute mapping.', preview: true });
