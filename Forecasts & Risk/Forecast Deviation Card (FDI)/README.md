# Forecast Deviation Card (FDI) - Quick Read and Setup

## 0) What this means in a PV plant
- FDI measures how far actual generation is from forecast expectation.
- Core KPI:
  - `FDI (%) = (Actual - Forecast) / Forecast * 100`
- In PV operations:
  - Positive or near-zero FDI means plant output is at/above expectation.
  - Negative FDI means underperformance versus forecast (possible outages, soiling, curtailment, or weather/model mismatch).

## 1) Runtime modes and triggers
| Mode | Trigger in code | Data interpretation |
|---|---|---|
| `manual simulation` | `enableManualOverride = true` | Uses `manualDeviation`, ignores telemetry |
| `live` | `DS[0]` and `DS[1]` both have valid numbers | `DS[0]=forecast`, `DS[1]=actual` |
| `derived` | Live pair unavailable but `DS[0]` exists + `p50` attribute available | `DS[0]=actual`, forecast derived from annual attribute |
| `nodata` | Missing/invalid data | Placeholder UI (`--`) |

## 2) Calculations performed
Live mode:
1. Read `forecastVal = data[0].data[0][1]`.
2. Read `actualVal = data[1].data[0][1]`.
3. Compute `FDI% = ((actualVal - forecastVal) / forecastVal) * 100`.

Derived mode:
1. Treat `data[0].data[0][1]` as `actualVal`.
2. Read server attribute `p50AttributeKey` (default `p50_energy`, annual kWh).
3. Convert to daily MWh: `dailyP50 = p50Annual / 365 / 1000`.
4. Compute FDI against derived daily P50.

Severity logic:
- `effectivePct = invertLogic ? -FDI : FDI`
- With defaults `warningThreshold=-5`, `criticalThreshold=-10`:
  - `effectivePct >= -5` -> `ON TRACK`
  - `-10 <= effectivePct < -5` -> `MINOR DEVIATION`
  - `< -10` -> `CRITICAL DEVIATION`

## 3) Input telemetry and datasource order
- This widget is index-driven:
  - `DS[0]` and `DS[1]` are explicitly used in live mode.
- Recommended structure for live mode:
  - Data source 0: forecast value key
  - Data source 1: actual value key
- For derived mode:
  - Data source 0: actual value key
  - Server attribute: annual P50 (`p50_energy`)

Important implementation note:
- `settings.json` has `forecastKey`/`actualKey`, but current JS logic does not use those setting ids for lookup.  
  Actual lookup is still by datasource index.

## 4) Units (input vs output)
- Main KPI output: percent (`%`) FDI.
- Context fields (`Forecast`, `Actual`) append `unitLabel` (default `MWh`).
- No unit conversion in live mode.
- Derived mode converts annual attribute kWh to daily MWh for forecast baseline.

## 5) ThingsBoard setup checklist
1. Add widget as `Latest values`.
2. Decide intended mode:
   - Live: map DS0 forecast, DS1 actual.
   - Derived: map DS0 actual + configure annual attribute.
3. Set thresholds for your SLA (`warningThreshold`, `criticalThreshold`).
4. Keep units consistent between telemetry and `unitLabel`.

## 6) Example input data
Live mode (two datasource values at latest timestamp):

```json
{
  "forecast_p50_daily": 4.80,
  "total_generation": 4.50
}
```

Derived mode attribute:

```json
{
  "p50_energy": 1750000
}
```

With `actual=4.50` and `dailyP50=1750000/365/1000=4.79`,  
`FDI = (4.50 - 4.79)/4.79 * 100 = -6.1%` -> `MINOR DEVIATION` (default thresholds).
