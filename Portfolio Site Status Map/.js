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
        script.onload = function () { startWidget(); };
        document.head.appendChild(script);
    } else {
        startWidget();
    }
};

function startWidget() {
    self.updateDom();
    // Delay map init to ensure container has rendered dimensions
    setTimeout(initMap, 150);
}

// --------------------------------------------------
//  DOM setup
// --------------------------------------------------
self.updateDom = function () {
    var s = self.ctx.settings;
    self.ctx.$widget.find('.js-title').text(
        s.widgetTitle || 'Portfolio Site Locations'
    );
};

// --------------------------------------------------
//  Map initialization
// --------------------------------------------------
function initMap() {
    var $el = self.ctx.$widget;
    var container = $el.find('.js-map-canvas')[0];
    if (!container) return;

    // Cleanup if re-initializing
    if (self.map) {
        self.map.remove();
        self.map = null;
    }

    // Initialize map — centered on Sri Lanka
    self.map = L.map(container, {
        center: [7.87, 80.70],
        zoom: 7,
        zoomControl: true,
        attributionControl: false,
        preferCanvas: true  // better perf for many markers
    });

    // Dark tile layer (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(self.map);

    // Move zoom control to top-right
    self.map.zoomControl.setPosition('topright');

    self.layerGroup = L.layerGroup().addTo(self.map);

    // Load initial data
    self.onDataUpdated();
}

// --------------------------------------------------
//  Data handler — render markers
// --------------------------------------------------
self.onDataUpdated = function () {
    if (!self.map || !self.layerGroup) return;

    var $el = self.ctx.$widget;

    // 1. Safety check
    if (!self.ctx.data || self.ctx.data.length === 0 ||
        !self.ctx.data[0].data || self.ctx.data[0].data.length === 0) {
        return;
    }

    // 2. Parse JSON
    var rawJson = self.ctx.data[0].data[0][1];
    var sites = [];
    try {
        sites = (typeof rawJson === 'string') ? JSON.parse(rawJson) : rawJson;
    } catch (e) {
        console.error('Map JSON Error', e);
        return;
    }

    if (!Array.isArray(sites) || sites.length === 0) return;

    // 3. Clear old markers
    self.layerGroup.clearLayers();

    // 4. Track stats
    var countOk = 0;
    var countWarn = 0;
    var countFault = 0;

    // 5. Get current card font-size for scaling marker radii
    var $card = $el.find('.map-card');
    var cardFont = parseFloat($card.css('font-size')) || 14;
    var scaleFactor = cardFont / 14; // normalize to base 14px

    // 6. Render markers
    var bounds = [];

    sites.forEach(function (site) {
        // Validate coordinates
        var lat = parseFloat(site.lat);
        var lon = parseFloat(site.lon);
        if (isNaN(lat) || isNaN(lon)) return;

        // Radius based on capacity
        var baseRadius = 6;
        var cap = site.capacity_mw || 0;
        if (cap > 50) baseRadius = 12;
        else if (cap > 10) baseRadius = 9;
        var radius = Math.max(4, baseRadius * scaleFactor);

        // Color based on status
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

        // Create marker
        var marker = L.circleMarker([lat, lon], {
            radius: radius,
            fillColor: color,
            color: '#FFFFFF',
            weight: 1.5,
            opacity: 0.9,
            fillOpacity: 0.75
        });

        // Build tooltip HTML
        var name = site.name || 'Unknown';
        var capText = (cap || 0) + ' MW';
        var statusText = '<span style="color:' + color + '; text-transform:uppercase; font-weight:600;">' + status + '</span>';

        var tooltipHtml =
            '<div class="tt-name">' + name + '</div>' +
            '<div class="tt-detail">' + capText + ' &nbsp;|&nbsp; ' + statusText + '</div>';

        // Revenue-at-Risk line
        if (site.rar_lkr && site.rar_lkr > 0) {
            var rarM = (site.rar_lkr / 1000000).toFixed(2);
            tooltipHtml += '<div class="tt-rar">RaR: ' + rarM + ' M LKR</div>';
        }

        // CF status line (if available)
        if (site.cf_status) {
            var cfColor = site.cf_status === 'Warning' ? '#FFC107' : '#66BB6A';
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

    // 7. Auto-fit map to markers if we have data
    if (bounds.length > 1) {
        self.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 10 });
    }

    // 8. Update header stats
    var statsHtml =
        '<span class="stat-ok">' + countOk + '</span> · ' +
        '<span class="stat-warn">' + countWarn + '</span> · ' +
        '<span class="stat-fault">' + countFault + '</span>';
    $el.find('.js-stats').html(statsHtml);

    // 9. Angular change detection
    if (self.ctx.detectChanges) {
        self.ctx.detectChanges();
    }
};

// --------------------------------------------------
//  Responsive scaling
// --------------------------------------------------
self.onResize = function () {
    var $el = self.ctx.$widget;
    var $card = $el.find('.map-card');
    var w = $el.width();
    var h = $el.height();

    // Card font drives legend sizes, header sizes, dot sizes
    var fromWidth = w / 30;
    var fromHeight = h / 16;
    var fontSize = Math.min(fromWidth, fromHeight);
    if (fontSize < 8) fontSize = 8;
    if (fontSize > 20) fontSize = 20;
    $card.css('font-size', fontSize + 'px');

    // Invalidate map size
    if (self.map) {
        self.map.invalidateSize();
    }
};

// --------------------------------------------------
//  Cleanup
// --------------------------------------------------
self.onDestroy = function () {
    if (self.map) {
        self.map.remove();
        self.map = null;
    }
    self.layerGroup = null;
};