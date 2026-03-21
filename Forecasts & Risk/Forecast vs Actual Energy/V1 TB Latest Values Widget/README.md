# Forecast vs Actual Energy (V1) - Quick Read and Setup

## 0) What this means in a PV plant
- This widget compares plant **actual daily energy** against probabilistic forecast bands (`P50`, `P75`, `P90`).
- In PV operations:
  - `P50` is the median expected outcome.
  - `P75/P90` are more conservative expectations.
  - Actual below `P75` usually signals elevated performance risk.
- Use this card to see short-horizon production risk and forecast quality over a rolling window.

## 1) Runtime modes and triggers
| Mode | Trigger in code | Main purpose |
|---|---|---|
| `live` | Both actual key and `P50` key return enough telemetry points | Real actual vs real forecast comparison |
| `derived` | Actual exists but forecast telemetry is missing, and annual forecast attributes exist | Build daily forecast bands from annual attributes |
| `simulated` | Telemetry/attributes are missing | Generate synthetic series so UI still works |
| `nodata` | No datasource entity | Show empty state |

## 2) Calculations performed
1. Uses only `datasources[0]` to get entity id/type.
2. Fetches telemetry directly via API for keys in settings:
   - `actualEnergyKey` (default `total_generation`)
   - `forecastP50Key`, `forecastP75Key`, `forecastP90Key`
3. Groups points by day and **averages values within each day**.
4. Aligns dates across all series and renders chart lines + optional `P50-P90` confidence band.
5. Risk state is based on latest non-null actual:
   - `actual >= P50` -> `ON TRACK`
   - `P75 <= actual < P50` -> `WARNING`
   - `actual < P75` -> `CRITICAL`
6. Tooltip summary computes:
   - Avg Actual, Avg P50
   - Deviation `% = (avgActual - avgP50) / avgP50 * 100`
   - `MAPE` across available points

Derived mode specifics:
- Reads annual attributes (`p50_energy`, `p75_energy`, `p90_energy`) from `SERVER_SCOPE`.
- Converts annual kWh to daily MWh:
  - `daily = annual / 365 / 1000`
- If `p75` or `p90` attribute is missing:
  - `P75 = P50 * 0.947`
  - `P90 = P50 * 0.900`

Simulation mode specifics:
- Uses `baseDailyEnergy` (kWh), converts to MWh, then applies deterministic seasonal/noise patterns.

## 3) Input telemetry and datasource structure
- Important: this widget does not rely on datasource key order for values.  
  It uses setting key names and fetches data through API from the **first datasource entity**.
- Required datasource:
  - Data source 0: the plant entity (device/asset) that owns telemetry/attributes.

Live mode telemetry (recommended):
- `total_generation` (or your `actualEnergyKey`)
- `forecast_p50_daily`, `forecast_p75_daily`, `forecast_p90_daily`

Derived mode minimum:
- Actual telemetry key
- Server attribute `p50_energy` (annual kWh)
- Optional `p75_energy`, `p90_energy`

Data quality note:
- Because per-day values are averaged, provide one daily aggregated point per key per day for best results.

## 4) Units (input vs output)
- Display unit is `unitLabel` (default `MWh`).
- Live mode does no unit conversion on telemetry.
- Derived/simulated forecast lines are generated in MWh/day from annual kWh attributes.
- Keep actual telemetry in the same unit as displayed lines to avoid mismatch.

## 5) ThingsBoard setup checklist
1. Add widget as `Latest values`.
2. Add one datasource entity (plant/device) as first datasource.
3. Set settings keys to your telemetry naming.
4. If forecast telemetry is unavailable, configure annual attributes.
5. Set `windowDays` and `unitLabel`.

## 6) Example input data
Telemetry example (daily):

```json
{
  "ts": 1773974400000,
  "values": {
    "total_generation": 4.62,
    "forecast_p50_daily": 4.80,
    "forecast_p75_daily": 4.55,
    "forecast_p90_daily": 4.31
  }
}
```

Attribute example (annual, kWh):

```json
{
  "p50_energy": 1750000,
  "p75_energy": 1657250,
  "p90_energy": 1575000
}
```
