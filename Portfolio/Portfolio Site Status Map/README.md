# Portfolio Site Status Map - Quick Read and Setup

## 0) What this means in a PV portfolio
- Geospatial health view of all sites with marker size dynamically tracking plant scale and color tracking health status.
- Designed with an ultra-legible, high-contrast dark blue map theme with white lettering for maximum visibility.
- Highly useful for operations centers to spot geographical risk patterns instantly.

## 1) Calculations and rendering logic
For each site mapped from the dashboard:
1. Coordinates are extracted via `latitude`/`lat` and `longitude`/`lon`.
2. Marker size dynamically compares plant scale based on `Plant Total Capacity`:
   - Normalized into MW internally (based on UI Setting unit W/kW/MW)
   - `>=50` MW -> large dot
   - `>=10` MW -> medium dot
   - else -> small dot
3. Marker color is determined by the `status` telemetry:
   - `healthy` -> green
   - `warning` -> amber
   - `fault` -> red
4. Tooltip dynamically parses:
   - Site name (via `plant_name` attribute, defaults to Entity Name)
   - Capacity + Base Unit suffix
   - Operational Status
   - Extra metrics: `rar_lkr` shown as million LKR, and `cf_status` dynamically colored.
5. Floating dynamic stats bar tracks overall counts per status category.

## 2) Entity Mapping and Dynamic Hierarchy
This widget is natively built to dynamically resolve hierarchical assets, enabling you to select a single root asset (like "Windforce Plants" or "SCADA Power Plants") and automatically map all underlying Power Plants. This scales perfectly to future implementations since it relies on ThingsBoard robust Relation Queries instead of hardcoded profiles.

**Recommended ThingsBoard Alias Setup:**
We recommend creating an alias called "Mapped Assets" (or similar) built natively for dynamic traversal:
1. **Filter type:** Relations Query (or Asset Search Query for TB 3.3+)
2. **Root entity:** Entity from Dashboard State (parameter name: `SelectedAsset`)
3. **Direction:** From
4. **Max relation level:** 10 (or high enough to reach the plants)
5. **Filters:** Target entity type `ASSET` (and/or `DEVICE`), Relation type `Contains`.

The widget inherently maps any descendant entity that qualifies as a "plant" while ignoring overviews or blocks dynamically.

**Required Mapping Keys (Attributes / Telemetry):**
- `latitude` or `lat` (number)
- `longitude` or `lon` (number)
- `Plant Total Capacity` or `capacity` (number)

**Optional Mapping Keys:**
- `plant_name` or `name` (string - custom label)
- `status` (`healthy`/`warning`/`fault`)
- `rar_lkr` (number - Revenue at risk)
- `cf_status` (string - capacity factor status)

*Note: You can map either the exact database Key Name or edit its UI visual Label in the data source configuration to match, the widget will detect both automatically.*

## 3) Units and Dynamic Filtering Settings
- **Capacity Units:** Capacity units are fully configurable in the widget's "Settings" tab (e.g., `W`, `kW`, `MW`). The map dynamically converts the raw attribute to `MW` internally solely for dot scaling, but will display your chosen raw unit dynamically in the Tooltips.
- **Target Asset Profiles:** You can explicitly define valid profiles (e.g., `SolarPlant`) as a comma-separated list in the Widget Settings. Leave it empty to allow any profile.
- **Strict Duck-Typing (Dynamic Filtering):** Enabled by default via the Widget Settings. Rather than checking explicit hierarchy types to exclude "Blocks" or "Overviews", the widget requires an entity to possess `latitude`, `longitude`, AND `Plant Total Capacity`. If an entity has capacity, it naturally represents the top-level Plant. This provides absolute compatibility without hardcoding profile names into the JS logic!

## 4) ThingsBoard setup checklist
1. Map a **Relations Query** Entity Alias from the Dashboard State (`SelectedAsset`).
2. Add the widget to the dashboard as `Latest values`.
3. In Data Sources, select your alias and map your Data Keys (`lat`, `lon`, `Plant Total Capacity`, `status`, etc.).
4. Under the *Settings* tab, set your `Capacity Unit (W, kW, MW)`.
5. Under the *Settings* tab, configure your `Target Asset Profiles` (e.g., `SolarPlant, WindPlant`) or leave it empty to rely completely on `Strict Duck-Typing` fallback.
6. Ensure your plant assets have coordinates and capacity populated.
