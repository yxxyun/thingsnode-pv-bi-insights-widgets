// ============================================
// Portfolio Site Status Map
// ThingsBoard v4.3.0 PE | Latest Values
// ============================================

self.onInit = function () {
    self.ctx.settings = self.ctx.settings || {};
    self.ctx.$widget = self.ctx.$container;
    self.map = null;
    self.layerGroup = null;

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
        script.onload = function () {
            startWidget();
        };
        document.head.appendChild(script);
    } else {
        startWidget();
    }
};

var KEY_ALIASES = {
    lat: ['latitude', 'lat'],
    lon: ['longitude', 'lon'],
    capacity: ['plant total capacity', 'capacity'],
    name: ['plant_name', 'name'],
    status: ['status'],
    rarLkr: ['rar_lkr'],
    cfStatus: ['cf_status']
};

function normalizeKey(value) {
    return (value || '').toString().trim().toLowerCase();
}

function normalizeProfile(value) {
    return normalizeKey(value).replace(/\s+/g, '');
}

function getEntityIdValue(entityId) {
    if (!entityId) {
        return '';
    }
    if (typeof entityId === 'string') {
        return entityId;
    }
    if (entityId.id) {
        return entityId.id;
    }
    return '';
}

function getEntityKey(datasource) {
    if (!datasource) {
        return '';
    }

    var entityId = getEntityIdValue(datasource.entityId);
    if (entityId) {
        return entityId;
    }

    var entityType = datasource.entityType || 'ENTITY';
    var entityName = datasource.entityName || datasource.name || 'unknown';
    return entityType + ':' + entityName;
}

function matchesAnyKey(dataKey, aliases) {
    var keyName = normalizeKey(dataKey && dataKey.name);
    var keyLabel = normalizeKey(dataKey && dataKey.label);

    return aliases.indexOf(keyName) > -1 || aliases.indexOf(keyLabel) > -1;
}

function renderEmptyState() {
    if (self.layerGroup) {
        self.layerGroup.clearLayers();
    }

    self.ctx.$widget.find('.js-stats').html(
        '<span class="stat-ok">0</span> | <span class="stat-warn">0</span> | <span class="stat-fault">0</span>'
    );

    if (self.ctx.detectChanges) {
        self.ctx.detectChanges();
    }
}

function startWidget() {
    self.updateDom();
    // Delay map init to ensure container has rendered dimensions
    setTimeout(initMap, 150);
}

// --------------------------------------------------
// DOM setup
// --------------------------------------------------
self.updateDom = function () {
    var s = self.ctx.settings;
    self.ctx.$widget.find('.js-title').text(
        s.widgetTitle || 'Portfolio Site Locations'
    );
};

// --------------------------------------------------
// Map initialization
// --------------------------------------------------
function initMap() {
    var $el = self.ctx.$widget;
    var container = $el.find('.js-map-canvas')[0];
    if (!container) {
        return;
    }

    // Cleanup if re-initializing
    if (self.map) {
        self.map.remove();
        self.map = null;
    }

    // Initialize map centered on Sri Lanka
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

// --------------------------------------------------
// Data handler - render markers
// --------------------------------------------------
self.onDataUpdated = function () {
    if (!self.map || !self.layerGroup) {
        return;
    }

    var $el = self.ctx.$widget;

    if (!self.ctx.data || self.ctx.data.length === 0) {
        renderEmptyState();
        return;
    }

    // Merge the selected asset datasource and descendant datasource by entity id.
    var sitesMap = {};

    self.ctx.data.forEach(function (dsData) {
        if (!dsData || !dsData.datasource || !dsData.data || dsData.data.length === 0) {
            return;
        }

        var datasource = dsData.datasource;
        var entityKey = getEntityKey(datasource);
        if (!entityKey) {
            return;
        }

        if (!sitesMap[entityKey]) {
            var entityName = datasource.entityName || datasource.name || 'Unknown';
            sitesMap[entityKey] = {
                entityKey: entityKey,
                entityId: getEntityIdValue(datasource.entityId),
                entityType: datasource.entityType,
                entityName: entityName,
                profileName: datasource.entityProfileName || '',
                name: entityName
            };
        }

        var site = sitesMap[entityKey];
        var latestData = dsData.data[0][1];

        if (!site.profileName && datasource.entityProfileName) {
            site.profileName = datasource.entityProfileName;
        }

        if (matchesAnyKey(dsData.dataKey, KEY_ALIASES.lat)) {
            site.lat = latestData;
        } else if (matchesAnyKey(dsData.dataKey, KEY_ALIASES.lon)) {
            site.lon = latestData;
        } else if (matchesAnyKey(dsData.dataKey, KEY_ALIASES.capacity)) {
            var capacity = parseFloat(latestData);
            if (!isNaN(capacity)) {
                site.capacity = capacity;
            }
        } else if (matchesAnyKey(dsData.dataKey, KEY_ALIASES.name)) {
            site.name = latestData || site.name;
        } else if (matchesAnyKey(dsData.dataKey, KEY_ALIASES.status)) {
            site.status = latestData;
        } else if (matchesAnyKey(dsData.dataKey, KEY_ALIASES.rarLkr)) {
            var rarValue = parseFloat(latestData);
            if (!isNaN(rarValue)) {
                site.rar_lkr = rarValue;
            }
        } else if (matchesAnyKey(dsData.dataKey, KEY_ALIASES.cfStatus)) {
            site.cf_status = latestData;
        }
    });

    var targetProfilesStr = self.ctx.settings.targetAssetProfiles;
    var targetProfiles = [];
    if (targetProfilesStr && targetProfilesStr.trim() !== '') {
        targetProfiles = targetProfilesStr.split(',').map(function (profile) {
            return normalizeProfile(profile);
        });
    }

    var useDuckTyping = self.ctx.settings.strictDuckTyping !== false;

    var sites = Object.keys(sitesMap).map(function (key) {
        return sitesMap[key];
    }).filter(function (site) {
        var lat = parseFloat(site.lat);
        var lon = parseFloat(site.lon);

        if (isNaN(lat) || isNaN(lon)) {
            return false;
        }

        if (useDuckTyping && (site.capacity === undefined || isNaN(site.capacity))) {
            return false;
        }

        if (targetProfiles.length > 0) {
            var profileName = normalizeProfile(site.profileName);
            if (!profileName || targetProfiles.indexOf(profileName) === -1) {
                return false;
            }
        }

        return true;
    });

    self.layerGroup.clearLayers();

    if (sites.length === 0) {
        renderEmptyState();
        return;
    }

    var countOk = 0;
    var countWarn = 0;
    var countFault = 0;

    var $card = $el.find('.map-card');
    var cardFont = parseFloat($card.css('font-size')) || 14;
    var scaleFactor = cardFont / 14;

    var bounds = [];
    var displayUnit = (self.ctx.settings.capacityUnit || 'MW').trim();

    sites.forEach(function (site) {
        var lat = parseFloat(site.lat);
        var lon = parseFloat(site.lon);
        if (isNaN(lat) || isNaN(lon)) {
            return;
        }

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

    if (self.ctx.detectChanges) {
        self.ctx.detectChanges();
    }
};

// --------------------------------------------------
// Responsive scaling
// --------------------------------------------------
self.onResize = function () {
    var $el = self.ctx.$widget;
    var $card = $el.find('.map-card');
    var w = $el.width();
    var h = $el.height();

    var fromWidth = w / 30;
    var fromHeight = h / 16;
    var fontSize = Math.min(fromWidth, fromHeight);
    if (fontSize < 8) {
        fontSize = 8;
    }
    if (fontSize > 20) {
        fontSize = 20;
    }
    $card.css('font-size', fontSize + 'px');

    if (self.map) {
        self.map.invalidateSize();
    }
};

// --------------------------------------------------
// Cleanup
// --------------------------------------------------
self.onDestroy = function () {
    if (self.map) {
        self.map.remove();
        self.map = null;
    }
    self.layerGroup = null;
};
