# Amazing Stock Card

A Home Assistant dashboard card for stocks, funds, ETFs and indices. Use your **existing price sensors**, select them in a visual editor, and see prices, changes and recorded history together.

**This repository contains only a UI card.** It does not install an integration, create sensors, fetch market prices, or require API keys. Avanza Stock attributes work automatically; other integrations can use the same entity contract or custom attribute mappings.

[Suomenkielinen ohje](README.fi.md) · [Latest release](https://github.com/raunosr/ha-amazing-stock/releases/latest)

![Amazing Stock Card with synthetic demonstration data](docs/preview.png)

## Features

- One watchlist with price, currency, daily absolute/percentage change and weekly sparklines.
- Select an instrument for a larger chart; choose day, week, month or year.
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

For Avanza Stock, select the sensors you already have. The card recognizes `name`, `unit_of_measurement`, `change`, `changePercent`, `changeOneWeek`, `changePercentOneWeek`, and the corresponding month/year fields. Neither Avanza IDs nor Avanza credentials belong in the card.

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

## History and freshness

Charts use Home Assistant's authenticated, read-only recorder history API. The recorder must include these sensors; no extra recording configuration is needed if they are already included. Data begins when HA started recording, and your retention setting determines how far back the chart can go. The card cannot retrieve older market history that HA never stored. Unavailable samples break the line, and long histories are downsampled while preserving extrema and gaps.

Prices update with HA entity state updates. History is refreshed at most once per five minutes by default. Requests are batched and cached, and paused while the card is disconnected, offscreen, or the document is hidden.

**The card cannot reduce the source's market-data delay.** “Sensor updated” is HA's state timestamp, not the exchange quote timestamp. A separate quote timestamp is displayed only when supplied. An optional `delay_minutes` label is configured explicitly; no real-time or 15-minute assumption is made.

Period change figures come directly from the source attributes. They can differ from the chart's first-to-last change: charts cover rolling 24-hour/7-day/30-day/365-day windows, while the source may use trading sessions or calendar periods. Missing change attributes display a dash; they are not estimated from incomplete recorder history.

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
