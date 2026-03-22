// ════════════════════════════════════════════════════
// Loss Attribution Card
// ThingsBoard v4.3.0 PE | Latest Values
// Multi-mode: grid · curtail · revenue · insurance
// ════════════════════════════════════════════════════

self.onInit = function () {
    self.ctx.settings = self.ctx.settings || {};
    self.ctx.$widget = self.ctx.$container;

    // ── Mode icons (SVG) ──
    self._icons = {
        grid: '<svg viewBox="0 0 24 24"><path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z"/></svg>',
        curtail: '<svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
        revenue: '<svg viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>',
        insurance: '<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>'
    };

    // ── Mode defaults ──
    self._modes = {
        grid: {
            title: 'GRID AVAILABILITY IMPACT LOSS',
            sub: 'Due to Grid Outage',
            tooltip: 'Energy lost specifically due to external grid failures preventing export.',
            footer: 'Operational Loss · Grid & Losses',
            isFinancial: false
        },
        curtail: {
            title: 'CURTAILMENT LOSS',
            sub: 'Export Limits Imposed',
            tooltip: 'Energy generated but curtailed due to grid export limitations or dispatch orders.',
            footer: 'Operational Loss · Curtailment',
            isFinancial: false
        },
        revenue: {
            title: 'REVENUE LOSS (POTENTIAL)',
            sub: 'Total Curtailment Value',
            tooltip: 'Estimated financial loss from all non-exported energy, calculated at the PPA tariff rate.',
            footer: 'Financial Loss · Revenue Impact',
            isFinancial: true
        },
        insurance: {
            title: 'INSURANCE CLAIMABLE LOSS',
            sub: 'Eligible Major Events',
            tooltip: 'Portion of revenue loss from qualifying events eligible for insurance claims under the policy.',
            footer: 'Recoverable Loss · Insurance',
            isFinancial: true
        }
    };

    self.updateDom();
    self.onResize();
    self.onDataUpdated();
};

// ──────────────────────────────────────────────────
//  DOM setup — mode, title, icon, labels
// ──────────────────────────────────────────────────
self.updateDom = function () {
    var $el = self.ctx.$widget;
    var s = self.ctx.settings;
    var mode = s.cardMode || 'grid';
    var def = self._modes[mode] || self._modes.grid;

    // Apply mode class
    var $card = $el.find('.loss-card');
    $card.removeClass('mode-grid mode-curtail mode-revenue mode-insurance');
    $card.addClass('mode-' + mode);

    // Icon
    $el.find('.js-icon').html(self._icons[mode] || '');

    // Title & subtitle
    $el.find('.js-title').text(s.customTitle || def.title);
    $el.find('.js-sub').text(s.customSub || def.sub);

    // Footer label
    $el.find('.js-footer-label').text(def.footer);

    // Tooltip (static override or default)
    if (s.tooltipText) {
        $el.find('.js-tooltip').text(s.tooltipText);
    } else {
        $el.find('.js-tooltip').text(def.tooltip);
    }
};

// ──────────────────────────────────────────────────
//  Data handler
// ──────────────────────────────────────────────────
self.onDataUpdated = function () {
    var $el = self.ctx.$widget;
    var s = self.ctx.settings;
    var mode = s.cardMode || 'grid';
    var def = self._modes[mode] || self._modes.grid;

    var $value = $el.find('.js-value');
    var $statusDot = $el.find('.js-status-dot');
    var $statusText = $el.find('.js-status-text');
    var $tooltip = $el.find('.js-tooltip');

    // ── Level 1: Data existence ──
    if (!self.ctx.data || self.ctx.data.length === 0 ||
        !self.ctx.data[0].data || self.ctx.data[0].data.length === 0) {
        showPlaceholders();
        return;
    }

    // ── Level 2: NaN / null protection ──
    var rawVal = self.ctx.data[0].data[0][1];
    if (rawVal === null || rawVal === undefined || isNaN(parseFloat(rawVal))) {
        showPlaceholders();
        return;
    }

    // ── Level 3: Parse and format ──
    var val = parseFloat(rawVal);
    var decimals = (s.decimals !== undefined) ? parseInt(s.decimals) : 1;
    var formattedText = '';

    if (def.isFinancial) {
        // Currency formatting with auto-scaling
        var currency = s.currencySym || 'LKR';
        formattedText = currency + ' ' + autoScale(val, 0);
    } else {
        // Energy formatting with auto-scaling
        var unit = s.energyUnit || 'MWh';
        formattedText = autoScale(val, decimals) + ' ' + unit;
    }

    $value.text(formattedText).removeClass('skeleton');

    // ── Severity evaluation ──
    var sevMed = (s.severityMedium !== undefined) ? parseFloat(s.severityMedium) : (def.isFinancial ? 50000 : 100);
    var sevHigh = (s.severityHigh !== undefined) ? parseFloat(s.severityHigh) : (def.isFinancial ? 200000 : 500);

    var sevClass, sevLabel;
    if (val < sevMed) {
        sevClass = 'sev-low';
        sevLabel = 'LOW';
    } else if (val < sevHigh) {
        sevClass = 'sev-moderate';
        sevLabel = 'MODERATE';
    } else {
        sevClass = 'sev-high';
        sevLabel = 'HIGH';
    }

    $statusDot.removeClass('sev-low sev-moderate sev-high').addClass(sevClass);
    $statusText.text(sevLabel);

    // ── Dynamic tooltip ──
    if (!s.tooltipText) {
        var tip = def.tooltip + ' Current value: ' + formattedText + '. Severity: ' + sevLabel + '.';
        $tooltip.text(tip);
    }

    // ── Angular change detection ──
    if (self.ctx.detectChanges) {
        self.ctx.detectChanges();
    }

    // ── Helpers ──
    function showPlaceholders() {
        $value.text('--');
        $statusDot.removeClass('sev-low sev-moderate sev-high');
        $statusText.text('--');
    }
};

// ──────────────────────────────────────────────────
//  Auto-scale large numbers (K / M / B)
// ──────────────────────────────────────────────────
function autoScale(val, decimals) {
    var abs = Math.abs(val);
    var steps = [
        { threshold: 1e9, suffix: 'B', divisor: 1e9 },
        { threshold: 1e6, suffix: 'M', divisor: 1e6 },
        { threshold: 1e4, suffix: 'K', divisor: 1e3 },
        { threshold: 0, suffix: '', divisor: 1 }
    ];

    for (var i = 0; i < steps.length; i++) {
        if (abs >= steps[i].threshold) {
            var scaled = val / steps[i].divisor;
            return scaled.toLocaleString('en-US', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }) + steps[i].suffix;
        }
    }
    return val.toFixed(decimals);
}

// ──────────────────────────────────────────────────
//  Responsive font scaling (em-budget algorithm)
// ──────────────────────────────────────────────────
self.onResize = function () {
    var $el = self.ctx.$widget;
    var $card = $el.find('.loss-card');
    var h = $el.height();
    var w = $el.width();

    // Em budget (vertical):
    //   header(0.65) + gap(0.15) + value(1.8) + sub(0.5) +
    //   gap(0.1) + footer(0.42) + padding(0.9)
    //   ≈ 4.52 em → use 5.2 for breathing room
    var fromHeight = (h - 8) / 5.2;

    // Em budget (horizontal):
    //   padding(1.4) + content(~6em min)
    //   ≈ 10 em
    var fromWidth = w / 10;

    var fontSize = Math.min(fromHeight, fromWidth);

    // Clamp
    if (fontSize < 8) fontSize = 8;
    if (fontSize > 32) fontSize = 32;

    $card.css('font-size', fontSize + 'px');
};

self.onDestroy = function () {
};
