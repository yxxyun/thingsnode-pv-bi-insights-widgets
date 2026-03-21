// ============================================
// Universal Energy KPI Card — Best Merge
// ThingsBoard v4.3.0 PE | Latest Values
// Optimized for ~3:1 (w:h) aspect ratio
// ============================================

self.onInit = function () {
    self.ctx.settings = self.ctx.settings || {};
    self.ctx.$widget = self.ctx.$container;
    self.updateDom();
    self.onResize();
    self.onDataUpdated();
};

// --------------------------------------------------
//  DOM setup — titles & subtitles from settings
// --------------------------------------------------
self.updateDom = function () {
    var $el = self.ctx.$widget;

    var s = self.ctx.settings;
    var mode = s.cardMode || 'custom';

    var configMap = {
        'today': { title: "TODAY'S ENERGY", sub: 'Today' },
        'mtd': { title: 'MTD ENERGY', sub: 'Month-to-Date' },
        'ytd': { title: 'YTD ENERGY', sub: 'Year-to-Date' },
        'life': { title: 'LIFETIME ENERGY', sub: 'Since COD' },
        'custom': { title: 'ENERGY', sub: 'Production' }
    };

    var cfg = configMap[mode] || configMap['custom'];
    var title = s.overrideTitle || cfg.title;
    var sub = s.overrideSub || cfg.sub;

    $el.find('.js-kpi-title').text(title);
    $el.find('.js-kpi-subtitle').text(sub);
};

// --------------------------------------------------
//  Data handler — value formatting & unit scaling
// --------------------------------------------------
self.onDataUpdated = function () {
    var $el = self.ctx.$widget;
    var $valElement = $el.find('.js-kpi-value');
    var $unitElement = $el.find('.js-kpi-unit');
    var s = self.ctx.settings;
    var mode = s.cardMode || 'custom';

    // 1. Data safety check
    if (!self.ctx.data || self.ctx.data.length === 0 ||
        !self.ctx.data[0].data || self.ctx.data[0].data.length === 0) {
        $valElement.text('--');
        return;
    }

    var rawVal = self.ctx.data[0].data[0][1];

    // 2. NaN / null protection
    if (rawVal === null || rawVal === undefined || isNaN(parseFloat(rawVal))) {
        $valElement.text('--');
        return;
    }

    var val = parseFloat(rawVal);

    // 3. Base Conversion (Input -> MWh)
    // We assume the input divider correctly converts raw telemetry to MWh
    var inputDiv = s.inputDivider || 1; 
    var mwhVal = val / inputDiv;

    // 4. Mode-Specific Unit Logic
    var displayVal = mwhVal;
    var displayUnit = 'MWh';
    var autoScale = (s.autoScale !== false);

    if (mode === 'ytd' || mode === 'life') {
        // FORCE GWh for YTD and Lifetime
        displayVal = mwhVal / 1000;
        displayUnit = 'GWh';
    } else {
        // Default Auto-scale behavior for Today/MTD/Custom
        if (autoScale && Math.abs(mwhVal) >= 1000) {
            displayVal = mwhVal / 1000;
            displayUnit = 'GWh';
        }
    }

    // 5. Number formatting
    var decimals = (s.decimals !== undefined) ? s.decimals : 1;

    var formattedVal = displayVal.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });

    // 6. Render
    $valElement.text(formattedVal);
    $valElement.removeClass('skeleton');
    $unitElement.text(displayUnit);

    // 7. Angular change detection
    if (self.ctx.detectChanges) {
        self.ctx.detectChanges();
    }
};

// --------------------------------------------------
//  Responsive font scaling
// --------------------------------------------------
self.onResize = function () {
    var $el = self.ctx.$widget;
    var $card = $el.find('.energy-card');
    var h = $el.height();
    
    // Total em budget:  title(0.7) + value(1.7) + subtitle(0.55) + gaps ≈ 3.2em
    var usableH = h - 10; 
    var baseSize = usableH / 3.2;

    // Clamp
    if (baseSize < 8) baseSize = 8;
    if (baseSize > 40) baseSize = 40;

    $card.css('font-size', baseSize + 'px');
};

self.onDestroy = function () {
};