// ============================================
// Portfolio Compliance Summary Table
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
//  DOM setup
// --------------------------------------------------
self.updateDom = function () {
    var s = self.ctx.settings;
    self.ctx.$widget.find('#table-title').text(
        s.widgetTitle || 'Portfolio Compliance Summary'
    );
};

// --------------------------------------------------
//  Data handler
// --------------------------------------------------
self.onDataUpdated = function () {
    var $el = self.ctx.$widget;
    var s = self.ctx.settings;

    // 1. Safety check
    if (!self.ctx.data || self.ctx.data.length === 0 ||
        !self.ctx.data[0].data || self.ctx.data[0].data.length === 0) {
        return;
    }

    // 2. Parse JSON
    var rawJson = self.ctx.data[0].data[0][1];
    var dataObj = {};
    try {
        dataObj = (typeof rawJson === 'string') ? JSON.parse(rawJson) : rawJson;
    } catch (e) {
        console.error('JSON Parse Error', e);
        return;
    }

    if (!dataObj.sites) return;

    var currency = s.currency || 'LKR';

    // 3. Sort: At Risk > Warning > Healthy, then by RaR descending
    var sortedSites = dataObj.sites.sort(function (a, b) {
        var scoreA = getRiskScore(a);
        var scoreB = getRiskScore(b);
        if (scoreA !== scoreB) return scoreB - scoreA;
        return b.rar_lkr - a.rar_lkr;
    });

    // 4. Render rows
    var totalCap = 0;
    var totalRaR = 0;
    var $tbody = $el.find('#compliance-body');
    $tbody.empty();

    sortedSites.forEach(function (site) {
        totalCap += site.capacity_mw || 0;
        totalRaR += site.rar_lkr || 0;

        var rowClass = '';
        var cfClass = 'text-healthy';
        var flagClass = 'text-healthy';
        var flagIcon = '✔';

        if (site.compliance_flag === 'At Risk') {
            rowClass = 'row-warning';
            flagClass = 'text-warning';
            flagIcon = '⚠️';
        } else if (site.cf_status === 'Warning') {
            cfClass = 'text-warning';
        }

        var html =
            '<tr class="' + rowClass + '">' +
            '<td style="font-weight:500;">' + (site.name || '--') + '</td>' +
            '<td class="col-center">' + (site.capacity_mw || 0) + ' MW</td>' +
            '<td class="col-center ' + cfClass + '">' + (site.cf_status || '--') + '</td>' +
            '<td class="col-right">' + formatCurrency(site.rar_lkr || 0) + '</td>' +
            '<td class="col-right ' + flagClass + '">' +
            (site.compliance_flag || '--') + ' ' + flagIcon +
            '</td>' +
            '</tr>';
        $tbody.append(html);
    });

    // 5. Footer
    $el.find('#total-cap').text(totalCap + ' MW');
    $el.find('#total-rar').text(formatCurrency(totalRaR) + ' ' + currency);

    var overall = dataObj.overall_status || 'Compliant';
    var overallColor = (overall === 'Compliant')
        ? 'var(--c-healthy)' : 'var(--c-warning)';
    $el.find('#overall-status').text(overall).css('color', overallColor);

    // 6. Angular change detection
    if (self.ctx.detectChanges) {
        self.ctx.detectChanges();
    }
};

// --------------------------------------------------
//  Responsive font scaling
// --------------------------------------------------
self.onResize = function () {
    var $el = self.ctx.$widget;
    var $card = $el.find('.compliance-card');
    var w = $el.width();
    var h = $el.height();

    // Width: 5 columns need ~50em total (labels + padding + gaps)
    var fromWidth = w / 50;

    // Height: title(1em) + header-row(1.5em) + ≥2 data rows(2×2em) + footer(1.5em) + padding ≈ 10em
    var fromHeight = h / 10;

    var fontSize = Math.min(fromWidth, fromHeight);

    // Clamp
    if (fontSize < 7) fontSize = 7;
    if (fontSize > 22) fontSize = 22;

    $card.css('font-size', fontSize + 'px');
};

// --------------------------------------------------
//  Helpers
// --------------------------------------------------
function getRiskScore(site) {
    if (site.compliance_flag === 'At Risk') return 3;
    if (site.status === 'warning' || site.cf_status === 'Warning') return 2;
    return 1;
}

function formatCurrency(val) {
    if (val >= 1000000) {
        return (val / 1000000).toFixed(2) + ' M';
    }
    return val.toLocaleString();
}

self.onDestroy = function () {
};