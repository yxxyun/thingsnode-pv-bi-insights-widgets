# Portfolio Site Status Map

## Overview
- Shows mapped power plant locations on a Leaflet map.
- Marker size tracks plant capacity.
- Marker color tracks plant status.
- The widget now supports dashboard-state driven hierarchy mapping using `SelectedAsset`.

This widget does not hardcode hierarchy names such as `Windforce Plants`, `SCADA Power Plants`, `Windforce Overview`, `Power Plant`, or `Block`. It only merges datasource rows and filters for plant-like entities based on profile and data availability.

## Supported datasource patterns

### Recommended setup: `SelectedAsset` hierarchy mapping
Configure the widget with two datasources:

1. `Selected Asset`
   - Alias type: `Entity from Dashboard State`
   - State entity parameter: `SelectedAsset`

2. `Selected Asset Descendants`
   - Alias type: `Relations Query` (or equivalent asset search query)
   - Root entity: dashboard state entity `SelectedAsset`
   - Direction: `From`
   - Relation type: `contains`
   - Max relation level: high enough to reach plants
   - Target entity type: `ASSET`

Map the same keys on both datasources.

### Backward-compatible setup
The old single-alias `All Plants` pattern still works. If the datasource already returns only plant assets, the widget will render them as before.

## Required and optional keys

### Required for mapping
- `latitude` or `lat`
- `longitude` or `lon`
- `Plant Total Capacity` or `capacity` when `strictDuckTyping = true`

### Optional
- `plant_name` or `name`
- `status`
- `rar_lkr`
- `cf_status`

The widget checks both the actual key name and the key label configured in the datasource.

## How filtering works
- Datasource rows are merged by stable entity identity:
  - `entityId` first
  - fallback to `entityType + entityName`
- If `targetAssetProfiles` is set, only those profiles are allowed.
- If `strictDuckTyping` is enabled, an entity must have:
  - valid latitude
  - valid longitude
  - valid capacity

This keeps the logic generic:
- container assets without coordinates are ignored
- block assets without plant-level capacity are ignored
- plant assets with map data are shown

## Expected behavior by selection

| `SelectedAsset` value | Expected result |
|---|---|
| `Windforce Plants` | All descendant plants are mapped |
| `SCADA Power Plants` | Plants under that branch are mapped |
| `Windforce Overview` | Plants under that branch are mapped |
| `Power Plant 1` | Only that plant is mapped |
| `Block 1` | Nothing is mapped |

The selected-plant case works because the root datasource contributes the selected asset itself, while the descendants datasource contributes lower-level assets under it.

## Widget settings
- `Widget Title`: map title
- `Capacity Unit (W, kW, MW)`: display unit, also used to normalize marker sizing
- `Target Asset Profiles`: comma-separated allowed profiles, default `SolarPlant`
- `Use Duck Typing`: when enabled, only entities with lat, lon, and capacity are mapped

## ThingsBoard setup checklist
1. Create the `Selected Asset` alias from dashboard state parameter `SelectedAsset`.
2. Create the `Selected Asset Descendants` alias using outbound `contains` relations.
3. Add this widget as a `Latest values` widget.
4. Add both datasources to the widget.
5. Map the same data keys on both datasources.
6. Keep `Target Asset Profiles = SolarPlant` unless your plant profile uses a different name.
7. Make sure plant assets have coordinates and plant-level capacity.

## Notes
- No hierarchy names are hardcoded in the widget JS.
- The widget assumes parent-to-child traversal uses outbound `contains` relations.
- If you clear `Target Asset Profiles`, the widget can still work through duck typing alone.
