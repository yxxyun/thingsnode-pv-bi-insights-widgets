# Insurance Claimable Events Summary - Quick Read and Setup

## 0) What this means in a PV plant
- This widget summarizes insurable outage/failure events and their claim status.
- It helps operations, finance, and insurance teams track recoverable losses.

## 1) Data model and calculations
Expected input is a JSON array (from `DS[0]`) where each event has:
- `date`
- `eventType`
- `energyLost`
- `amount`
- `status` (Approved/Pending/Rejected or similar text)

Processing logic:
1. Parse event array from `DS[0]`.
2. Optional demo fallback when empty and `enableDemoData=true`.
3. Status mapping:
   - contains `approv` -> approved
   - contains `reject` -> rejected
   - else -> pending
4. Total claimable amount includes:
   - approved + pending
   - rejected excluded
5. Header status:
   - all approved, none pending/rejected -> `ALL APPROVED`
   - any rejected -> `<n> REJECTED` (critical)
   - else pending exists -> `<n> PENDING` (warning)

## 2) Telemetry requirements and datasource order
- Required:
  - `DS[0]`: JSON array of claim events
- Additional datasources are ignored.
- `settings.dataKeyName` exists but is not used in current JS logic.

## 3) Units (input vs output)
- `energyLost` displayed with `energyUnit` (default `MWh`).
- `amount` displayed with `currencySym` (default `LKR`).
- No numeric conversion/scaling is applied by code.

## 4) ThingsBoard setup checklist
1. Add widget as `Latest values`.
2. Publish claim-event JSON to first datasource key.
3. Set `currencySym` and `energyUnit`.
4. Disable `enableDemoData` in production.

## 5) Example telemetry
```json
{
  "ts": 1774137600000,
  "values": {
    "insurance_claims_data": [
      {
        "date": "2026-02-02",
        "eventType": "Storm Damage",
        "energyLost": 15.2,
        "amount": 350000,
        "status": "Pending"
      },
      {
        "date": "2026-01-14",
        "eventType": "Inverter Fire",
        "energyLost": 28.5,
        "amount": 650000,
        "status": "Approved"
      }
    ]
  }
}
```
