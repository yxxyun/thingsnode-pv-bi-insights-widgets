# Risk Summary Panel Widget - Quick Read and Setup

## 0) What this means in a PV plant
- This is an executive financial risk card for portfolio/site monitoring.
- It summarizes:
  - Current Revenue at Risk (RaR)
  - Risk status text
  - Percentile position (`Pxx`) on a risk gauge
  - Tracking delta context
- In PV context it is a fast "how bad is the downside right now?" panel for operators and asset managers.

## 1) Runtime modes and triggers
| Mode | Trigger in code | Result |
|---|---|---|
| Live | Any datasource has data | Reads DS index values and builds status/gauge from live inputs |
| Manual simulation | `enableManualSimulation=true` and no live data | Uses `sim*` settings fields |
| Default fallback | No live data and simulation disabled | Uses hardcoded defaults (still renders values) |

## 2) Calculations performed
Live mode mapping:
1. `DS[0]` tracking field:
   - Numeric -> shown as `Tracking Delta: autoScale(value)`
   - Non-numeric -> shown as raw text
2. `DS[1]` RaR numeric value (`rarVal`)
3. `DS[2]` status text:
   - Keywords map state to `critical`, `warning`, `good`
4. `DS[3]` percentile:
   - If numeric, use directly
   - Else derive percentile from `DS0/DS1 * 100` (bounded 0-100) when possible
   - Else fallback by state (`critical=90`, `warning=55`, `good=25`)

Formatting:
- Main RaR value is `currency + autoScale(rarVal)` with optional unit suffix.
- Gauge fill width = percentile.
- Gauge label = `P` + rounded percentile.

## 3) Input telemetry and datasource order
- Recommended live order:
  - `DS[0]`: tracking delta or tracking text
  - `DS[1]`: revenue at risk (numeric)
  - `DS[2]`: alert/status text
  - `DS[3]`: percentile numeric (0-100, optional)
- Additional datasources are ignored by logic after these indices.
- If DS3 is absent, percentile can be derived from DS0/DS1 if both numeric.

## 4) Units (input vs output)
- Input monetary values should be in your chosen business scale.
- Output:
  - Main value: currency symbol + auto-scaled number (`K/M/B`)
  - Optional textual unit via `unit` setting
  - Gauge: percentile (`P50`, `P75`, `P90`, etc.)

## 5) ThingsBoard setup checklist
1. Add widget as `Latest values`.
2. Configure four datasource keys in the index order above.
3. Set `currency`, `unit`, and label settings.
4. Use manual simulation only when telemetry is unavailable.

## 6) Example input data
Example latest values:

```json
{
  "tracking_delta": 320000,
  "revenue_at_risk": 460000,
  "risk_alert_level": "HIGH RISK - MONITORING",
  "risk_percentile": 83
}
```

Interpretation:
- Main value shows roughly `$460K` (or your currency/unit style).
- Gauge shows `P83`.
- Status state becomes `critical` because alert text contains `risk`.
