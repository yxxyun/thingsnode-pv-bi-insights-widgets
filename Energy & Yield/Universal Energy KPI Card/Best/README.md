# Universal Energy KPI Card (Best) - ThingsBoard Latest Values Quick Guide

## 0) PV domain meaning (what this KPI represents)
- This card shows **energy produced** for a selected reporting window (`today`, `mtd`, `ytd`, `life`).
- In PV operations, this is a **production-volume KPI** (MWh/GWh), not a normalized performance KPI.
- Use it to answer:
  - How much energy did the plant produce in this period?
  - Is production pace aligned with commercial/revenue targets?
- Typical interpretations in plant context:
  - Lower-than-expected `today` can come from weather, outages, clipping, curtailment, or soiling.
  - `mtd`/`ytd` trends are used for billing progress, PPA tracking, and budget vs actual reporting.
  - `life` is a long-horizon bankability/asset-reporting number.
- Important: this widget does not model irradiance, temperature, or availability. It only formats and displays the incoming energy telemetry.

## 1) What this widget actually reads
- Widget type: `Latest values`
- Data used in code: `self.ctx.data[0].data[0][1]`
- Meaning:
  - First configured data source only (`data[0]`)
  - First configured key in that data source only (`data[0]`)
  - First/latest value for that key (`[ts, value] -> [1]`)
- If you add multiple data sources or keys, this widget ignores all except the first key of the first data source.

## 2) Calculation flow
1. Read raw numeric value as `rawVal`.
2. Convert to MWh:
   - `mwhVal = rawVal / inputDivider`
3. Apply mode unit logic:
   - `today`, `mtd`, `custom`:
     - Start in `MWh`
     - If `autoScale=true` and `abs(mwhVal) >= 1000`, convert to `GWh`
   - `ytd`, `life`:
     - Always convert to `GWh` (`mwhVal / 1000`)
4. Format display number with `decimals` setting.
5. Render value + unit.

## 3) Modes and output units
| Mode (`cardMode`) | Title/Sub from code | Output unit behavior |
|---|---|---|
| `today` | `TODAY'S ENERGY` / `Today` | `MWh`, or `GWh` if auto-scale triggers |
| `mtd` | `MTD ENERGY` / `Month-to-Date` | `MWh`, or `GWh` if auto-scale triggers |
| `ytd` | `YTD ENERGY` / `Year-to-Date` | Forced `GWh` |
| `life` | `LIFETIME ENERGY` / `Since COD` | Forced `GWh` |
| `custom` | `ENERGY` / `Production` | `MWh`, or `GWh` if auto-scale triggers |

`overrideTitle` and `overrideSub` only change labels, not math.

## 4) Input telemetry requirements
- Required shape: one numeric telemetry value (latest).
- The widget does not enforce key names. You choose any key in TB.
- Best practice in PV data modeling:
  - Feed period-aligned values per mode (`energy_today`, `energy_mtd`, `energy_ytd`, `energy_life`) from your upstream pipeline.
  - Do not feed instantaneous power (`kW/MW`) into this widget; it expects energy totals.
- Recommended unit mapping (because code converts through MWh):

| Telemetry unit you store | `inputDivider` to set | Why |
|---|---|---|
| `Wh` | `1000000` | `Wh / 1,000,000 = MWh` |
| `kWh` | `1000` | `kWh / 1000 = MWh` |
| `MWh` | `1` | Already MWh |
| `GWh` | `0.001` | `GWh / 0.001 = MWh` (multiplies by 1000) |

## 5) Output units
- Displayed value unit: `MWh` or `GWh` per mode logic above.
- Placeholder on invalid/missing data: `--`

## 6) ThingsBoard data source setup (important order)
1. Add one data source entity (device/asset).
2. Add one telemetry key as the first key (the one this widget should show).
3. Keep this key as key index `0`.
4. Set widget settings:
   - `cardMode`
   - `inputDivider`
   - `autoScale`
   - `decimals`

If you must keep multiple data sources/keys in the widget, place the intended one first. Otherwise values can be wrong.

## 7) Example telemetry payloads
Example device telemetry (kWh stored):

```json
{
  "ts": 1773974400000,
  "values": {
    "energy_today_kwh": 45230,
    "energy_mtd_kwh": 918400,
    "energy_ytd_kwh": 12500000,
    "energy_life_kwh": 98765432
  }
}
```

Typical deployment pattern:
- Create separate widget instances per mode (`today`, `mtd`, `ytd`, `life`).
- In each instance, map the first key to the matching telemetry key.

## 8) Operational notes for new developers
- This widget is a **display/formatting component**. Period aggregation/reset logic should happen upstream (meter pipeline, ETL, rule chain, or analytics job).
- Keep period definitions consistent across the plant:
  - Day boundary, month boundary, year boundary, and plant timezone must be standardized.
- If values look too large/small, first verify `inputDivider` and source unit before debugging widget code.
