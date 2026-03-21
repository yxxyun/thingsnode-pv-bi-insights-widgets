# Revenue-at-Risk Breakdown Widget - Quick Read and Setup

## 0) What this means in a PV plant
- This widget breaks total Revenue at Risk into loss categories so teams can prioritize mitigation.
- It answers:
  - Which loss mechanisms contribute most to current revenue downside?
  - Is risk mostly operational (fault/curtailment) or structural (degradation/soiling/electrical)?
- Typical PV usage is O&M and portfolio triage.

## 1) Runtime behavior modes
| Behavior | Trigger in code | Effect |
|---|---|---|
| Settings-driven breakdown | Always | Segment values come from widget settings (`val_*`) |
| Telemetry-driven severity | Any datasource has text containing risk keywords | Severity class from telemetry text |
| Threshold severity fallback | No telemetry keyword match | Severity from total vs `severityMedium`/`severityHigh` |

## 2) Calculations performed
1. Reads category values from settings:
   - `val_fault`, `val_curtail`, `val_soiling`, `val_degrad`, `val_lid`, `val_mismatch`, `val_wiring`
2. Aggregates:
   - `Degradation = val_degrad + val_lid + val_mismatch`
   - `Electrical = val_wiring`
3. Builds final 5 display segments:
   - Fault Loss
   - Soiling
   - Curtailment
   - Degradation
   - Electrical
4. Total:
   - `total = sum(segment values)`
5. Segment width:
   - `width% = segment / total * 100`
6. Severity:
   - Telemetry keyword pass first (`risk/critical/alarm`, `warning/check/high`, `normal/good/safe/compliant`)
   - Else threshold rule:
     - `total < severityMedium` -> `LOW`
     - `severityMedium <= total < severityHigh` -> `MODERATE`
     - `total >= severityHigh` -> `HIGH`

## 3) Input telemetry and datasource structure
- Core segment values are **not read from telemetry**; they are configured in settings.
- Telemetry is optional and used only to infer severity label/class.
- If using telemetry for severity:
  - Any datasource can contain the status text.
  - Code checks first datapoint value of each datasource and stops at first keyword match.

## 4) Units (input vs output)
- Input category values should all use one consistent money basis (same scale).
- Output formatting:
  - `currency` prefix
  - Auto-scaled number (`K/M/B`)
  - `displayUnit` suffix
- Example output: `$ 460K M` if configured that way.

## 5) ThingsBoard setup checklist
1. Add widget as `Latest values`.
2. Configure category amounts in widget settings (`val_*`).
3. Set `currency`, `displayUnit`, and severity thresholds.
4. Optional: provide a risk status telemetry key to override threshold-only severity.

## 6) Example configuration and telemetry
Settings example:

```json
{
  "val_fault": 125,
  "val_curtail": 210,
  "val_soiling": 85,
  "val_degrad": 40,
  "val_lid": 10,
  "val_mismatch": 15,
  "val_wiring": 20
}
```

This gives:
- `Degradation = 40 + 10 + 15 = 65`
- `Total = 125 + 210 + 85 + 65 + 20 = 505`

Optional severity telemetry example:

```json
{
  "risk_alert_level": "CRITICAL RISK - INVESTIGATE"
}
```
