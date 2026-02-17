// ════════════════════════════════════════════════════
// Revenue-at-Risk Breakdown Widget
// ThingsBoard v4.3.0 PE | Latest Values
// Production standard — matches Loss Attribution Card
// ════════════════════════════════════════════════════

self.onInit = function () {
    self.ctx.settings = self.ctx.settings || {};
    self.ctx.$widget = self.ctx.$container;

    self.updateDom();
    self.onResize();
    self.onDataUpdated();
};

// ──────────────────────────────────────────────────
//  DOM setup — title, footer, tooltip
// ──────────────────────────────────────────────────
self.updateDom = function () {
    var s = self.ctx.settings;
    var $el = self.ctx.$widget;

    $el.find('.js-title').text(s.cardTitle || 'REVENUE-AT-RISK BREAKDOWN');
    $el.find('.js-footer-text').text(s.footerLabel || 'Potential Revenue Impact · All Categories');
    $el.find('.js-time-horizon').text(s.timeHorizon || 'Annual Forecast');
    $el.find('.js-resolution').text((s.resolution || 'Portfolio').toUpperCase());

    if (s.tooltipText) {
        $el.find('.js-tooltip').text(s.tooltipText);
    }
};

// ──────────────────────────────────────────────────
//  Data handler — segments, totals, severity
// ──────────────────────────────────────────────────
self.onDataUpdated = function () {
    var s = self.ctx.settings;
    var $el = self.ctx.$widget;
    var $card = $el.find('.rar-card');
    var $track = $el.find('.js-bar-track');
    var $totalVal = $el.find('.js-total-val');
    var $tooltip = $el.find('.js-tooltip');

    // 1. GATHER DATA
    var vFault = parseFloat(s.val_fault || 125);
    var vCurtail = parseFloat(s.val_curtail || 210);
    var vSoiling = parseFloat(s.val_soiling || 85);
    var vDegrad = parseFloat(s.val_degrad || 40);
    var vLid = parseFloat(s.val_lid || 0);
    var vMismatch = parseFloat(s.val_mismatch || 0);
    var vWiring = parseFloat(s.val_wiring || 0);

    // 2. LOGICAL GROUPING
    var finalDegrad = vDegrad + vLid + vMismatch;
    var finalElect = vWiring;

    // 3. DEFINE SEGMENTS
    var segments = [
        { label: 'Fault Loss', val: vFault, cls: 'bg-fault' },
        { label: 'Soiling', val: vSoiling, cls: 'bg-soiling' },
        { label: 'Curtailment', val: vCurtail, cls: 'bg-curtail' },
        { label: 'Degradation', val: finalDegrad, cls: 'bg-degrad' },
        { label: 'Electrical', val: finalElect, cls: 'bg-elect' }
    ];

    // 4. CALCULATE TOTAL & FORMAT
    var total = 0;
    for (var i = 0; i < segments.length; i++) {
        total += segments[i].val;
    }
    var safeTotal = total > 0 ? total : 1;
    var currency = s.currency || '$';
    var spacer = currency.length > 1 ? ' ' : '';

    // 5. GENERATE BAR HTML (with percentages + title tooltips)
    $track.empty();
    var displayUnit = s.displayUnit || '';

    for (var j = 0; j < segments.length; j++) {
        var seg = segments[j];
        if (seg.val <= 0) continue;

        var widthPct = (seg.val / safeTotal) * 100;
        var pctStr = Math.round(widthPct) + '%';
        var hideLabel = widthPct < 12 ? ' style="display:none"' : '';
        var titleAttr = seg.label + ': ' + currency + spacer + autoScale(seg.val, 0) + displayUnit + ' (' + pctStr + ')';

        var html = '<div class="segment ' + seg.cls + '" style="width:' + widthPct.toFixed(1) + '%" title="' + titleAttr + '">' +
            '<div class="seg-content"' + hideLabel + '>' +
            '<span class="seg-label">' + seg.label + '</span>' +
            '<span class="seg-val">' + currency + spacer + autoScale(seg.val, 0) + displayUnit + ' (' + pctStr + ')</span>' +
            '</div>' +
            '</div>';
        $track.append(html);
    }

    // 6. UPDATE TOTAL VALUE
    $totalVal.text(currency + spacer + autoScale(total, 0) + displayUnit);
    $totalVal.removeClass('skeleton');

    // 7. SEVERITY EVALUATION — unified with Risk Summary Panel
    var sevClass, sevLabel;

    // Strategy 1: Read from telemetry (risk_alert_level) if available
    var severityFromTelemetry = false;
    if (self.ctx.data) {
        for (var di = 0; di < self.ctx.data.length; di++) {
            if (self.ctx.data[di] && self.ctx.data[di].data && self.ctx.data[di].data.length > 0) {
                var rawAlert = String(self.ctx.data[di].data[0][1]);
                if (rawAlert && rawAlert.length > 0) {
                    var lowerAlert = rawAlert.toLowerCase();
                    if (lowerAlert.indexOf('risk') >= 0 || lowerAlert.indexOf('critical') >= 0 || lowerAlert.indexOf('alarm') >= 0) {
                        sevClass = 'sev-critical';
                        sevLabel = 'HIGH';
                        severityFromTelemetry = true;
                    } else if (lowerAlert.indexOf('warning') >= 0 || lowerAlert.indexOf('check') >= 0 || lowerAlert.indexOf('high') >= 0) {
                        sevClass = 'sev-warning';
                        sevLabel = 'MODERATE';
                        severityFromTelemetry = true;
                    } else if (lowerAlert.indexOf('normal') >= 0 || lowerAlert.indexOf('good') >= 0 || lowerAlert.indexOf('safe') >= 0 || lowerAlert.indexOf('compliant') >= 0) {
                        sevClass = 'sev-good';
                        sevLabel = 'LOW';
                        severityFromTelemetry = true;
                    }
                    if (severityFromTelemetry) break;
                }
            }
        }
    }

    // Strategy 2: Fall back to threshold-based calculation
    if (!severityFromTelemetry) {
        var sevMed = (s.severityMedium !== undefined) ? parseFloat(s.severityMedium) : 300;
        var sevHigh = (s.severityHigh !== undefined) ? parseFloat(s.severityHigh) : 500;

        if (total < sevMed) {
            sevClass = 'sev-good';
            sevLabel = 'LOW';
        } else if (total < sevHigh) {
            sevClass = 'sev-warning';
            sevLabel = 'MODERATE';
        } else {
            sevClass = 'sev-critical';
            sevLabel = 'HIGH';
        }
    }

    // Update card accent based on severity
    $card.removeClass('sev-good sev-warning sev-critical').addClass(sevClass);

    // 8. DYNAMIC TOOLTIP
    if (!s.tooltipText) {
        var tipParts = [];
        for (var k = 0; k < segments.length; k++) {
            if (segments[k].val > 0) {
                var segPct = Math.round((segments[k].val / safeTotal) * 100);
                tipParts.push(segments[k].label + ': ' + currency + spacer + autoScale(segments[k].val, 0) + displayUnit + ' (' + segPct + '%)');
            }
        }
        $tooltip.text('Breakdown — ' + tipParts.join(' · ') + '. Total: ' + currency + spacer + autoScale(total, 0) + displayUnit + '. Severity: ' + sevLabel + '.');
    }

    // 9. Angular change detection
    if (self.ctx.detectChanges) {
        self.ctx.detectChanges();
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
    var $card = $el.find('.rar-card');
    var h = $el.height();
    var w = $el.width();
    var ratio = w / (h || 1);

    // Wide mode: aspect ratio > 3:1
    if (ratio > 3) {
        $card.addClass('wide');
        // Wide em-budget — everything compressed:
        //   header(0.55) + bar(1.6) + ticks(0.4) + total(0.65) +
        //   footer(0.4) + padding(0.5) + gaps(0.15) ≈ 4.25
        var fromHeight = (h - 4) / 6.8;
        var fromWidth = w / 40;
    } else {
        $card.removeClass('wide');
        // Normal em-budget (no legend, ticks replace it):
        //   header(0.75) + gap(0.15) + bar(2.8) + ticks(0.6) +
        //   total(0.85) + gap(0.3) + footer(0.6) + padding(0.9)
        //   ≈ 6.95 → use 6.2
        var fromHeight = (h - 8) / 6.2;
        var fromWidth = w / 12;
    }

    var fontSize = Math.min(fromHeight, fromWidth);

    // Clamp
    if (fontSize < 10) fontSize = 10;
    if (fontSize > 32) fontSize = 32;

    $card.css('font-size', fontSize + 'px');
};

self.onDestroy = function () {
};