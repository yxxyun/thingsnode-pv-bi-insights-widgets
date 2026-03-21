# Expected vs Actual Revenue - Quick Read and Setup

## 0) What this means in a PV plant
- This widget compares expected revenue (usually modeled baseline like P90) vs actual realized revenue.
- In PV commercial operations it is used to track whether monthly cash generation is meeting plan.
- Positive variance can indicate stronger production/tariff realization; negative variance indicates commercial risk or plant underperformance.

## 1) Runtime behavior modes
| Behavior | Trigger in code | Effect |
|---|---|---|
| Normal compare | Expected and actual data present | Monthly paired bars + variance badges |
| Expected fallback baseline | Expected series missing/invalid (avg <= 0.1) | Uses fallback expected value `2.475` |
| Historical backfill | Data months fewer than `maxBars` | Creates synthetic prior months for visual continuity |
| MTD expected prorating | Current month bar | Scales expected by elapsed days in month |

## 2) Calculations performed
1. Reads:
   - `DS[0]` = expected/baseline series
   - `DS[1]` = actual revenue series
2. Groups both series by month (`YYYY-M`).
3. For each month, the last processed value for each series is used (not monthly sum).
4. If expected value is missing for a month, fill with baseline (`2.475`).
5. If total bars are below `maxBars`, backfill earlier months using anchor values + light noise.
6. For current month, expected is prorated:
   - `expected_mtd = expected_full_month * (today/day_count_in_month)`
7. Per month badge:
   - `diff = actual - expected`
   - class depends on `targetLogic`:
     - `Higher Actual is Better` (default) -> positive diff is good
     - `Lower Actual is Better` -> negative diff is good
8. Overall status:
   - `overallDiff = sumActual - sumExpected`
   - `overallPct = overallDiff / sumExpected * 100`
   - Deadband: `abs(overallPct) <= 0.5%` -> neutral

## 3) Input telemetry and datasource order
- Required order:
  - `DS[0]` expected revenue
  - `DS[1]` actual revenue
- Additional datasources are ignored by current logic.
- Recommended telemetry cadence:
  - One value per month per key (month-end), or carefully controlled updates.
- If multiple points exist in a month, this code effectively keeps the latest encountered value for that month.

## 4) Units (input vs output)
- Widget does no currency conversion.
- Treat both DS series as same monetary scale.
- Display formatting:
  - `currency` prefix (default `$`)
  - `unit` suffix (default `M`)
  - decimal precision from `decimals`
- Example: `$2.45M`

## 5) ThingsBoard setup checklist
1. Add widget as `Latest values`.
2. Configure DS0 expected and DS1 actual in that order.
3. Set `currency`, `unit`, `maxBars`, and `targetLogic`.
4. Keep both series in same monetary basis (same month definition, same scale).

## 6) Example input data
Monthly telemetry example:

```json
[
  { "ts": 1735689600000, "values": { "expected_revenue_m": 2.50, "actual_revenue_m": 2.35 } },
  { "ts": 1738368000000, "values": { "expected_revenue_m": 2.45, "actual_revenue_m": 2.61 } },
  { "ts": 1740787200000, "values": { "expected_revenue_m": 2.55, "actual_revenue_m": 2.40 } }
]
```

If expected revenue is unavailable, the widget will temporarily use `2.475` as baseline for missing months.
