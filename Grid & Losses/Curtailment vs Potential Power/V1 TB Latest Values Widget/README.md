# Curtailment vs Potential Power (V1) - Minimal Legacy Note

## Status
- Legacy prototype (not recommended for current deployment).
- V3 is the production version in this project.

## Core behavior
- Reads exported power from `DS[0]` timeseries.
- Reads potential profile from `self.ctx.attributes.P341` or `self.ctx.attributes.Finance`.
- Draws SVG envelope:
  - potential line
  - exported line
  - red curtailment fill (`potential - exported`)

## Limitations
- Assumes specific attribute structure (`potential_power_profile`).
- Minimal settings and no robust fallback/status handling.
- Unit handling is inconsistent in legacy code path.

## If you must run it
1. Add first datasource with exported power series.
2. Ensure entity attributes include `potential_power_profile`.
3. Prefer migrating to V3 for maintainability and clearer telemetry contracts.
