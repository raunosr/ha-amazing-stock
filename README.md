# Amazing Stock Card

A Home Assistant dashboard card for stocks, funds, ETFs and indices. Use your **existing price sensors**, select them in a visual editor, and see prices, changes and recorded history together.

**This repository contains the UI card.** Existing sensors supply current prices. History can use HA recorder or the optional [Amazing Stock Data integration](https://github.com/raunosr/ha-amazing-stock-data) for Avanza's external history. No API key is required. Avanza Stock attributes work automatically; other integrations can use the same entity contract or custom mappings.

[Suomenkielinen ohje](README.fi.md) · [Latest release](https://github.com/raunosr/ha-amazing-stock/releases/latest)

![Amazing Stock Card with synthetic demonstration data](docs/preview.png)

## Features

- One watchlist with price, currency, daily absolute/percentage change and weekly sparklines.
- Select an instrument for a larger chart; choose day, week, month or year, plus **5 years, 10 years and MAX** with external history.
- Compact selected-instrument header with a real ticker, name, price and change. Long names truncate without growing the card.
- Optional heading: show/hide it, choose your text and any Home Assistant icon. Chart visibility and weekly sparklines remain independent options.
- Visual editor: add existing sensors, reorder rows, choose names and map attributes.
- Stocks, funds, ETFs, ETPs and indices; currencies stay separate, with no misleading mixed-currency total.
- Home Assistant theme colors, compact rows, responsive mobile layout, Finnish and English.
- Scrollable watchlist inside the card's configured HA grid height; adding instruments does not grow the card indefinitely.
- Missing values stay missing. Unavailable history creates gaps; shorter retention is identified as partial history.
- Bundled JavaScript with no runtime dependencies, external fonts, analytics or market API calls.

## Install with HACS

1. Open HACS → menu → **Custom repositories**.
2. Add `https://github.com/raunosr/ha-amazing-stock`, category **Dashboard** (called **Lovelace** in some older HACS versions).
3. Download **Amazing Stock Card** and reload the browser.
4. Edit a dashboard, add **Amazing Stock Card**, and select your existing price sensors.

This is a HACS **custom repository**, not a default-store listing. Home Assistant 2024.8 or later and a current browser are required.

If the card does not appear, check **Settings → Dashboards → Resources** (enable advanced mode in your profile if necessary). The resource is:

```yaml
url: /hacsfiles/ha-amazing-stock/ha-amazing-stock.js
type: module
```

For manual installation, copy the release's `ha-amazing-stock.js` to `/config/www/ha-amazing-stock.js` and add `/local/ha-amazing-stock.js` as a JavaScript module resource.

## Configure

The visual editor is the normal setup path. Adding a sensor here only adds it to the card; the source integration must already provide it.

Optional **dashboard card YAML** (not `configuration.yaml`):

```yaml
type: custom:amazing-stock-card
title: Investments
entities:
  - entity: sensor.microsoft
    symbol: MSFT
    kind: stock
  - entity: sensor.global_index_fund
    kind: fund
default_period: week
```

### Compatible entities

The entity must be a `sensor` whose **state is the current numeric price or index level**. The card does not read a price from an attribute. Its currency/unit is normally `unit_of_measurement` or `currency`; it can also be set in the editor. A monetary device class is useful for automatic suggestions but is not required.

For Avanza Stock, select the sensors you already have. The card recognizes `name`, `unit_of_measurement`, `change`, `changePercent`, `changeOneWeek`, `changePercentOneWeek`, and the corresponding month/year fields. External history additionally uses the listing's Avanza ID, normally detected from `sensor.avanza_stock_ID`. Avanza credentials never belong in the card.

For another integration, map its attribute names in the editor or in YAML:

```yaml
type: custom:amazing-stock-card
entities:
  - entity: sensor.example_price
    name: Example stock
    currency: USD
    kind: stock
    source: My integration
    attributes:
      change: daily_change
      change_percent: daily_change_pct
      week_change_percent: performance.week_percent
      quote_time: price_timestamp
```

Percentages must be percentage points (`1.25` means `+1.25%`, not `125%`). There are no templates, formulas or unit conversions. See the [full data contract](docs/data-contract.md) for aliases and options.

## Grid size and scrolling

In a **Sections** dashboard, use HA's card **Layout** controls or `grid_options`. The default is 12 columns × 8 rows, matching the HA Layout picker's visible range. The list scrolls within the available space while the heading, column labels and footer stay in place. Scroll position survives price updates and selecting instruments.

```yaml
grid_options:
  columns: 12
  rows: 8
```

For heights of 600 px or less, the chart becomes shorter while keeping its labels readable. At 440 px or less, the graph is hidden to leave space for rows; the selected price summary remains. Below 360 px, the list gets priority over the summary. HA's grid row height and spacing theme variables are respected. Larger explicit row counts remain supported in YAML. In masonry layouts or with `rows: auto`, the list has a 320 px scroll area cap.

## Heading and chart controls

Use **Show card heading**, **Heading text** and **Heading icon** in the visual editor. YAML equivalents are `show_header: false`, `title: My portfolio` and `icon: mdi:finance`; `icon: ""` hides only the icon. The heading stays visible by default for compatibility. `show_chart` controls the initial large-chart state; it can always be reopened from a row or the chart button even when the heading is hidden. `show_sparklines` independently controls the weekly mini charts on wider cards. If a sensor lacks a ticker, enter **Symbol** in its row settings; external history also supplies missing listing metadata.

## External history (optional)

1. Install [Amazing Stock Data](https://github.com/raunosr/ha-amazing-stock-data) through HACS as an **Integration**.
2. Restart HA and add **Amazing Stock Data** under Settings → Devices & services.
3. In the card editor set **History source → Avanza**.

This enables **5Y, 10Y and MAX** for that source. Existing `sensor.avanza_stock_ID` names are detected automatically; renamed sensors and other integrations need the same listing's numeric **Avanza instrument ID** in the row settings. Sources can be selected per row, so recorder-backed and external-backed instruments can coexist.

```yaml
type: custom:amazing-stock-card
show_header: false
show_chart: true
show_sparklines: true
history_provider: avanza
default_period: five_years
entities:
  - entity: sensor.avanza_stock_3873
  - entity: sensor.renamed_price
    history_id: "1064172"
  - entity: sensor.local_fund
    history_provider: home_assistant
```

USA stocks, ETFs and ETPs have been checked. Other instruments depend on the public Avanza endpoint's coverage. MAX means all data Avanza returns for that listing; it does not guarantee the instrument's full lifetime. Five-year charts use daily closes and 10-year/MAX charts weekly closes. The source and resolution are shown below the graph. Currency mismatches are rejected, no exchange conversion is performed, and failures do not silently substitute recorder history. Avanza's endpoints are unofficial and can change; no real-time or total-return guarantee is made.

## History and freshness

By default charts use Home Assistant's authenticated, read-only recorder history API. The recorder must include these sensors; no extra recording configuration is needed if they are already included. Data begins when HA started recording, and retention determines how far back this source can go. The optional external source can retrieve older market history. Unavailable samples break the line, and long histories are downsampled while preserving extrema and gaps.

Prices update with HA entity state updates. History is refreshed at most once per five minutes by default. Requests are batched and cached, and paused while the card is disconnected, offscreen, or the document is hidden.

**The card cannot reduce the source's market-data delay.** “Sensor updated” is HA's state timestamp, not the exchange quote timestamp. A separate quote timestamp is displayed only when supplied. An optional `delay_minutes` label is configured explicitly; no real-time or 15-minute assumption is made.

With recorder history, period change figures come directly from the sensor attributes and may use different boundaries than the chart's rolling windows. Missing change attributes display a dash. With external history, the selected chart's change is calculated from its actual first and last closes and labeled **chart**. The current price and list's day/week returns still come from the sensor. The integration preserves Avanza's supplied adjustments, which are unspecified; chart change is not labeled total return. No synthetic current-price endpoint is appended.

## Development

```sh
npm ci
npm run build
npm test
npm run check
npx playwright install chromium
npm run test:browser
node scripts/serve.mjs
```

Open `http://127.0.0.1:4173/` for a demo with **synthetic data**. Browser tests exercise the compiled bundle, visual editor, mobile/light/dark layouts, failed and empty history, unavailable entities, escaping and stale responses. CI also checks that the committed bundle matches its source. A live HA installation is still the final environment-specific verification step.

The released file is `ha-amazing-stock.js` in the repository root. Source code lives in `src/`; development dependencies are not shipped to HA. See [contributing](CONTRIBUTING.md), [security](SECURITY.md) and [MIT license](LICENSE).
