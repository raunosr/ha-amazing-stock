import { ATTRIBUTE_ALIASES, ENTITY_PATTERN, escapeHtml as e, normalizeConfig } from './data.js';
import { STRINGS, language } from './i18n.js';
import { EDITOR_STYLES } from './styles.js';

export class AmazingStockCardEditor extends HTMLElement {
  constructor() {
    super(); this.attachShadow({ mode: 'open' });
    this.shadowRoot.addEventListener('change', event => this._change(event));
    this.shadowRoot.addEventListener('click', event => this._click(event));
  }
  setConfig(config) {
    this._config = structuredClone({ ...config, entities: (config.entities ?? []).map(item => typeof item === 'string' ? { entity: item } : item) });
    this._render();
  }
  set hass(hass) {
    const first = !this._hass; this._hass = hass;
    if (first) this._render();
  }
  _emit(next) {
    try { normalizeConfig(next); } catch (error) { this._error = error.message; this._render(); return; }
    this._error = ''; this._config = next;
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: structuredClone(next) }, bubbles: true, composed: true }));
    this._render();
  }
  _change(event) {
    const target = event.target;
    if (!target.dataset.field && !target.dataset.map) return;
    const next = structuredClone(this._config);
    let object = next;
    if (target.dataset.index !== undefined) object = next.entities[Number(target.dataset.index)];
    const key = target.dataset.map ?? target.dataset.field;
    if (target.dataset.map) object = object.attributes ??= {};
    let value = target.type === 'checkbox' ? target.checked : target.value.trim();
    if (target.type === 'number' && value !== '') value = Number(value);
    if (value === '') delete object[key]; else object[key] = value;
    this._emit(next);
  }
  _click(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const next = structuredClone(this._config), index = Number(button.dataset.index);
    const action = button.dataset.action;
    if (action === 'add') {
      const entity = this.shadowRoot.querySelector('#add-entity').value.trim();
      const t = STRINGS[language(this._hass, this._config)];
      if (!ENTITY_PATTERN.test(entity)) { this._error = t.invalidEntity; this._render(); return; }
      if (next.entities.some(item => item.entity === entity)) { this._error = t.duplicate; this._render(); return; }
      next.entities.push({ entity });
    } else if (action === 'remove') next.entities.splice(index, 1);
    else if (action === 'up' && index > 0) [next.entities[index - 1], next.entities[index]] = [next.entities[index], next.entities[index - 1]];
    else if (action === 'down' && index < next.entities.length - 1) [next.entities[index + 1], next.entities[index]] = [next.entities[index], next.entities[index + 1]];
    this._emit(next);
  }
  _render() {
    if (!this._config) return;
    const c = this._config, t = STRINGS[language(this._hass, c)];
    const open = [...this.shadowRoot.querySelectorAll('details[open]')].map(el => el.dataset.detail);
    const active = this.shadowRoot.activeElement;
    const focus = active?.id;
    const field = (key, label, value, index, type = 'text') => `<label>${e(label)}<input id="field-${index ?? 'root'}-${key}" data-field="${key}" ${index === undefined ? '' : `data-index="${index}"`} type="${type}" ${type === 'number' ? 'min="0" max="8" step="1"' : ''} value="${e(value ?? '')}"></label>`;
    this.shadowRoot.innerHTML = `<style>${EDITOR_STYLES}</style><h3>${t.configuration}</h3><p class="hint">${t.editorHint}</p>
      <div class="grid">${field('title', t.title, c.title)}<label>${t.defaultPeriod}<select data-field="default_period">${Object.entries(t.periods).map(([key, label]) => `<option value="${key}" ${(c.default_period ?? 'week') === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label></div>
      <div class="checks">${[['show_chart', t.showChart, c.show_chart !== false], ['show_sparklines', t.sparklines, c.show_sparklines !== false], ['compact', t.compact, c.compact === true]].map(([key, label, checked]) => `<label class="check"><input type="checkbox" data-field="${key}" ${checked ? 'checked' : ''}>${label}</label>`).join('')}</div>
      <datalist id="sensors">${Object.values(this._hass?.states ?? {}).filter(s => s.entity_id?.startsWith('sensor.')).sort((a, b) => a.entity_id.localeCompare(b.entity_id)).map(s => `<option value="${e(s.entity_id)}">${e(s.attributes?.friendly_name ?? s.entity_id)}</option>`).join('')}</datalist>
      ${c.entities.map((item, index) => `<section class="item"><div class="item-header"><span class="item-name">${e(item.name || this._hass?.states?.[item.entity]?.attributes?.name || this._hass?.states?.[item.entity]?.attributes?.friendly_name || item.entity)}</span><div class="actions">
        <button data-action="up" data-index="${index}" aria-label="${t.up}" title="${t.up}" ${index === 0 ? 'disabled' : ''}>↑</button><button data-action="down" data-index="${index}" aria-label="${t.down}" title="${t.down}" ${index === c.entities.length - 1 ? 'disabled' : ''}>↓</button><button data-action="remove" data-index="${index}" aria-label="${t.remove}" title="${t.remove}">×</button></div></div>
        <details data-detail="entity-${e(item.entity)}"><summary>${e(item.entity)}</summary><div class="grid"><label>${t.entity}<input id="field-${index}-entity" data-field="entity" data-index="${index}" list="sensors" value="${e(item.entity)}"></label>
        ${['name', 'symbol', 'currency', 'source'].map(key => field(key, t[key], item[key], index)).join('')}${field('decimals', t.precision, item.decimals, index, 'number')}
        <label>${t.kind}<select data-field="kind" data-index="${index}"><option value="">—</option>${['stock', 'etf', 'fund', 'index', 'etp', 'other'].map(key => `<option value="${key}" ${item.kind === key ? 'selected' : ''}>${t.kinds[key]}</option>`).join('')}</select></label></div>
        <details data-detail="map-${e(item.entity)}"><summary>${t.mappings}</summary><p class="hint">${t.mappingHint}</p><div class="grid">${Object.keys(ATTRIBUTE_ALIASES).map(key => `<label>${t.mapLabels[key]}<input id="map-${index}-${key}" data-map="${key}" data-index="${index}" value="${e(item.attributes?.[key] ?? '')}" placeholder="${e(ATTRIBUTE_ALIASES[key].join(' / '))}"></label>`).join('')}</div></details></details></section>`).join('')}
      <div class="add-row"><label>${t.entity}<input id="add-entity" list="sensors" placeholder="sensor.microsoft" autocomplete="off"></label><button data-action="add" ${c.entities.length >= 50 ? 'disabled' : ''}>+ ${t.add}</button></div>
      ${this._error ? `<p class="error" role="alert">${e(this._error)}</p>` : ''}`;
    this.shadowRoot.querySelectorAll('details').forEach(el => { el.open = open.includes(el.dataset.detail); });
    if (focus) this.shadowRoot.getElementById(focus)?.focus();
  }
}
if (!customElements.get('amazing-stock-card-editor')) customElements.define('amazing-stock-card-editor', AmazingStockCardEditor);
