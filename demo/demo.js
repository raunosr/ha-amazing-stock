import '../ha-amazing-stock.js';

// Synthetic fixtures only. This file is never included in the HACS bundle.
const fixtures = [
  ['microsoft', 'Microsoft', 'MSFT', 'USD', 'stock', 492.39, 1.24, 6.03, 3.68],
  ['nokia', 'Nokia', 'NOK', 'USD', 'stock', 10.85, -0.73, -0.08, 2.14],
  ['sp500', 'iShares Core S&P 500', 'SXR8', 'EUR', 'etf', 713.04, 0.82, 5.80, 1.92],
  ['technology', 'iShares S&P 500 IT Sector', 'QDVE', 'EUR', 'etf', 44.53, 1.63, 0.71, -0.64],
  ['world', 'Global Index Fund', 'WORLD', 'EUR', 'fund', 186.25, -0.31, -0.58, 0.87],
];
const now = Date.now();
const states = Object.fromEntries(fixtures.map(([id, name, symbol, currency, kind, price, changePercent, change, changePercentOneWeek]) => [`sensor.${id}`, {
  entity_id: `sensor.${id}`, state: String(price), last_updated: new Date(now - 180000).toISOString(),
  attributes: { name, friendly_name: name, symbol, unit_of_measurement: currency, instrument_type: kind, device_class: 'monetary', changePercent, change, changePercentOneWeek, changeOneWeek: price * changePercentOneWeek / 100, changePercentOneMonth: 4.42, changeOneMonth: 12.4, changePercentOneYear: 16.35, changeOneYear: 53.8 },
}]));
window.demoCalls = [];
window.demoHass = {
  states, locale: { language: 'fi' }, config: { time_zone: 'Europe/Helsinki' },
  async callWS(request) {
    window.demoCalls.push(request);
    const start = Date.parse(request.start_time), end = Date.parse(request.end_time);
    await new Promise(resolve => setTimeout(resolve, 60));
    return Object.fromEntries(request.entity_ids.map((id, assetIndex) => [id, Array.from({ length: 100 }, (_, index) => {
      const base = Number(states[id]?.state ?? 100);
      const value = base * (0.96 + index / 2400 + Math.sin(index * 0.13 + assetIndex) * .008 + Math.sin(index * .53) * .003);
      return { s: String(value), lu: (start + (end - start) * index / 99) / 1000 };
    })]));
  },
};
window.demoCard = document.createElement('amazing-stock-card');
window.demoConfig = { type: 'custom:amazing-stock-card', entities: fixtures.map(([id]) => ({ entity: `sensor.${id}`, source: 'Demo' })) };
window.demoCard.setConfig(window.demoConfig); window.demoCard.hass = window.demoHass;
document.querySelector('#card').append(window.demoCard);
window.demoCard.addEventListener('hass-more-info', event => { window.lastMoreInfo = event.detail.entityId; });
document.querySelector('#theme').onclick = () => document.body.classList.toggle('light');
document.querySelector('#lang').onclick = () => { window.demoHass = { ...window.demoHass, locale: { language: window.demoHass.locale.language === 'fi' ? 'en' : 'fi' } }; window.demoCard.hass = window.demoHass; };
document.querySelector('#edit').onclick = () => {
  const host = document.querySelector('#editor'); host.hidden = !host.hidden;
  if (!host.firstChild) {
    window.demoEditor = document.createElement('amazing-stock-card-editor');
    window.demoEditor.setConfig(window.demoConfig); window.demoEditor.hass = window.demoHass; host.append(window.demoEditor);
    window.demoEditor.addEventListener('config-changed', event => { window.demoConfig = event.detail.config; window.demoCard.setConfig(window.demoConfig); });
  }
};
