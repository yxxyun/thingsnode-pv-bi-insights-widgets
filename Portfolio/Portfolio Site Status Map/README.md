# Portfolio Site Status Map

## Overview

Displays power plant locations on an interactive Leaflet map embedded in a ThingsBoard dashboard widget. Marker size encodes plant capacity; marker colour encodes operational status.

The widget supports a **dashboard-state driven hierarchy** using the `SelectedAsset` entity parameter. It resolves the correct set of plants to display dynamically without hardcoding any asset names, hierarchy depths, or profile structures, so it remains compatible with future reorganisations of the asset tree.

---

## How it works

### Core principle: profile-based plant detection

The only thing the widget needs to know is which **Asset Profile** name identifies a plant (default: `SolarPlant`). Everything else, parent/child traversal, hierarchy depth, sibling lookup, is resolved dynamically at runtime via the ThingsBoard REST API.

### Rendering rules by selection

| What is selected | What gets mapped |
|---|---|
| Any non-plant container (e.g. `Windforce Plants`, `SCADA Power Plants`, `Windforce Overview`) | All plant-profile descendants under that container |
| A plant (e.g. `Power Plant 1`) | All plant-profile descendants of its nearest non-plant ancestor (i.e. sibling plants) |
| A sub-plant asset (e.g. `Block 1`) | Walks up to the plant branch, then uses the higher non-plant container above that plant to map the sibling plants in that branch |

This works for any hierarchy depth. The widget does not care how many levels exist between the root and the plants.

### Resolution algorithm

```
1. Read the selected entity ID from the datasource.
2. Fetch the entity from /api/asset/{id} to confirm its profile.
3a. If the entity IS a plant profile:
      -> Walk up via /api/relations/info (parent relations) until a
         non-plant ancestor is found.
      -> Use that ancestor as the render root.
3b. If the entity is NOT a plant profile:
      -> Check whether it already has plant descendants.
      -> If yes, use it as the render root.
      -> If no, walk up until a plant ancestor is found, then continue
         upward to the nearest non-plant ancestor above that plant.
4. From the render root, walk down via /api/relations (child relations),
   recursively, collecting all assets whose profile matches the plant profile.
5. Fetch latest telemetry and server-side attributes (lat, lon, capacity,
   status, ...) for each plant.
6. Render circle markers on the Leaflet map.
```

---

## ThingsBoard setup

### Datasource (one is enough)

Configure a single datasource on the widget:

| Setting | Value |
|---|---|
| Alias type | Entity from Dashboard State |
| State entity parameter | `SelectedAsset` |
| Data keys | Any one key (e.g. `name`) - used only to expose the entity ID |

> The widget reads the entity ID from the datasource metadata. All hierarchy traversal and telemetry retrieval happen via REST API calls, so additional data keys on the datasource are not required.

### Dashboard state parameter

Ensure the dashboard (or a navigation action) sets the state parameter `SelectedAsset` to the entity the user selects. This is the standard ThingsBoard "Entity from dashboard state" pattern.

### Asset relationships

All parent-child links in the hierarchy must be configured in ThingsBoard as outbound **Contains** relations:

```
Parent  --contains-->  Child
```

The widget queries both directions (`from` for children, `to` for parents), so both forward and reverse relation traversal work automatically.

---

## Required plant data keys (on plant assets)

The following keys are fetched from either:
- `/api/plugins/telemetry/ASSET/{id}/values/timeseries`
- `/api/plugins/telemetry/ASSET/{id}/values/attributes/SERVER_SCOPE`

Latest telemetry is preferred when a key exists there; otherwise the widget falls back to the server-side attribute value.

| Data | Accepted key names |
|---|---|
| Latitude | `latitude`, `lat` |
| Longitude | `longitude`, `lon` |
| Capacity | `Plant Total Capacity`, `plant total capacity`, `capacity` |
| Display name | `plant_name`, `name` |
| Status | `status` |
| Risk-at-Risk (LKR) | `rar_lkr` |
| Capacity factor status | `cf_status` |

---

## Widget settings

| Setting ID | Label | Type | Default | Description |
|---|---|---|---|---|
| `widgetTitle` | Widget Title | text | `Portfolio Site Locations` | Title shown in the floating header |
| `capacityUnit` | Capacity Unit (W, kW, MW) | text | `MW` | Unit for display and marker-size normalisation |
| `targetAssetProfiles` | Target Asset Profiles (comma separated) | text | `SolarPlant` | Profile name(s) that identify a mappable plant. Case-insensitive, whitespace-insensitive |
| `strictDuckTyping` | Use Duck Typing | boolean | `true` | When enabled, a plant is only mapped if it has valid lat, lon, and capacity |

---

## Marker appearance

| Capacity (MW) | Marker size |
|---|---|
| >= 50 MW | Large |
| 10 - 49 MW | Medium |
| < 10 MW | Small |

| Status value | Colour |
|---|---|
| `healthy` (default) | Green |
| `warning` | Amber |
| `fault` | Red |

---

## Expected behaviour by selected entity

Given the example hierarchy:

```
Windforce Plants                   (profile: default)
|-- SCADA Power Plants             (profile: default)
|   |-- Power Plant 1              (profile: SolarPlant)
|   |   |-- Block 1
|   |   `-- Block 2
|   |-- Power Plant 2              (profile: SolarPlant)
|   `-- Power Plant 3              (profile: SolarPlant)
`-- Windforce Overview             (profile: default)
    |-- Power Plant 1              (profile: SolarPlant)
    |-- Power Plant 2              (profile: SolarPlant)
    `-- Power Plant 3              (profile: SolarPlant)
```

| Selected entity | Mapped plants |
|---|---|
| `Windforce Plants` | All 6 power plants |
| `SCADA Power Plants` | Power Plants 1, 2, 3 under SCADA |
| `Windforce Overview` | Power Plants 1, 2, 3 under Overview |
| `Power Plant 1` (under SCADA) | Power Plants 1, 2, 3 under SCADA (siblings) |
| `Block 1` (under Power Plant 1, under SCADA) | Power Plants 1, 2, 3 under SCADA |

---

## API calls made at runtime

Each time the widget refreshes for the current selection, it makes the following REST API calls:

1. `GET /api/asset/{selectedId}` - confirm the selected asset's profile
2. `GET /api/relations?fromId=...` - check for plant descendants and fetch children of the render root (repeated recursively per level until all plant descendants are collected)
3. *(When the selection is a plant or sub-plant asset)* `GET /api/relations/info?toId=...` - walk up to the plant ancestor and then to the nearest non-plant ancestor above it
4. `GET /api/plugins/telemetry/ASSET/{id}/values/timeseries?keys=...` - latest telemetry for each plant asset
5. `GET /api/plugins/telemetry/ASSET/{id}/values/attributes/SERVER_SCOPE?keys=...` - server-side attribute fallback for each plant asset

All calls are authenticated using the current user's JWT token via `self.ctx.authService.getJwtToken()`.

---

## Extending the widget

**Adding a new profile type as a plant:**  
Update `Target Asset Profiles` in widget settings (comma-separated). No code changes needed.

**Deeper hierarchies:**  
The recursive descent (`fetchPlantDescendants`) defaults to a maximum depth of 8 levels. Adjust the `maxDepth` argument in the call if needed.

**Different relation type:**  
The widget uses `Contains` as the relation type for both parent and child traversal. If your hierarchy uses a different relation type (e.g. `managedBy`), update the `relationType` parameter in `getChildRelations` and `getParentRelations`.

**Different entity type:**  
The widget assumes all hierarchy entities are `ASSET` type. If devices or other entity types appear in the hierarchy, adjust the `fromEntityType` / `toEntityType` parameters accordingly.

---

## Migration from the old "All Plants" datasource

The previous version used a single alias (`All Plants`) that pre-filtered to `SolarPlant` assets. To migrate:

1. Replace the `All Plants` alias datasource with an **Entity from Dashboard State** alias pointing to `SelectedAsset`.
2. Add any single data key (e.g. `name`) on the datasource so ThingsBoard exposes the entity ID.
3. Set `Target Asset Profiles = SolarPlant` in widget settings (same as before).
4. Ensure all plant assets have `latitude`/`longitude`/`capacity` available in latest telemetry or server-side attributes.
5. No HTML or CSS changes are required.

---

## Notes

- No hierarchy names, entity names, or hierarchy depths are hardcoded in the widget JavaScript.
- The widget is stateless between `onDataUpdated` calls. Each selection change or same-selection data refresh triggers a fresh resolution cycle.
- A cancellation token pattern prevents stale in-flight API responses from overwriting a newer selection.
- The widget gracefully degrades: if a plant has no coordinates, it is silently skipped. If the API is unreachable, an empty map is shown.
