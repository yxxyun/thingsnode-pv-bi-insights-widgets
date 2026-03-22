# Capacity Factor Compliance - Quick Read and Setup

## 0) What this means in a PV plant
- This card compares actual capacity factor against contractual target capacity factor.
- It is a penalty-risk indicator for PPA compliance.
- In PV operations, sustained under-target CF often signals financial underperformance or penalty exposure.

## 1) Core calculations
Detected inputs:
- Target CF key names recognized in code: `contract_cf_target`, `target_cf`
- Actual CF key names recognized in code: `actual_cf_ytd`, `fin_cf`, `actual_cf`, `capacity_factor`

Formula flow:
1. Parse target and actual values from any matching keys in `self.ctx.data`.
2. Auto-detect representation:
   - if target `< 1.05`, values are treated as ratios (0.22) and converted to percent (22.0)
   - else treated as already in percent
3. Compute:
   - `ratio = actualPct / targetPct`
   - `compliancePct = ratio * 100`
4. Risk level:
   - `ratio < highRiskThreshold` -> `PENALTY RISK - HIGH`
   - `ratio < medRiskThreshold` -> `PENALTY RISK - MARGINAL`
   - else -> `COMPLIANT`
5. Gauge:
   - fill based on `actualPct / gaugeMax` (capped at 100%)
6. Bar section:
   - target bar fixed visually at 60%
   - actual bar = `(actualPct/targetPct) * 60`, capped at 100%

## 2) Telemetry requirements and datasource structure
- Required for meaningful output:
  - one target CF key (matching names above)
  - one actual CF key (matching names above)
- Datasource order is not strict; lookup is by key name across all series.
- Additional keys are ignored unless names match the hardcoded list.

## 3) Units (input vs output)
- Input accepted as ratio (`0.24`) or percent (`24.0`).
- Output always shown as percent (`%`).
- `decimals` controls displayed precision.

## 4) ThingsBoard setup checklist
1. Add widget as `Latest values`.
2. Add target and actual CF telemetry keys with supported names.
3. Set thresholds:
   - `highRiskThreshold` default `0.90`
   - `medRiskThreshold` default `1.0`
4. Set `gaugeMax` to expected operating range (percent scale).

## 5) Example telemetry
```json
{
  "ts": 1774137600000,
  "values": {
    "contract_cf_target": 0.22,
    "actual_cf_ytd": 0.19
  }
}
```

Interpretation:
- Target = 22.0%, Actual = 19.0%
- Ratio = 0.864 -> High penalty risk with default thresholds.
