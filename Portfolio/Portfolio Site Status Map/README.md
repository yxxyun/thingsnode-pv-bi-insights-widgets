# Portfolio Site Status Map - Quick Read and Setup

## 0) What this means in a PV portfolio
- Geospatial health view of all sites with marker size by capacity and color by status.
- Useful for operations centers to spot where risk is concentrated geographically.

## 1) Calculations and rendering logic
For each site object in input JSON:
1. Validate coordinates (`lat`, `lon`).
2. Marker size by `capacity_mw`:
   - `>50` MW -> large
   - `>10` MW -> medium
   - else small
3. Marker color by `status`:
   - `healthy` -> green
   - `warning` -> amber
   - `fault` -> red
4. Tooltip fields:
   - name + capacity
   - status
   - optional `rar_lkr` shown as million LKR
   - optional `cf_status`
5. Header stats count markers by status.

## 2) Telemetry requirements and datasource order
- Required:
  - `DS[0]` JSON array of site objects.
- Additional datasources are ignored.
- Order matters because code reads only `self.ctx.data[0]`.

Expected JSON schema (per site):
- `name` (string)
- `lat`, `lon` (number)
- `capacity_mw` (number)
- `status` (`healthy`/`warning`/`fault`)
- optional `rar_lkr` (number)
- optional `cf_status` (string)

## 3) Units (input vs output)
- Capacity shown in `MW`.
- Revenue-at-Risk in tooltip shown as `M LKR` (hardcoded conversion from `rar_lkr`).
- No configurable unit conversion in this widget.

## 4) ThingsBoard setup checklist
1. Add widget as `Latest values`.
2. Map first datasource key to JSON array payload.
3. Ensure each site has valid coordinates.
4. Keep status values standardized (`healthy`, `warning`, `fault`).

## 5) Example telemetry
```json
{
  "ts": 1774224000000,
  "values": {
    "portfolio_site_map": [
      {
        "name": "Site A",
        "lat": 7.32,
        "lon": 80.64,
        "capacity_mw": 55,
        "status": "healthy",
        "rar_lkr": 1200000,
        "cf_status": "Normal"
      },
      {
        "name": "Site B",
        "lat": 6.98,
        "lon": 81.06,
        "capacity_mw": 18,
        "status": "warning",
        "rar_lkr": 4500000,
        "cf_status": "Warning"
      }
    ]
  }
}
```
