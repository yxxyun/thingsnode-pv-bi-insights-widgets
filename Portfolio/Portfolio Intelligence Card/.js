// ============================================
// Portfolio Intelligence Card
// ThingsBoard v4.3.0 PE | Latest Values
// ============================================

self.onInit = function () {
    self.ctx.settings = self.ctx.settings || {};
    self.ctx.$widget = self.ctx.$container;
    self.updateDom();
    self.onResize();
    self.onDataUpdated();
};

// --------------------------------------------------
//  DOM setup — mode switching, titles, labels
// --------------------------------------------------
self.updateDom = function () {
    var $el = self.ctx.$widget;
    var s = self.ctx.settings;
    var mode = s.cardMode || 'standard';

    var $card = $el.find('.portfolio-card');

    // Title, unit, tooltip
    $el.find('.js-title').text(s.cardTitle || 'Metric Title');
    $el.find('.js-unit').text(s.unit || '');
    $el.find('.js-tooltip').text(s.tooltipText || '');

    // Reset mode classes & hide all sub-content
    $card.removeClass('mode-risk mode-diversity');
    $el.find('.js-delta, .js-exposure, .js-diversity').hide();

    if (mode === 'risk') {
        $card.addClass('mode-risk');
        $el.find('.js-exposure').css('display', 'flex');
        $el.find('.js-exposure-text').text(s.riskLabel || 'Exposure');

    } else if (mode === 'diversity') {
        $card.addClass('mode-diversity');
        $el.find('.js-diversity').css('display', 'flex');
        $el.find('.js-range-text').text(s.rangeLabel || 'Optimal Range: >0.7');

    } else {
        // Standard
        $el.find('.js-delta').css('display', 'flex');
        $el.find('.js-delta-label').text(s.deltaLabel || 'vs Target');
    }
};

// --------------------------------------------------
//  Data handler — value, delta, bar
// --------------------------------------------------
self.onDataUpdated = function () {
    var $el = self.ctx.$widget;
    var s = self.ctx.settings;
    var mode = s.cardMode || 'standard';

    var $valEl = $el.find('.js-value');

    // 1. Data safety check
    if (!self.ctx.data || self.ctx.data.length === 0 ||
        !self.ctx.data[0].data || self.ctx.data[0].data.length === 0) {
        $valEl.text('--');
        return;
    }

    var rawVal = self.ctx.data[0].data[0][1];

    // 2. NaN / null protection
    if (rawVal === null || rawVal === undefined || isNaN(parseFloat(rawVal))) {
        $valEl.text('--');
        return;
    }

    var val = parseFloat(rawVal);
    var divider = s.divider || 1;
    var displayVal = val / divider;

    // 3. Format main value
    var decimals = (s.decimals !== undefined) ? s.decimals : 1;
    var formatted = displayVal.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });

    $valEl.text(formatted);
    $valEl.removeClass('skeleton');

    // 4. Mode-specific sub-content
    if (mode === 'standard') {
        // Delta vs target (data series [1])
        if (self.ctx.data.length > 1 &&
            self.ctx.data[1].data && self.ctx.data[1].data.length > 0) {

            var targetRaw = self.ctx.data[1].data[0][1];
            if (targetRaw !== null && targetRaw !== undefined && !isNaN(parseFloat(targetRaw))) {
                var target = parseFloat(targetRaw);
                if (target > 0) {
                    var diff = val - target;
                    var pct = (diff / target) * 100;

                    var $delta = $el.find('.js-delta');
                    $el.find('.js-delta-value').text(Math.abs(pct).toFixed(1) + '%');

                    if (pct >= 0) {
                        $delta.removeClass('negative');
                        $el.find('.js-delta-arrow').text('▲');
                    } else {
                        $delta.addClass('negative');
                        $el.find('.js-delta-arrow').text('▼');
                    }
                }
            }
        }

    } else if (mode === 'diversity') {
        var ratio = val;
        if (ratio > 1) ratio = 1;
        if (ratio < 0) ratio = 0;

        var pctWidth = ratio * 100;
        var barText = 'Low Diversity';
        if (ratio > 0.7) barText = 'High Diversity';
        else if (ratio > 0.4) barText = 'Moderate';

        var $fill = $el.find('.js-bar-fill');
        $fill.css('width', pctWidth + '%');
        $el.find('.js-bar-text').text(barText);

        // Color by threshold
        if (ratio < 0.4) $fill.css('background', '#FF5252');
        else if (ratio < 0.7) $fill.css('background', '#FFC107');
        else $fill.css('background', 'linear-gradient(90deg, #66BB6A 0%, #43A047 100%)');
    }

    // 5. Angular change detection
    if (self.ctx.detectChanges) {
        self.ctx.detectChanges();
    }
};

// --------------------------------------------------
//  Responsive font scaling
// --------------------------------------------------
self.onResize = function () {
    var $el = self.ctx.$widget;
    var $card = $el.find('.portfolio-card');
    var h = $el.height();
    var w = $el.width();

    // Em budget: title(0.7) + value(2.0) + sub(0.65) + padding(1.0) ≈ 4.35em
    var fromHeight = (h - 6) / 4.35;

    // Width: value + unit + padding ≈ 5em minimum
    var fromWidth = w / 8;

    var fontSize = Math.min(fromHeight, fromWidth);

    // Clamp
    if (fontSize < 8) fontSize = 8;
    if (fontSize > 36) fontSize = 36;

    $card.css('font-size', fontSize + 'px');
};

self.onDestroy = function () {
};