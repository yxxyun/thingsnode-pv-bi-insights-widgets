# Portfolio Site Status Map

## Overview

Displays power plant locations on an interactive Leaflet map embedded in a ThingsBoard dashboard widget. Marker size encodes plant capacity; marker colour encodes operational status.

The widget supports a **dashboard-state driven hierarchy** using the `SelectedAsset` entity parameter. It resolves the correct set of plants to display dynamically without hardcoding any asset names, hierarchy depths, or profile structures, so it remains compatible with future reorganisations of the asset tree.

It also supports mixed `ASSET` / `DEVICE` hierarchies. The state parameter name stays `SelectedAsset` for dashboard compatibility, but the selected entity itself may be either an asset or a device.

Other relation target types are ignored during traversal unless the widget is explicitly extended to support them.

If the same plant entity appears in more than one hierarchy branch, the dashboard should also provide a custom state parameter named `SelectedBranchRoot`. That extra context lets the widget distinguish between shared-entity branches such as `SCADA Power Plants` and `Windforce Overview`.

In this repo's Windforce dashboard, the `test_v2_hierarchy` widget now emits `SelectedBranchRoot` on every successful selection using the resolved hierarchy path, so plant and block clicks stay scoped to the correct branch without name-based hardcoding.

---

## How it works

### Core principle: profile-based plant detection

The only thing the widget needs to know is which profile name identifies a plant (default: `SolarPlant`). Everything else, parent/child traversal, hierarchy depth, sibling lookup, is resolved dynamically at runtime via the ThingsBoard REST API.

### Rendering rules by selection

| What is selected | What gets mapped |
|---|---|
| Any non-plant container (e.g. `Windforce Plants`, `SCADA Power Plants`, `Windforce Overview`) | All plant-profile descendants under that container |
| A plant (e.g. `Power Plant 1`) | All plant-profile descendants of its nearest non-plant ancestor when that ancestor is unique; otherwise the selected plant only |
| A sub-plant node (e.g. `Block 1`) | Uses the nearest plant ancestor and then its nearest non-plant branch container when that path is unique; otherwise the nearest plant only |

This works for any hierarchy depth. The widget does not care how many levels exist between the root and the plants.

### Resolution algorithm

```
1. Read the selected entity ID from the datasource (`SelectedAsset`).
2. Optionally read `SelectedBranchRoot` from dashboard state.
3. Fetch the selected entity from its matching ThingsBoard endpoint (`/api/asset/{id}` or `/api/device/{id}`) to confirm its profile.
4a. If `SelectedBranchRoot` is present and resolves successfully:
      -> Use that branch root as the preferred render root.
      -> Walk down from that branch root and render its plant descendants.
      -> If it yields no plants, continue with the selected-entity logic below.
4b. If the entity IS a plant profile:
      -> Find the nearest non-plant ancestor(s) above the plant.
      -> If exactly one branch ancestor exists, use it as the render root.
      -> If multiple branch ancestors exist, render the selected plant only.
4c. If the entity is NOT a plant profile:
      -> Check whether it already has plant descendants.
      -> If yes, use it as the render root.
      -> If no, search upward for the nearest plant ancestor.
      -> If no plant ancestor exists, stop and render an empty map.
      -> If one plant ancestor exists, resolve its nearest non-plant
         branch ancestor and render that branch when unique.
      -> If that branch is ambiguous, render the nearest plant only.
5. From the render root, walk down via /api/relations (child relations),
   recursively, collecting all supported relation targets (`ASSET` / `DEVICE`)
   whose profile matches the plant profile.
6. Fetch latest telemetry and server-side attributes (lat, lon, capacity,
   status, ...) for each plant.
7. Render circle markers on the Leaflet map.
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

### Shared-branch disambiguation with `SelectedBranchRoot`

When the same underlying plant entity ID can appear in multiple branches, `SelectedAsset` alone is not enough to tell the widget which sibling set to render. In that case, the dashboard should also set a custom state parameter named `SelectedBranchRoot`.

Expected shape:

```js
{
  id: string,
  entityType: 'ASSET' | 'DEVICE',
  name?: string
}
```

Recommended rules for the widget or action that updates dashboard state:

| User click | `SelectedAsset` | `SelectedBranchRoot` |
|---|---|---|
| Non-plant branch container (e.g. `SCADA Power Plants`, `Windforce Overview`) | Clicked node | Same clicked node |
| Shared plant under a branch | Clicked plant | The non-plant branch container above that plant occurrence |
| Descendant below a shared plant | Clicked descendant | The same non-plant branch container above that plant occurrence |

For this dashboard specifically, `test_v2_hierarchy` follows those rules automatically:
- Container click: `SelectedBranchRoot =` clicked container
- Plant click: `SelectedBranchRoot =` nearest non-plant ancestor above the deepest plant in the resolved path
- Descendant below plant: `SelectedBranchRoot =` that same nearest non-plant ancestor

Without `SelectedBranchRoot`, the widget still works in fallback mode, but shared plant selections may stop at the nearest plant instead of rendering sibling plants when the branch path is ambiguous.

With `debugMode` enabled, the widget also logs whether `SelectedBranchRoot` was missing, malformed, ignored, or successfully used for the current click.

### Hierarchy relationships

All parent-child links in the hierarchy must be configured in ThingsBoard as outbound **Contains** relations:

```
Parent  --contains-->  Child
```

The widget queries both directions (`from` for children, `to` for parents), so both forward and reverse relation traversal work automatically.

If a relation points to an entity type other than `ASSET` or `DEVICE`, that node is skipped by the widget.

---

## Required plant data keys (on plant entities)

The following keys are fetched from either:
- `/api/plugins/telemetry/{ENTITY_TYPE}/{id}/values/timeseries`
- `/api/plugins/telemetry/{ENTITY_TYPE}/{id}/values/attributes/SERVER_SCOPE`

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
| `targetAssetProfiles` | Target Asset Profiles (comma separated) | text | `SolarPlant` | Profile name(s) that identify a mappable plant. Works for both asset and device profile names. Case-insensitive, whitespace-insensitive |
| `strictDuckTyping` | Use Duck Typing | boolean | `false` | When enabled, a plant is only mapped if it has valid lat, lon, and capacity. When disabled, valid coordinates are enough and missing capacity falls back to the smallest marker with `Capacity: N/A` in the tooltip |
| `debugMode` | Debug Mode | boolean | `false` | Logs branch resolution, relation traversal, fallback reasons, and render counts to the browser console |

---

## Marker appearance

| Capacity (MW) | Marker size |
|---|---|
| >= 50 MW | Large |
| 10 - 49 MW | Medium |
| < 10 MW | Small |
| Missing capacity | Smallest/default marker |

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

If `Power Plant 1` is also reused under `Windforce Overview`, the dashboard should set `SelectedBranchRoot = Windforce Overview` when that Overview occurrence is clicked. That is what lets the map render the Overview sibling set instead of drifting back to the SCADA branch.

---

## API calls made at runtime

Each time the widget refreshes for the current selection, it makes the following REST API calls:

1. `GET /api/asset/{selectedId}` or `GET /api/device/{selectedId}` - resolve the selected entity using its actual ThingsBoard type
2. `GET /api/asset/{branchRootId}` or `GET /api/device/{branchRootId}` - resolve `SelectedBranchRoot` when that state parameter is present
3. `GET /api/relations?fromId=...&fromType=...` - check for plant descendants and fetch children of the render root (repeated recursively per level until all plant descendants are collected)
4. *(Fallback mode only, when no valid branch root is available and the selection is a plant or sub-plant node)* `GET /api/relations/info?toId=...&toType=...` - inspect supported parent candidates, detect ambiguity, and resolve the nearest plant / non-plant branch path
5. `GET /api/plugins/telemetry/{ENTITY_TYPE}/{id}/values/timeseries?keys=...` - latest telemetry for each plant entity
6. `GET /api/plugins/telemetry/{ENTITY_TYPE}/{id}/values/attributes/SERVER_SCOPE?keys=...` - server-side attribute fallback for each plant entity

Only the initially selected datasource entity and the optional branch-root state entity are probed leniently across `ASSET` / `DEVICE` if their type is missing or wrong. Related nodes discovered through relations are followed only when their relation metadata explicitly identifies them as supported entity types. All calls are authenticated using the current user's JWT token via `self.ctx.authService.getJwtToken()`. The widget uses the ThingsBoard-provided `self.ctx.http` transport, which may be Promise-based or Observable-based depending on the runtime build.

---

## Extending the widget

**Adding a new profile type as a plant:**  
Update `Target Asset Profiles` in widget settings (comma-separated). No code changes needed.

**Deeper hierarchies:**  
The recursive descent (`fetchPlantDescendants`) defaults to a maximum depth of 8 levels. Adjust the `maxDepth` argument in the call if needed.

**Different relation type:**  
The widget uses `Contains` as the relation type for both parent and child traversal. If your hierarchy uses a different relation type (e.g. `managedBy`), update the `relationType` parameter in `getChildRelations` and `getParentRelations`.

**Different entity type:**  
The widget now supports mixed `ASSET` / `DEVICE` hierarchies automatically. Other relation target types are ignored. If your hierarchy introduces additional ThingsBoard entity types that should appear on the map, extend the traversal filter, entity fetch helper, and telemetry endpoint builder accordingly.

---

## Migration from the old "All Plants" datasource

The previous version used a single alias (`All Plants`) that pre-filtered to `SolarPlant` assets. To migrate:

1. Replace the `All Plants` alias datasource with an **Entity from Dashboard State** alias pointing to `SelectedAsset`.
2. Add any single data key (e.g. `name`) on the datasource so ThingsBoard exposes the entity ID.
3. Set `Target Asset Profiles = SolarPlant` in widget settings (same as before).
4. If the same plant entity can be reached through multiple branches, update the dashboard navigation action or hierarchy widget to also set `SelectedBranchRoot`.
5. Ensure all plant entities have `latitude`/`longitude`/`capacity` available in latest telemetry or server-side attributes.
6. No HTML or CSS changes are required.

If some plants do not yet have capacity values, the default widget behavior will still render them as long as coordinates exist. Enable `strictDuckTyping` only if you want to enforce the older “lat + lon + capacity” requirement.

---

## Notes

- No hierarchy names, entity names, or hierarchy depths are hardcoded in the widget JavaScript.
- The widget is stateless between `onDataUpdated` calls. Each selection change or same-selection data refresh triggers a fresh resolution cycle.
- A cancellation token pattern prevents stale in-flight API responses from overwriting a newer selection.
- Non-plant container selections never walk upward into another branch when they have no plant descendants. They stop and render empty instead.
- Ambiguous shared plant or sub-plant selections render the nearest plant only unless `SelectedBranchRoot` is supplied.
- With the default settings, plants with valid coordinates still render when capacity is missing; the tooltip shows `Capacity: N/A` and the marker uses the smallest size.
- When `debugMode = true`, the browser console includes `[PortfolioMap][render-*]` logs for branch-root usage, parent ambiguity, descendant counts, and terminal fallback reasons.
- The widget gracefully degrades: if a plant has no coordinates, it is silently skipped. If the API is unreachable, an empty map is shown.
