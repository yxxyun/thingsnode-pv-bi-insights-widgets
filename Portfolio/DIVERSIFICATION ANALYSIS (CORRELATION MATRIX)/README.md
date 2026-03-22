# Diversification Analysis (Correlation Matrix) - Quick Read and Setup

## 0) What this means in a PV portfolio
- Shows inter-site generation correlation.
- Lower cross-site correlation generally improves diversification (portfolio output smoothing).
- High correlation means sites tend to move together and portfolio volatility remains concentrated.

## 1) Data contract and calculations
Widget expects `DS[0]` JSON:
- `sites`: array of site names
- `matrix`: `N x N` numeric correlation matrix

Rendering logic:
1. Build `N x N` grid with row/column site labels.
2. For each cell value:
   - diagonal (`r==c`) -> `Self`
   - `>=0.7` -> `High Correlation`
   - `>=0.4` -> `Moderate`
   - else -> `Low Correlation`
3. Hover tooltip shows:
   - pair (`Site A vs Site B`)
   - value (`0.85`)
   - class description

## 2) Telemetry requirements and datasource order
- Required:
  - `DS[0]` JSON with `sites` and `matrix`.
- Additional datasources are ignored.
- Order matters because code reads only first datasource.

## 3) Units (input vs output)
- Correlation is dimensionless.
- Display assumes values in a practical `0..1` diversification context.
- Negative values can be displayed but still classified under low range in current thresholds.

## 4) ThingsBoard setup checklist
1. Add widget as `Latest values`.
2. Map first datasource key to correlation JSON payload.
3. Ensure matrix dimensions match number of sites.
4. Keep site order consistent across rows and columns.

## 5) Example telemetry
```json
{
  "ts": 1774224000000,
  "values": {
    "portfolio_correlation_matrix": {
      "sites": ["Site A", "Site B", "Site C"],
      "matrix": [
        [1.0, 0.72, 0.38],
        [0.72, 1.0, 0.41],
        [0.38, 0.41, 1.0]
      ]
    }
  }
}
```
