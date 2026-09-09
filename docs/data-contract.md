# Entity contract and configuration

## Card options

| Option | Default | Meaning |
| --- | --- | --- |
| `type` | required in dashboard | `custom:amazing-stock-card` |
| `entities` | required | Up to 50 unique `sensor.*` IDs or entity configuration objects; an empty list opens an empty state. |
| `title` | localized Investments | Card heading. |
| `locale` | HA language | `fi` for Finnish; other languages use English. |
| `default_period` | `week` | `day`, `week`, `month`, `year`. |
| `show_chart` | `true` | Initially show the selected asset's chart. Clicking a row opens it. |
| `show_sparklines` | `true` | Fetch and show weekly mini charts. The weekly percentage column remains on wide cards. |
| `compact` | `false` | Smaller rows. |
| `history_refresh` | `300` | Recorder fetch interval, integer seconds from 60 to 3600. Does not alter source polling. |
| `grid_options` | HA defaults: 12 columns × 8 rows | Standard HA Sections layout options. A numeric `rows` fixes the card height; the watchlist scrolls inside it. `rows: auto` uses natural height with the list capped at 320 px. |

## Entity options

`entity` is required. `name`, `symbol`, `currency`, `kind`, `market` and `source` are optional display overrides. `kind` can be `stock`, `etf`, `fund`, `index`, `etp` or `other`. `source` is a label only. `decimals` is an integer 0–8 (default 2). Optional `delay_minutes` is a non-negative number supplied by the user; it is not measured by the card.

`attributes` maps a semantic key to a source attribute name or a dotted nested attribute path. A literal attribute name containing a dot takes priority over a nested path. Explicit `null` disables a mapping in YAML. An omitted mapping uses the first non-null automatic alias below. Clearing an editor field restores automatic detection.

| Semantic field | Automatic attribute aliases, in priority order |
| --- | --- |
| `name` | `name`, `friendly_name` |
| `symbol` | `symbol`, `ticker`, `tickerSymbol`, `shortName` |
| `currency` | `currency`, `unit_of_measurement` |
| `kind` | `instrument_type`, `asset_type`, `type` |
| `market` | `market`, `marketPlace`, `exchange` |
| `quote_time` | `quote_time`, `timeOfLast`, `quote.timestamp` |
| `change` | `change`, `day_change` |
| `change_percent` | `change_percent`, `changePercent`, `day_change_percent` |
| `week_change` | `week_change`, `changeOneWeek` |
| `week_change_percent` | `week_change_percent`, `changePercentOneWeek` |
| `month_change` | `month_change`, `changeOneMonth` |
| `month_change_percent` | `month_change_percent`, `changePercentOneMonth` |
| `year_change` | `year_change`, `changeOneYear` |
| `year_change_percent` | `year_change_percent`, `changePercentOneYear` |

The sensor state must be a finite number or numeric string. `0` is valid. `unknown`, `unavailable`, booleans and empty strings are not prices. Decimal dots or commas and whitespace grouping are accepted; mixed comma/dot grouping is rejected as ambiguous. Use unformatted numeric states whenever possible.

Absolute changes are in the price's currency/unit. Percentage attributes are signed percentage points. All fields are optional except the entity ID and its numeric price state. The card displays missing fields as unavailable or a dash. It never calculates a portfolio total, converts currencies, or derives source returns from a partial chart.

Quote timestamps may be ISO date strings (include a timezone), Unix seconds, or Unix milliseconds. HA `last_updated` is shown separately as **Sensor updated**. The existence or freshness of a HA state is not evidence of a real-time market quote.

## Integration-independent boundary

The frontend reads `hass.states` and calls only `history/history_during_period` over HA's existing authenticated WebSocket. Selecting the information button dispatches the standard `hass-more-info` event. No service calls, sensor creation, configuration writes, credentials, provider SDKs, or market HTTP requests are part of the card.

An integration can support this card by producing the above sensor contract. It does not need a plugin adapter or changes in this repository. Attribute mapping handles simple naming differences; transformations must be done by the integration or an HA template sensor.

## History semantics

The card requests state-only recorder history, including the state at the start of the interval. Weekly requests batch the configured entities; other periods request only the selected entity. Cache size is bounded by 50 entities × four periods. Reloads are throttled independently of state updates. Stale in-flight responses are discarded after configuration changes or disconnection.

Charts use timestamps, not equally spaced sample indexes. Unavailable records interrupt the line. Downsampling preserves min/max values and a gap between selected samples wherever missing records intervene; dense data may hide short valid runs, but never bridge known missing intervals. No synthetic current-price endpoint is appended. “Partial history” indicates that the returned data starts more than one hour after the requested start. The API cannot identify unrecorded outages between otherwise valid records.

Day/week/month/year cover rolling 24-hour/7-day/30-day/365-day windows. Source return attributes may use different market/session boundaries. Currency and returns are displayed as reported, including for funds that update once a day and indices that report levels instead of currency prices.
