# Portfolio Intelligence Card - Quick Read and Setup

## 0) What this means in a PV portfolio
- A compact card for portfolio-level KPI monitoring.
- Supports three views:
  - standard KPI vs target
  - risk exposure headline
  - diversification index meter

## 1) Modes and calculations
| Mode | Inputs used | Calculations |
|---|---|---|
| `standard` | `DS[0]` value, optional `DS[1]` target | `display = DS0/divider`; delta `% = (DS0-DS1)/DS1*100` |
| `risk` | `DS[0]` value | same main value formatting; shows risk label text only |
| `diversity` | `DS[0]` value | same main value formatting; bar uses `ratio = clamp(DS0,0,1)` |

Diversity bar thresholds:
- `< 0.4` -> Low Diversity (red)
- `0.4 - 0.7` -> Moderate (amber)
- `> 0.7` -> High Diversity (green)

## 2) Telemetry requirements and datasource order
- Required:
  - `DS[0]` numeric value (all modes)
- Optional:
  - `DS[1]` numeric target (standard mode delta)
- Additional datasources are ignored.
- Order matters because code reads by index.

## 3) Units (input vs output)
- Output main value:
  - `DS0 / divider`, formatted with `decimals`
  - unit text from `unit` setting
- Delta output (standard mode): percent (`%`).
- Diversity bar expects normalized input in `[0,1]`.

## 4) ThingsBoard setup checklist
1. Add widget as `Latest values`.
2. Choose `cardMode`.
3. Map first key (`DS0`) to primary metric.
4. For standard mode, map second key (`DS1`) to target.
5. Set `divider`, `decimals`, and labels.

## 5) Example telemetry
```json
{
  "ts": 1774224000000,
  "values": {
    "portfolio_kpi_value": 0.68,
    "portfolio_kpi_target": 0.72
  }
}
```

Use one card instance per mode if you want all three views on dashboard.
