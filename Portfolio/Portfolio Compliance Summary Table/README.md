# Portfolio Compliance Summary Table - Quick Read and Setup

## 0) What this means in a PV portfolio
- Portfolio-level compliance view across sites, combining:
  - capacity
  - capacity-factor health
  - revenue-at-risk
  - compliance flags
- Useful for prioritizing intervention at the site level and tracking aggregate exposure.

## 1) Data contract and calculations
Widget expects `DS[0]` JSON with:
- `sites`: array of site objects
- optional `overall_status`

Site fields used:
- `name`
- `capacity_mw`
- `cf_status`
- `rar_lkr`
- `compliance_flag`
- optional `status`

Processing logic:
1. Risk score per site:
   - `compliance_flag == "At Risk"` -> score 3
   - else if `status=="warning"` or `cf_status=="Warning"` -> score 2
   - else score 1
2. Sort order:
   - higher risk score first
   - then higher `rar_lkr` first
3. Totals:
   - `totalCap = sum(capacity_mw)`
   - `totalRaR = sum(rar_lkr)`
4. Footer status:
   - `overall_status` if provided
   - default `Compliant`

## 2) Telemetry requirements and datasource order
- Required:
  - `DS[0]` JSON payload with `sites`.
- Additional datasources are ignored.
- Order matters because code reads first datasource only.

## 3) Units (input vs output)
- Capacity displayed in `MW`.
- RaR displayed using `currency` setting in footer text.
- `formatCurrency` logic:
  - values `>= 1,000,000` shown as `x.xx M`
  - else standard number format.

## 4) ThingsBoard setup checklist
1. Add widget as `Latest values`.
2. Map first key to compliance-summary JSON payload.
3. Set `currency` setting.
4. Standardize site status values (`At Risk`, `Warning`, etc.) for consistent sorting/coloring.

## 5) Example telemetry
```json
{
  "ts": 1774224000000,
  "values": {
    "portfolio_compliance_summary": {
      "overall_status": "Non-Compliant",
      "sites": [
        {
          "name": "Site A",
          "capacity_mw": 50,
          "cf_status": "Warning",
          "rar_lkr": 5500000,
          "compliance_flag": "At Risk",
          "status": "warning"
        },
        {
          "name": "Site B",
          "capacity_mw": 30,
          "cf_status": "Normal",
          "rar_lkr": 900000,
          "compliance_flag": "Compliant",
          "status": "healthy"
        }
      ]
    }
  }
}
```
