export const STRINGS = {
  en: {
    title: 'Investments', watchlist: 'Watchlist', assets: 'assets', asset: 'Asset', price: 'Price', day: 'Day', week: 'Week',
    periods: { day: '1D', week: '1W', month: '1M', year: '1Y' },
    periodNames: { day: 'day', week: 'week', month: 'month', year: 'year' },
    kinds: { stock: 'Stock', etf: 'ETF', exchange_traded_fund: 'ETF', fund: 'Fund', index: 'Index', etp: 'ETP', certificate: 'ETP', other: 'Asset' },
    loading: 'Loading history…', noHistory: 'No recorded history for this period.', historyError: 'History could not be loaded.', retry: 'Retry',
    recorded: 'Recorded in Home Assistant', partial: 'Partial history', close: 'Hide chart', show: 'Show chart', more: 'Entity details',
    empty: 'Choose your existing price sensors in the card editor.', unavailable: 'Unavailable', missing: 'Entity not found',
    sensorUpdated: 'Sensor updated', quoteTime: 'Quote time', delay: 'Data delay', minutes: 'min', realtime: 'Real time', unknownTime: 'Quote time not supplied',
    range: 'Recorded range', noChange: 'Change not supplied', configuration: 'Card settings', add: 'Add sensor', remove: 'Remove from card', up: 'Move up', down: 'Move down',
    entity: 'Price sensor', name: 'Display name', symbol: 'Symbol', currency: 'Currency / unit', kind: 'Instrument type', source: 'Source label',
    compact: 'Compact rows', showChart: 'Show large chart', sparklines: 'Show sparklines', defaultPeriod: 'Default chart period',
    mappings: 'Attribute mapping', mappingHint: 'Blank uses automatic matching. Values are attribute names, not formulas.',
    editorHint: 'Select existing sensors whose state is the price. Adding here only changes this card.',
    invalidEntity: 'Select a sensor entity.', duplicate: 'This sensor is already on the card.', preview: 'Preview', precision: 'Decimal places',
    mapLabels: { name: 'Name', symbol: 'Symbol', currency: 'Currency', kind: 'Instrument type', market: 'Market', quote_time: 'Quote timestamp', change: 'Day change', change_percent: 'Day change %', week_change: 'Week change', week_change_percent: 'Week change %', month_change: 'Month change', month_change_percent: 'Month change %', year_change: 'Year change', year_change_percent: 'Year change %' },
  },
  fi: {
    title: 'Sijoitukset', watchlist: 'Seurantalista', assets: 'kohdetta', asset: 'Seurattava', price: 'Kurssi', day: 'Päivä', week: 'Viikko',
    periods: { day: '1 pv', week: '1 vk', month: '1 kk', year: '1 v' },
    periodNames: { day: 'päivä', week: 'viikko', month: 'kuukausi', year: 'vuosi' },
    kinds: { stock: 'Osake', etf: 'ETF', exchange_traded_fund: 'ETF', fund: 'Rahasto', index: 'Indeksi', etp: 'ETP', certificate: 'ETP', other: 'Kohde' },
    loading: 'Haetaan historiaa…', noHistory: 'Tälle aikavälille ei ole tallennettua historiaa.', historyError: 'Historian hakeminen epäonnistui.', retry: 'Yritä uudelleen',
    recorded: 'Home Assistantiin tallennettu', partial: 'Historia on osittainen', close: 'Piilota kuvaaja', show: 'Näytä kuvaaja', more: 'Sensorin tiedot',
    empty: 'Valitse nykyiset kurssisensorisi kortin editorissa.', unavailable: 'Ei saatavilla', missing: 'Sensoria ei löydy',
    sensorUpdated: 'Sensori päivitetty', quoteTime: 'Kurssin aika', delay: 'Datan viive', minutes: 'min', realtime: 'Reaaliaikainen', unknownTime: 'Kurssin aikaleimaa ei toimitettu',
    range: 'Tallennettu vaihtelu', noChange: 'Muutosta ei toimitettu', configuration: 'Kortin asetukset', add: 'Lisää sensori', remove: 'Poista kortista', up: 'Siirrä ylemmäs', down: 'Siirrä alemmas',
    entity: 'Kurssisensori', name: 'Näyttönimi', symbol: 'Kaupankäyntitunnus', currency: 'Valuutta / yksikkö', kind: 'Kohteen tyyppi', source: 'Tietolähteen nimi',
    compact: 'Tiiviit rivit', showChart: 'Näytä suuri kuvaaja', sparklines: 'Näytä pienet kuvaajat', defaultPeriod: 'Kuvaajan oletusjakso',
    mappings: 'Attribuuttien vastaavuudet', mappingHint: 'Tyhjä kenttä käyttää automaattista tunnistusta. Syötä attribuutin nimi, ei laskukaavaa.',
    editorHint: 'Valitse olemassa olevat sensorit, joiden tila on hinta. Lisääminen muuttaa vain tätä korttia.',
    invalidEntity: 'Valitse sensorin entiteettitunnus.', duplicate: 'Sensori on jo kortissa.', preview: 'Esikatselu', precision: 'Desimaalien määrä',
    mapLabels: { name: 'Nimi', symbol: 'Tunnus', currency: 'Valuutta', kind: 'Kohteen tyyppi', market: 'Pörssi', quote_time: 'Kurssin aikaleima', change: 'Päivän muutos', change_percent: 'Päivän muutos %', week_change: 'Viikon muutos', week_change_percent: 'Viikon muutos %', month_change: 'Kuukauden muutos', month_change_percent: 'Kuukauden muutos %', year_change: 'Vuoden muutos', year_change_percent: 'Vuoden muutos %' },
  },
};
export function language(hass, config = {}) {
  const locale = config.locale || hass?.locale?.language || hass?.language || 'en';
  return String(locale).toLowerCase().startsWith('fi') ? 'fi' : 'en';
}
