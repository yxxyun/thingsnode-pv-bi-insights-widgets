# Multi-Site Energy Contribution - Quick Read and Setup

## 0) What this means in a PV portfolio
- Stacked monthly chart showing how each site contributes to portfolio YTD energy.
- Helps identify concentration risk and under/over-contributing sites.

## 1) Data contract and calculations
Widget expects `DS[0]` as JSON object:
- `months`: array of month labels
- `sites`: array of `{ name, data[] }`
- optional `unit`

Calculations:
1. For each site, sum `site.data` to get site total.
2. Sum all site totals to get portfolio `Total YTD`.
3. Render stacked bar chart with one dataset per site.
4. Colors are taken from settings `colorSiteA..E` and cycled if more than 5 sites.

## 2) Telemetry requirements and datasource order
- Required:
  - `DS[0]` JSON payload described above.
- Additional datasources are ignored.
- Order matters because code reads only first datasource.

## 3) Units (input vs output)
- Data values are treated as energy quantities.
- Header total uses `dataObj.unit` if present, else `MWh`.
- Chart tooltip text suffix is hardcoded to `MWh` in current code path.

## 4) ThingsBoard setup checklist
1. Add widget as `Latest values`.
2. Map first key to JSON payload with months/sites.
3. Ensure each site's `data` length matches `months` length.
4. Configure site colors in settings.

## 5) Example telemetry
```json
{
  "ts": 1774224000000,
  "values": {
    "multi_site_energy_ytd": {
      "months": ["Jan", "Feb", "Mar", "Apr"],
      "unit": "MWh",
      "sites": [
        { "name": "Site A", "data": [1200, 1180, 1250, 1300] },
        { "name": "Site B", "data": [900, 870, 940, 980] },
        { "name": "Site C", "data": [650, 620, 700, 730] }
      ]
    }
  }
}
```
