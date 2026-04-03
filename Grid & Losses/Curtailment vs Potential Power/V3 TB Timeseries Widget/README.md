# Curtailment vs Potential Power - TIMESERIES VERSION (V3)

This is the Timeseries wrapper for the Curtailment algorithm.

## Changes from Latest Values Version
- **Inline Settings**: Since TB Timeseries widgets natively hide the `Advanced` settings tab for completely custom schema forms, an inline Settings Gear (⚙️) is rendered in the top right. This saves your configurations into the browser `localStorage` keyed locally to this widget instance ID.
- **Dashboard Time Window**: This widget no longer fetches strictly `Midnight -> Now`. It respects the dashboard's master time window scale (e.g., from `Yesterday 12:00 PM` to `Today 5:00 PM`).
- **Dynamic Bucket Calculation**: The 15-minute fixed chart bucket logic has been expanded to dynamically divide the chart bounds ensuring a high-performance rendering footprint across multi-day views.
- **REST Fetch Logic Retained**: It still natively calls the telemetry database via REST internally rather than strictly consuming `self.ctx.data`, thus preserving the incredibly powerful "Comma-Separated Fallback Priority" logic!

## 1) Setup Checklist
1. Add widget as **Time Series**.
2. Go to the widget Datasources menu:
   - Type: **Entity**
   - Entity Alias: Select your plant
   - Data keys: Add any key (e.g., `active_power`) just to satisfy ThingsBoard's UI constraints.
3. Save the dashboard.
4. Click the gear icon (⚙️) inside the widget header to map your telemetry keys:
   - `Actual Power Keys` (e.g. `active_power, power_v3`)
   - `Setpoint Keys` (e.g. `setpoint_active_power, curtailment_limit`)
   - `Capacity Attribute Key` (e.g. `Plant Total Capacity`)

## 2) Calculations
Curtailment evaluates per standard bounds:
`Allowed Power = Capacity * (Setpoint % / 100)`
Red Zone renders only when the explicitly commanded limit is breached by theoretical clear sky potential.
