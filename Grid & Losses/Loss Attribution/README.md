# Loss Attribution - Quick Read and Setup

## 0) What this means in a PV plant
- This card tracks one selected loss channel so teams can separate operational energy losses from financial losses.
- Modes map to common PV loss reporting buckets:
  - Grid outage loss
  - Curtailment loss
  - Revenue loss potential
  - Insurance-claimable loss

## 1) Modes and calculations
| Mode | Input meaning | Display logic | Default thresholds (raw value) |
|---|---|---|---|
| `grid` | Energy lost due to grid outage | `autoScale(value)` + `energyUnit` | medium 100, high 500 |
| `curtail` | Energy curtailed | `autoScale(value)` + `energyUnit` | medium 100, high 500 |
| `revenue` | Financial revenue loss | `currencySym + autoScale(value)` | medium 50000, high 200000 |
| `insurance` | Claimable financial loss | `currencySym + autoScale(value)` | medium 50000, high 200000 |

Severity rule for all modes:
- `< medium` -> `LOW`
- `>= medium and < high` -> `MODERATE`
- `>= high` -> `HIGH`

## 2) Telemetry requirements and datasource order
- Required:
  - `DS[0]` numeric value for the selected mode
- Additional datasources are ignored.
- Order matters because code reads `self.ctx.data[0]` only.

## 3) Units (input vs output)
- Energy modes:
  - Input: energy quantity in your chosen basis
  - Output: `autoScale + energyUnit` (default `MWh`)
- Financial modes:
  - Input: currency value
  - Output: `currencySym + autoScale`
- `decimals` only affects non-financial mode formatting; financial formatting uses 0 decimals in code.

## 4) ThingsBoard setup checklist
1. Add widget as `Latest values`.
2. Map one telemetry key as first datasource key.
3. Pick `cardMode`.
4. Set `energyUnit` or `currencySym` as needed.
5. Adjust `severityMedium`/`severityHigh` for your alert policy.

## 5) Example telemetry
```json
{
  "ts": 1774137600000,
  "values": {
    "grid_loss_mwh": 42.5,
    "curtailment_loss_mwh": 88.3,
    "revenue_loss_lkr": 1750000,
    "insurance_claimable_lkr": 650000
  }
}
```

Use one key per widget instance depending on selected mode.
