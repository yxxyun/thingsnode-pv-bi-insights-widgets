# Grid Outage Timeline - Quick Read and Setup

## 0) What this means in a PV plant
- This widget shows outage events on a rolling timeline and quantifies operational impact.
- It is useful for:
  - reliability tracking
  - energy-loss attribution
  - evidence for utility/escalation workflows

## 1) Data model and calculations
Expected `DS[0]` payload is a JSON array of outage events with:
- `startTime`
- `endTime`
- `eventType`
- `energyLost`
- `severity` (`low`, `med`, `high`, `maint`)

Processing flow:
1. Parse events from `DS[0]`.
2. Optional demo fallback when empty and `enableDemoData=true`.
3. Apply rolling window filter using `daysToShow`.
4. Render each event block by time overlap:
   - `left%` and `width%` relative to window
5. Compute summary:
   - event count
   - total energy lost
   - total outage duration (hours)
6. Header status:
   - `0` events -> `CLEAR`
   - `1-2` events -> warning (`n OUTAGE(S)`)
   - `>2` events -> critical (`n OUTAGES`)

## 2) Telemetry requirements and datasource order
- Required:
  - `DS[0]`: JSON outage-events array
- Additional datasources are ignored.
- Time parser accepts ISO datetime strings or numeric timestamps.

## 3) Units (input vs output)
- `energyLost` displayed using `energyUnit` setting (default `MWh`).
- Duration displayed in hours (`hrs`), computed from `endTime-startTime`.

## 4) ThingsBoard setup checklist
1. Add widget as `Latest values`.
2. Feed outage-event JSON into first datasource key.
3. Set `daysToShow` and `energyUnit`.
4. Disable `enableDemoData` for production.

## 5) Example telemetry
```json
{
  "ts": 1774137600000,
  "values": {
    "grid_outage_events": [
      {
        "startTime": "2026-03-18T09:10:00Z",
        "endTime": "2026-03-18T11:20:00Z",
        "eventType": "CEB Grid Fault",
        "energyLost": 5.2,
        "severity": "high"
      },
      {
        "startTime": "2026-03-20T13:05:00Z",
        "endTime": "2026-03-20T13:45:00Z",
        "eventType": "Voltage Sag",
        "energyLost": 1.0,
        "severity": "low"
      }
    ]
  }
}
```
