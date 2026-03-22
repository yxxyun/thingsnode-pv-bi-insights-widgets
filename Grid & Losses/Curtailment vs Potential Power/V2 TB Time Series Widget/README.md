# Curtailment vs Potential Power (V2 Time Series) - Minimal Legacy Note

## Status
- Legacy intermediate version (Time Series widget variant).
- V3 Latest Values widget is the active production version.

## Core behavior
- Uses Chart.js overlay chart.
- Reads actual power from `DS[0]` time series.
- Tries to fetch `potential_power_profile` attribute from `SERVER_SCOPE`.
- If attribute missing, generates a fallback sine-curve potential profile.
- Curtailment is visualized as area between potential and exported curves.

## Requirements
- Resource dependency: Chart.js CDN.
- Attribute `potential_power_profile` should contain 96 points (15-min profile).

## Why V3 is preferred
- Better live-data fetch flow, status badges, richer tooltip analytics, and simulation fallback controls.
