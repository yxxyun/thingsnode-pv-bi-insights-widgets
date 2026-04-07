// ============================================
// Portfolio Site Status Map
// ThingsBoard v4.3.0 PE | Latest Values
// Dynamic hierarchy traversal - no hardcoded names
// ============================================

self.onInit = function () {
    self.ctx.settings = self.ctx.settings || {};
    self.ctx.$widget = self.ctx.$container;
    self.map = null;
    self.layerGroup = null;

    // Pending state tracking
    self._pendingRender = null;

    // Load Leaflet CSS dynamically (if not already present)
    var cssId = 'leaflet-css-v1';
    if (!document.getElementById(cssId)) {
        var link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
    }

    // Load Leaflet JS if missing
    if (typeof L === 'undefined') {
        var script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = function () { startWidget(); };
        document.head.appendChild(script);
    } else {
        startWidget();
    }
};

// ============================================================
// KEY / ALIAS MATCHING
// ============================================================
var KEY_ALIASES = {
    lat:      ['latitude', 'lat'],
    lon:      ['longitude', 'lon'],
    capacity: ['Plant Total Capacity', 'plant total capacity', 'capacity'],
    name:     ['plant_name', 'name'],
    status:   ['status'],
    rarLkr:   ['rar_lkr'],
    cfStatus: ['cf_status']
};

function normalizeKey(value) {
    return (value || '').toString().trim().toLowerCase();
}

function normalizeProfile(value) {
    return normalizeKey(value).replace(/\s+/g, '');
}

function getEntityIdValue(entityId) {
    if (!entityId) { return ''; }
    if (typeof entityId === 'string') { return entityId; }
    if (entityId.id) { return entityId.id; }
    return '';
}

function getEntityKey(datasource) {
    if (!datasource) { return ''; }
    var entityId = getEntityIdValue(datasource.entityId);
    if (entityId) { return entityId; }
    var entityType = datasource.entityType || 'ENTITY';
    var entityName = datasource.entityName || datasource.name || 'unknown';
    return entityType + ':' + entityName;
}

function matchesAnyKey(dataKey, aliases) {
    var keyName = normalizeKey(dataKey && dataKey.name);
    var keyLabel = normalizeKey(dataKey && dataKey.label);
    return aliases.indexOf(keyName) > -1 || aliases.indexOf(keyLabel) > -1;
}

// ============================================================
// PLANT PROFILE DETECTION
// ============================================================
function getTargetProfiles() {
    var raw = self.ctx.settings.targetAssetProfiles || 'SolarPlant';
    return raw.split(',').map(function (p) { return normalizeProfile(p); }).filter(Boolean);
}

function isPlantProfile(profileName) {
    var targets = getTargetProfiles();
    var normalized = normalizeProfile(profileName || '');
    return targets.indexOf(normalized) > -1;
}

// ============================================================
// TB REST API HELPERS
// Uses self.ctx.http (Angular $http exposed by ThingsBoard)
// ============================================================

function getChildRelations(entityId, token) {
    var url = '/api/relations?fromId=' + entityId +
              '&fromType=ASSET&relationType=Contains&toEntityType=ASSET';
    return apiGet(url, token);
}

function getParentRelations(entityId, token) {
    var url = '/api/relations/info?toId=' + entityId +
              '&toType=ASSET&relationType=Contains&fromEntityType=ASSET';
    return apiGet(url, token);
}

function getAsset(entityId, token) {
    var url = '/api/asset/' + entityId;
    return apiGet(url, token);
}

function apiGet(url, token) {
    var headers = {};
    if (token) {
        headers['X-Authorization'] = 'Bearer ' + token;
    }
    return self.ctx.http.get(url, { headers: headers }).then(function (resp) {
        return resp.data;
    });
}

// ============================================================
// RECURSIVE DESCENDANT FETCH
// ============================================================
function fetchPlantDescendants(rootEntityId, token, maxDepth) {
    maxDepth = maxDepth || 8;
    var plants = [];
    var visited = {};

    function walk(entityId, depth) {
        if (depth > maxDepth || visited[entityId]) {
            return Promise.resolve();
        }
        visited[entityId] = true;

        return getChildRelations(entityId, token).then(function (relations) {
            if (!relations || relations.length === 0) { return; }

            var promises = relations.map(function (rel) {
                var childId = rel.to && rel.to.id;
                if (!childId || visited[childId]) { return Promise.resolve(); }

                return getAsset(childId, token).then(function (asset) {
                    if (!asset) { return; }
                    if (isPlantProfile(asset.assetProfileName || asset.type)) {
                        plants.push(asset);
                        return Promise.resolve();
                    }
                    return walk(childId, depth + 1);
                });
            });

            return Promise.all(promises);
        });
    }

    return walk(rootEntityId, 0).then(function () { return plants; });
}

// ============================================================
// WALK UP HELPERS
// ============================================================
function findAncestorAbovePlants(entityId, token, maxUp) {
    maxUp = maxUp || 5;

    function step(currentId, stepsLeft) {
        if (stepsLeft <= 0) { return Promise.resolve(null); }

        return getAsset(currentId, token).then(function (asset) {
            if (!asset) { return null; }
            var profile = asset.assetProfileName || asset.type || '';
            if (!isPlantProfile(profile)) {
                return asset;
            }
            return getParentRelations(currentId, token).then(function (rels) {
                if (!rels || rels.length === 0) { return null; }
                var parentId = rels[0].from && rels[0].from.id;
                if (!parentId) { return null; }
                return step(parentId, stepsLeft - 1);
            });
        });
    }

    return step(entityId, maxUp);
}

function findPlantAncestor(entityId, token, maxUp) {
    maxUp = maxUp || 5;

    function step(currentId, stepsLeft) {
        if (stepsLeft <= 0) { return Promise.resolve(null); }

        return getAsset(currentId, token).then(function (asset) {
            if (!asset) { return null; }
            var profile = asset.assetProfileName || asset.type || '';
            if (isPlantProfile(profile)) {
                return asset;
            }

            return getParentRelations(currentId, token).then(function (rels) {
                if (!rels || rels.length === 0) { return null; }
                var parentId = rels[0].from && rels[0].from.id;
                if (!parentId) { return null; }
                return step(parentId, stepsLeft - 1);
            });
        });
    }

    return step(entityId, maxUp);
}

// ============================================================
// TELEMETRY / ATTRIBUTE FETCH
// ============================================================
var TELEMETRY_KEYS = ['latitude', 'lat', 'longitude', 'lon',
                      'Plant Total Capacity', 'plant total capacity', 'capacity',
                      'plant_name', 'name',
                      'status', 'rar_lkr', 'cf_status'];

function getServerAttributes(entityId, token) {
    var url = '/api/plugins/telemetry/ASSET/' + entityId +
              '/values/attributes/SERVER_SCOPE?keys=' +
              encodeURIComponent(TELEMETRY_KEYS.join(','));
    return apiGet(url, token);
}

function normalizeAttributeMap(attributeData) {
    if (!attributeData) {
        return {};
    }

    if (Array.isArray(attributeData)) {
        return attributeData.reduce(function (acc, entry) {
            if (entry && entry.key !== undefined) {
                acc[entry.key] = entry.value;
            }
            return acc;
        }, {});
    }

    return attributeData;
}

function fetchTelemetryForAssets(assets, token) {
    var promises = assets.map(function (asset) {
        var id = asset.id && asset.id.id || asset.id;
        var telemetryUrl = '/api/plugins/telemetry/ASSET/' + id +
                           '/values/timeseries?keys=' + encodeURIComponent(TELEMETRY_KEYS.join(',')) +
                           '&limit=1';

        return Promise.all([
            apiGet(telemetryUrl, token).catch(function () { return {}; }),
            getServerAttributes(id, token).catch(function () { return {}; })
        ]).then(function (result) {
            return {
                asset: asset,
                telemetry: result[0] || {},
                attributes: normalizeAttributeMap(result[1])
            };
        });
    });

    return Promise.all(promises);
}

// ============================================================
// SITE OBJECT FROM TELEMETRY / ATTRIBUTES
// ============================================================
function extractLatestValue(telemetryEntry) {
    if (!telemetryEntry || !telemetryEntry.length) { return null; }
    return telemetryEntry[0].value;
}

function buildSiteFromTelemetry(asset, telemetry, attributes) {
    var assetId = asset.id && asset.id.id || asset.id;
    var assetName = asset.name || 'Unknown';

    function tv(keys) {
        for (var i = 0; i < keys.length; i++) {
            var telemetryValue = extractLatestValue(telemetry[keys[i]]);
            if (telemetryValue !== null && telemetryValue !== undefined) {
                return telemetryValue;
            }

            if (attributes && attributes[keys[i]] !== null && attributes[keys[i]] !== undefined) {
                return attributes[keys[i]];
            }
        }
        return null;
    }

    var lat = parseFloat(tv(['latitude', 'lat']));
    var lon = parseFloat(tv(['longitude', 'lon']));
    var capacity = parseFloat(tv(['Plant Total Capacity', 'plant total capacity', 'capacity']));
    var name = tv(['plant_name', 'name']) || assetName;
    var status = tv(['status']);
    var rar_lkr = parseFloat(tv(['rar_lkr']));
    var cf_status = tv(['cf_status']);

    return {
        entityId: assetId,
        name: name,
        lat: isNaN(lat) ? null : lat,
        lon: isNaN(lon) ? null : lon,
        capacity: isNaN(capacity) ? null : capacity,
        status: status,
        rar_lkr: isNaN(rar_lkr) ? null : rar_lkr,
        cf_status: cf_status
    };
}

// ============================================================
// TOKEN HELPER
// ============================================================
function getAuthToken() {
    try {
        return self.ctx.authService
            ? self.ctx.authService.getJwtToken()
            : null;
    } catch (e) {
        return null;
    }
}

// ============================================================
// WIDGET BOOTSTRAP
// ============================================================
function startWidget() {
    self.updateDom();
    setTimeout(initMap, 150);
}

self.updateDom = function () {
    var s = self.ctx.settings;
    self.ctx.$widget.find('.js-title').text(
        s.widgetTitle || 'Portfolio Site Locations'
    );
};

// ============================================================
// MAP INIT
// ============================================================
function initMap() {
    var $el = self.ctx.$widget;
    var container = $el.find('.js-map-canvas')[0];
    if (!container) { return; }

    if (self.map) {
        self.map.remove();
        self.map = null;
    }

    self.map = L.map(container, {
        center: [7.87, 80.70],
        zoom: 7,
        zoomControl: true,
        attributionControl: false,
        preferCanvas: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(self.map);

    self.map.zoomControl.setPosition('topright');
    self.layerGroup = L.layerGroup().addTo(self.map);

    self.onDataUpdated();
}

// ============================================================
// MAIN DATA HANDLER
// ============================================================
self.onDataUpdated = function () {
    if (!self.map || !self.layerGroup) { return; }

    var selectedEntityId = null;
    var selectedProfile = null;

    if (self.ctx.data && self.ctx.data.length > 0) {
        self.ctx.data.forEach(function (dsData) {
            if (!dsData || !dsData.datasource) { return; }
            var ds = dsData.datasource;
            var eId = getEntityIdValue(ds.entityId);
            if (eId && !selectedEntityId) {
                selectedEntityId = eId;
                selectedProfile = normalizeProfile(ds.entityProfileName || '');
            }
        });
    }

    if (!selectedEntityId) {
        renderEmptyState();
        return;
    }

    var token = {};
    self._pendingRender = token;

    resolveRenderRoot(selectedEntityId, selectedProfile, token);
};

// ============================================================
// RESOLVE ROOT AND RENDER
// ============================================================
function resolveRenderRoot(selectedId, selectedProfile, token) {
    var authToken = getAuthToken();

    setLoadingState(true);

    getAsset(selectedId, authToken).then(function (asset) {
        if (token !== self._pendingRender) { return; }

        var profile = normalizeProfile(
            (asset && (asset.assetProfileName || asset.type)) || selectedProfile || ''
        );

        if (isPlantProfile(profile)) {
            return findAncestorAbovePlants(selectedId, authToken).then(function (ancestor) {
                if (token !== self._pendingRender) { return; }
                if (!ancestor) {
                    renderPlantAssets([asset], authToken, token);
                } else {
                    var rootId = ancestor.id && ancestor.id.id || ancestor.id;
                    fetchAndRender(rootId, authToken, token);
                }
            });
        }

        return fetchPlantDescendants(selectedId, authToken).then(function (plants) {
            if (token !== self._pendingRender) { return; }

            if (plants && plants.length > 0) {
                renderPlantAssets(plants, authToken, token);
                return;
            }

            return findPlantAncestor(selectedId, authToken).then(function (plantAncestor) {
                if (token !== self._pendingRender) { return; }
                if (!plantAncestor) {
                    setLoadingState(false);
                    renderEmptyState();
                    return;
                }

                var plantAncestorId = plantAncestor.id && plantAncestor.id.id || plantAncestor.id;
                return findAncestorAbovePlants(plantAncestorId, authToken).then(function (ancestor) {
                    if (token !== self._pendingRender) { return; }
                    if (!ancestor) {
                        renderPlantAssets([plantAncestor], authToken, token);
                        return;
                    }

                    var rootId = ancestor.id && ancestor.id.id || ancestor.id;
                    fetchAndRender(rootId, authToken, token);
                });
            });
        });
    }).catch(function () {
        if (token !== self._pendingRender) { return; }
        setLoadingState(false);
        renderEmptyState();
    });
}

function fetchAndRender(rootId, authToken, token) {
    fetchPlantDescendants(rootId, authToken).then(function (plants) {
        if (token !== self._pendingRender) { return; }
        renderPlantAssets(plants, authToken, token);
    }).catch(function () {
        if (token !== self._pendingRender) { return; }
        setLoadingState(false);
        renderEmptyState();
    });
}

function renderPlantAssets(assets, authToken, token) {
    if (!assets || assets.length === 0) {
        setLoadingState(false);
        renderEmptyState();
        return;
    }

    fetchTelemetryForAssets(assets, authToken).then(function (results) {
        if (token !== self._pendingRender) { return; }
        setLoadingState(false);

        var useDuckTyping = self.ctx.settings.strictDuckTyping !== false;
        var sites = [];

        results.forEach(function (result) {
            var site = buildSiteFromTelemetry(result.asset, result.telemetry, result.attributes);
            if (site.lat === null || site.lon === null) { return; }
            if (useDuckTyping && site.capacity === null) { return; }
            sites.push(site);
        });

        renderMarkers(sites);
    }).catch(function () {
        if (token !== self._pendingRender) { return; }
        setLoadingState(false);
        renderEmptyState();
    });
}

// ============================================================
// MARKER RENDERING
// ============================================================
function renderMarkers(sites) {
    if (!self.map || !self.layerGroup) { return; }
    self.layerGroup.clearLayers();

    if (sites.length === 0) {
        renderEmptyState();
        return;
    }

    var $el = self.ctx.$widget;
    var $card = $el.find('.map-card');
    var cardFont = parseFloat($card.css('font-size')) || 14;
    var scaleFactor = cardFont / 14;

    var countOk = 0;
    var countWarn = 0;
    var countFault = 0;
    var bounds = [];
    var displayUnit = (self.ctx.settings.capacityUnit || 'MW').trim();

    sites.forEach(function (site) {
        var lat = site.lat;
        var lon = site.lon;

        var capVal = site.capacity || 0;
        var capMW = capVal;
        var unitUpperCase = displayUnit.toUpperCase();
        if (unitUpperCase === 'W') {
            capMW = capVal / 1000000;
        } else if (unitUpperCase === 'KW') {
            capMW = capVal / 1000;
        }

        var baseRadius = 6;
        if (capMW >= 50) {
            baseRadius = 14;
        } else if (capMW >= 10) {
            baseRadius = 10;
        }
        var radius = Math.max(4, baseRadius * scaleFactor);

        var color = '#66BB6A';
        var status = (site.status || 'healthy').toLowerCase();

        if (status === 'warning') {
            color = '#FFC107';
            countWarn++;
        } else if (status === 'fault') {
            color = '#FF5252';
            countFault++;
        } else {
            countOk++;
        }

        var marker = L.circleMarker([lat, lon], {
            radius: radius,
            fillColor: color,
            color: '#FFFFFF',
            weight: 1.5,
            opacity: 0.9,
            fillOpacity: 0.75
        });

        var name = site.name || 'Unknown';
        var capText = capVal + ' ' + displayUnit;
        var statusText = '<span style="color:' + color + '; text-transform:uppercase; font-weight:600;">' + status + '</span>';

        var tooltipHtml =
            '<div class="tt-name">' + name + '</div>' +
            '<div class="tt-detail">' + capText + ' &nbsp;|&nbsp; ' + statusText + '</div>';

        if (site.rar_lkr && site.rar_lkr > 0) {
            var rarM = (site.rar_lkr / 1000000).toFixed(2);
            tooltipHtml += '<div class="tt-rar">RaR: ' + rarM + ' M LKR</div>';
        }

        if (site.cf_status) {
            var cfColor = site.cf_status.toLowerCase() === 'warning' ? '#FFC107' : '#66BB6A';
            tooltipHtml += '<div class="tt-detail">CF: <span style="color:' + cfColor + ';">' + site.cf_status + '</span></div>';
        }

        marker.bindTooltip(tooltipHtml, {
            permanent: false,
            direction: 'top',
            className: 'leaflet-tooltip-custom',
            offset: [0, -radius]
        });

        marker.addTo(self.layerGroup);
        bounds.push([lat, lon]);
    });

    if (bounds.length > 1) {
        self.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else if (bounds.length === 1) {
        self.map.setView(bounds[0], 10);
    }

    var statsHtml =
        '<span class="stat-ok">' + countOk + '</span> | ' +
        '<span class="stat-warn">' + countWarn + '</span> | ' +
        '<span class="stat-fault">' + countFault + '</span>';
    $el.find('.js-stats').html(statsHtml);

    if (self.ctx.detectChanges) { self.ctx.detectChanges(); }
}

// ============================================================
// EMPTY / LOADING STATES
// ============================================================
function renderEmptyState() {
    if (self.layerGroup) { self.layerGroup.clearLayers(); }
    self.ctx.$widget.find('.js-stats').html(
        '<span class="stat-ok">0</span> | ' +
        '<span class="stat-warn">0</span> | ' +
        '<span class="stat-fault">0</span>'
    );
    if (self.ctx.detectChanges) { self.ctx.detectChanges(); }
}

function setLoadingState(isLoading) {
    if (isLoading) {
        self.ctx.$widget.find('.js-stats').html(
            '<span style="color:#90A4AE; font-style:italic;">Loading...</span>'
        );
    }
}

// ============================================================
// RESPONSIVE SCALING
// ============================================================
self.onResize = function () {
    var $el = self.ctx.$widget;
    var $card = $el.find('.map-card');
    var w = $el.width();
    var h = $el.height();

    var fromWidth = w / 30;
    var fromHeight = h / 16;
    var fontSize = Math.min(fromWidth, fromHeight);
    if (fontSize < 8) { fontSize = 8; }
    if (fontSize > 20) { fontSize = 20; }
    $card.css('font-size', fontSize + 'px');

    if (self.map) { self.map.invalidateSize(); }
};

// ============================================================
// CLEANUP
// ============================================================
self.onDestroy = function () {
    self._pendingRender = null;
    if (self.map) {
        self.map.remove();
        self.map = null;
    }
    self.layerGroup = null;
};
