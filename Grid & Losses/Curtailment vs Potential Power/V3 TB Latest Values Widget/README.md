# Curtailment vs Potential Power (V3) - Quick Read and Setup

## 0) What this means in a PV plant
- This widget visualizes the gap between:
  - Potential generation (what plant could produce)
  - Exported generation (what was actually exported)
- The red envelope is curtailed energy/power due to grid export limits or dispatch constraints.

## 1) Runtime modes
| Mode | Trigger | Behavior |
|---|---|---|
| `live` | valid actual telemetry found for today (>5 points) | Uses today telemetry + potential profile attribute |
| `simulated` | telemetry missing/fetch fail | Generates synthetic potential/export curves |
| `nodata` | no datasource/entity | Empty chart + NO DATA badge |

## 2) Calculations performed
Live pipeline:
1. Uses first datasource entity to call telemetry API directly.
2. Fetches `actualPowerKey` timeseries for current day.
3. Maps actual values into 96 buckets (15-minute intervals), averaging duplicates.
4. Potential curve source:
   - preferred: `potentialProfileKey` server attribute (JSON array length 96)
   - fallback: generated sinusoidal curve from `maxPower`, `sunriseHour`, `sunsetHour`
5. Curtailment at each point:
   - `curtailed = max(potential - exported, 0)`

Tooltip energy summary:
- Integrates power into energy with 15-min interval:
  - `energy = sum(power * 0.25h)`
- Converts summary unit to MWh when total potential > 1000 kWh.

Simulation pipeline:
- Generates potential bell curve + export-limit clipping with realistic noise/events.

## 3) Telemetry requirements and datasource structure
- Required datasource:
  - `datasources[0]` must be the plant entity
- Required/optional data:
  - telemetry key (default `active_power`) for exported power
  - server attribute (default `potential_power_profile`) containing 96 numeric points
- Datasource key order in widget UI is not used for values; settings keys drive fetch.

Potential profile expected structure:
```json
[0,0,0,..., 120.5, 245.1, ..., 0]
```
(96 values, one per 15 minutes)

## 4) Units (input vs output)
- `unitLabel` controls displayed power unit (default `kW`).
- Code assumes 15-minute sampling for energy summary conversion.
- Keep telemetry and profile in the same power unit.

## 5) ThingsBoard setup checklist
1. Add widget as `Latest values`.
2. Set first datasource to plant/entity.
3. Ensure actual power telemetry exists (`actualPowerKey`).
4. Add potential profile attribute (96-point array).
5. Configure labels, decimals, and simulation parameters for fallback.

## 6) Example input data
Telemetry sample:
```json
{
  "ts": 1774137600000,
  "values": {
    "active_power": 742.3
  }
}
```

Server attribute sample:
```json
{
  "potential_power_profile": [0,0,0,0,5,12,20,35,55,80,120,170,230,300,380,460,530,610,680,730,760,780,790,795,790,770,740,700,650,590,520,440,350,260,180,110,60,25,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
}
```
