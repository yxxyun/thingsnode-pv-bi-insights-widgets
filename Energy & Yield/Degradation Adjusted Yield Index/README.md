# Degradation Adjusted Yield Index - ThingsBoard Time Series Quick Guide

## 0) PV domain meaning (what this KPI represents)
- This widget represents a **degradation-adjusted performance trend** for a PV plant.
- Conceptually, a yield index around `100%` means the plant is producing close to expected yield **after accounting for normal aging/degradation assumptions**.
- In plant context:
  - Persistent drift downward can indicate abnormal degradation, soiling growth, equipment issues, clipping behavior changes, or unmodeled losses.
  - A single dip may be weather/noise; a multi-month decline is an O&M investigation signal.
- Important: this widget does **not** calculate degradation physics itself. It expects a precomputed index timeseries from upstream analytics.

## 1) Dependencies
This widget needs these external resources (from `resources.txt`):
- `https://cdn.jsdelivr.net/npm/chart.js`
- `https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js`

## 2) What this widget actually reads
- Widget type: `Time series`
- Data used in code: `self.ctx.data[0].data`
- Meaning:
  - First configured data source only (`data[0]`)
  - First configured key in that data source only
  - Full timeseries array for that key: `[[ts, value], ...]`
- Additional data sources/keys are ignored by this widget logic.

## 3) Calculations performed
From the selected timeseries:
1. Parse each point to numeric value.
2. Chart series is plotted directly as `%` values (no unit conversion).
3. Footer metrics:
   - `CURRENT = latest value`
   - `CHANGE = latest - first`
   - `LOW = min(value over period)`
4. Status class from latest value:
   - `latest >= greenThreshold` -> `ON TRACK`
   - `yellowThreshold <= latest < greenThreshold` -> `WARNING`
   - `latest < yellowThreshold` -> `CRITICAL`
5. Change color class:
   - `change >= 0` -> good
   - `-1 < change < 0` -> warn
   - `change <= -1` -> critical

What is typically calculated upstream (outside this widget):
- Teams usually compute `yield_index` from normalized/expected models, for example:
  - `yield_index = (actual_yield / degradation-adjusted expected_yield) * 100`
- Exact formula is project-specific (irradiance source, temperature correction, PR method, clipping handling, curtailment policy). Keep this definition documented in your analytics pipeline.

## 4) Modes (applicable behavior states)
There is no user-selectable mode switch in settings.  
Operationally, it has 3 status states:

| State | Condition | Visual result |
|---|---|---|
| On Track | `latest >= greenThreshold` | Green status dot/text, positive zone |
| Warning | `yellowThreshold <= latest < greenThreshold` | Yellow status |
| Critical | `latest < yellowThreshold` | Red status + pulsing dot |

## 5) Input and output units
- Expected input unit: yield index in percent (`%`), typically near `0-100`.
- Output:
  - Chart Y-axis ticks show `%`
  - `CURRENT` and `LOW` show `%`
  - `CHANGE` is displayed with `%`, but mathematically it is a percentage-point delta (`latest - first`).

## 6) Telemetry requirements
- Required key type: numeric timeseries.
- Minimum points:
  - 1 point: chart/current/low work.
  - 2+ points: change metric is meaningful.
- Timestamp ordering matters for `CHANGE`:
  - Code uses first and last points as delivered.
  - Keep series sorted oldest -> newest so `CHANGE` means period net change.
- Data quality guidance for PV teams:
  - Keep consistent calculation cadence (daily or monthly points, not mixed).
  - Keep the same index definition over time; formula changes create false step-changes.
  - If backfilling history, upload in chronological order.

## 7) ThingsBoard data source setup (important order)
1. Configure one data source entity.
2. Add one telemetry key as the first key (example: `yield_index`).
3. Use a time window suitable for degradation view (for example, multi-year).
4. If multiple keys or data sources are present, ensure the intended key is first in the first data source.

## 8) Settings quick reference
| Setting | Default | Purpose |
|---|---|---|
| `widgetTitle` | `DEGRADATION ADJUSTED YIELD INDEX` | Header title |
| `greenThreshold` | `99.5` | On Track lower bound |
| `yellowThreshold` | `98.0` | Warning lower bound |
| `yAxisMin` | `90` | Chart Y min |
| `yAxisMax` | `100.5` | Chart Y max |
| `decimals` | `1` | Number format precision |
| `tooltipText` | empty | If set, overrides dynamic status tooltip |
| `accentColor` | empty | If set, overrides line color (default `#06F5FF`) |

## 9) Example input telemetry
```json
[
  { "ts": 1640995200000, "values": { "yield_index": 100.0 } },
  { "ts": 1672531200000, "values": { "yield_index": 99.6 } },
  { "ts": 1704067200000, "values": { "yield_index": 99.1 } },
  { "ts": 1735689600000, "values": { "yield_index": 98.7 } }
]
```

In this example:
- `CURRENT = 98.7%`
- `CHANGE = -1.3%` (displayed as percent, interpreted as -1.3 percentage points)
- `LOW = 98.7%`

## 10) Operational interpretation cheat sheet
- `ON TRACK` (>= green threshold): plant performance is within expected degradation-adjusted envelope.
- `WARNING` (between thresholds): monitor for emerging loss mechanisms (soiling, mismatch, availability issues).
- `CRITICAL` (< yellow threshold): trigger deeper diagnostics (inverter/string faults, sustained curtailment, sensor/model mismatch, or accelerated degradation).
