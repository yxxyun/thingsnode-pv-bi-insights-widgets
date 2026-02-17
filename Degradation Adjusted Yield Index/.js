// ════════════════════════════════════════════════════
// Degradation Adjusted Yield Index
// ThingsBoard v4.3.0 PE | Time Series
// Requires: Chart.js + chartjs-adapter-date-fns
// ════════════════════════════════════════════════════

var myChart = null;
var baseFontSize = 16;

self.onInit = function () {
    self.ctx.settings = self.ctx.settings || {};
    self.ctx.$widget = self.ctx.$container;

    initChart();
    self.onResize();
    self.onDataUpdated();
};

// ──────────────────────────────────────────────────
//  DOM setup & Chart.js initialisation
// ──────────────────────────────────────────────────
function initChart() {
    var $el = self.ctx.$widget;
    var s = self.ctx.settings;

    // Title
    $el.find('.js-title').text(s.widgetTitle || 'DEGRADATION ADJUSTED YIELD INDEX');

    // Tooltip (static override)
    if (s.tooltipText) {
        $el.find('.js-tooltip').text(s.tooltipText);
    }

    // Settings
    var greenThr = (s.greenThreshold !== undefined) ? parseFloat(s.greenThreshold) : 99.5;
    var yellowThr = (s.yellowThreshold !== undefined) ? parseFloat(s.yellowThreshold) : 98.0;
    var yMin = (s.yAxisMin !== undefined) ? parseFloat(s.yAxisMin) : 90;
    var yMax = (s.yAxisMax !== undefined) ? parseFloat(s.yAxisMax) : 100.5;
    var lineColor = s.accentColor || '#06F5FF';

    // Store for reuse in onDataUpdated
    self._cfg = {
        greenThr: greenThr,
        yellowThr: yellowThr,
        yMin: yMin,
        yMax: yMax,
        lineColor: lineColor,
        decimals: (s.decimals !== undefined) ? parseInt(s.decimals) : 1
    };

    // ── Canvas ──
    var canvasEl = $el.find('.js-canvas')[0];
    if (!canvasEl) return;
    var ctx = canvasEl.getContext('2d');

    // ── Background Zones Plugin ──
    var backgroundZonesPlugin = {
        id: 'backgroundZones',
        beforeDraw: function (chart) {
            var cCtx = chart.ctx;
            var area = chart.chartArea;
            if (!area) return;
            var yScale = chart.scales.y;
            var top = area.top;
            var bottom = area.bottom;
            var left = area.left;
            var right = area.right;

            function getPy(val) {
                var py = yScale.getPixelForValue(val);
                return Math.max(top, Math.min(bottom, py));
            }

            cCtx.save();

            // Green zone (above green threshold)
            var greenY = getPy(greenThr);
            cCtx.fillStyle = 'rgba(102, 187, 106, 0.10)';
            cCtx.fillRect(left, top, right - left, greenY - top);

            // Yellow zone (between thresholds)
            var yellowY = getPy(yellowThr);
            cCtx.fillStyle = 'rgba(255, 193, 7, 0.10)';
            cCtx.fillRect(left, greenY, right - left, yellowY - greenY);

            // Red zone (below yellow threshold)
            cCtx.fillStyle = 'rgba(255, 82, 82, 0.08)';
            cCtx.fillRect(left, yellowY, right - left, bottom - yellowY);

            // Threshold lines
            cCtx.lineWidth = 1;
            cCtx.setLineDash([4, 4]);

            cCtx.strokeStyle = 'rgba(102, 187, 106, 0.5)';
            cCtx.beginPath();
            cCtx.moveTo(left, greenY);
            cCtx.lineTo(right, greenY);
            cCtx.stroke();

            cCtx.strokeStyle = 'rgba(255, 193, 7, 0.5)';
            cCtx.beginPath();
            cCtx.moveTo(left, yellowY);
            cCtx.lineTo(right, yellowY);
            cCtx.stroke();

            cCtx.setLineDash([]);
            cCtx.restore();
        }
    };

    // ── Crosshair Plugin ──
    var crosshairPlugin = {
        id: 'crosshair',
        afterDraw: function (chart) {
            if (chart.tooltip && chart.tooltip._active && chart.tooltip._active.length) {
                var activePoint = chart.tooltip._active[0];
                var x = activePoint.element.x;
                var yAxis = chart.scales.y;
                var cCtx = chart.ctx;
                cCtx.save();
                cCtx.beginPath();
                cCtx.moveTo(x, yAxis.top);
                cCtx.lineTo(x, yAxis.bottom);
                cCtx.lineWidth = 1;
                cCtx.strokeStyle = 'rgba(6, 245, 255, 0.25)';
                cCtx.setLineDash([3, 3]);
                cCtx.stroke();
                cCtx.setLineDash([]);
                cCtx.restore();
            }
        }
    };

    // ── Chart Configuration ──
    var decimals = self._cfg.decimals;

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Yield Index',
                data: [],
                borderColor: lineColor,
                borderWidth: 2.5,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: lineColor,
                pointHoverBorderColor: '#FFFFFF',
                pointHoverBorderWidth: 2,
                fill: false,
                tension: 0.15,
                spanGaps: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            layout: {
                padding: { top: 2, right: 4, bottom: 0, left: 0 }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'year',
                        displayFormats: { year: 'yyyy', month: 'MMM yyyy' }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.04)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#90A4AE',
                        font: { size: 10, family: 'Roboto, sans-serif' },
                        maxRotation: 0
                    }
                },
                y: {
                    min: yMin,
                    max: yMax,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.04)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#90A4AE',
                        font: { size: 10, family: 'Roboto, sans-serif' },
                        callback: function (val) { return val + '%'; }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(2, 10, 67, 0.95)',
                    titleColor: '#90A4AE',
                    bodyColor: '#FFFFFF',
                    bodyFont: { weight: '700', family: 'Roboto, sans-serif' },
                    borderColor: 'rgba(6, 245, 255, 0.3)',
                    borderWidth: 1,
                    cornerRadius: 4,
                    padding: { top: 6, right: 10, bottom: 6, left: 10 },
                    displayColors: false,
                    callbacks: {
                        title: function (items) {
                            if (items.length > 0) {
                                var d = new Date(items[0].parsed.x);
                                return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                            }
                            return '';
                        },
                        label: function (context) {
                            return 'Yield: ' + context.parsed.y.toFixed(decimals) + '%';
                        }
                    }
                }
            }
        },
        plugins: [backgroundZonesPlugin, crosshairPlugin]
    });
}

// ──────────────────────────────────────────────────
//  Data handler
// ──────────────────────────────────────────────────
self.onDataUpdated = function () {
    if (!myChart) return;

    var $el = self.ctx.$widget;
    var cfg = self._cfg || {};
    var decimals = cfg.decimals || 1;
    var greenThr = cfg.greenThr || 99.5;
    var yellowThr = cfg.yellowThr || 98.0;

    // DOM caches
    var $currentVal = $el.find('.js-current-val');
    var $changeVal = $el.find('.js-change-val');
    var $minVal = $el.find('.js-min-val');
    var $statusDot = $el.find('.js-status-dot');
    var $statusText = $el.find('.js-status-text');
    var $tooltip = $el.find('.js-tooltip');

    // ── Level 1: Data existence ──
    if (!self.ctx.data || self.ctx.data.length === 0 ||
        !self.ctx.data[0].data || self.ctx.data[0].data.length === 0) {
        showPlaceholders();
        return;
    }

    // ── Level 2: Parse data ──
    var rawData = self.ctx.data[0].data;
    var chartData = [];
    var values = [];

    for (var i = 0; i < rawData.length; i++) {
        var ts = rawData[i][0];
        var val = parseFloat(rawData[i][1]);
        if (!isNaN(val)) {
            chartData.push({ x: ts, y: val });
            values.push(val);
        }
    }

    if (chartData.length === 0) {
        showPlaceholders();
        return;
    }

    // ── Level 3: Update chart ──
    myChart.data.datasets[0].data = chartData;
    myChart.update('none');

    // ── Footer metrics ──
    var latest = values[values.length - 1];
    var first = values[0];
    var minVal = Math.min.apply(null, values);
    var change = latest - first;

    // Current value
    $currentVal.text(latest.toFixed(decimals) + '%').removeClass('skeleton');
    applyStatusClass($currentVal, latest, greenThr, yellowThr);

    // Change (delta)
    var changeArrow = change >= 0 ? '▲' : '▼';
    var changeSign = change >= 0 ? '+' : '';
    $changeVal.text(changeArrow + ' ' + changeSign + change.toFixed(decimals) + '%').removeClass('skeleton');
    if (change >= 0) {
        $changeVal.removeClass('warn critical').addClass('good');
    } else if (change > -1) {
        $changeVal.removeClass('good critical').addClass('warn');
    } else {
        $changeVal.removeClass('good warn').addClass('critical');
    }

    // Low
    $minVal.text(minVal.toFixed(decimals) + '%').removeClass('skeleton');
    applyStatusClass($minVal, minVal, greenThr, yellowThr);

    // ── Status badge ──
    var statusClass, statusLabel;
    if (latest >= greenThr) {
        statusClass = 'good';
        statusLabel = 'ON TRACK';
    } else if (latest >= yellowThr) {
        statusClass = 'warning';
        statusLabel = 'WARNING';
    } else {
        statusClass = 'critical';
        statusLabel = 'CRITICAL';
    }
    $statusDot.removeClass('good warning critical').addClass(statusClass);
    $statusText.text(statusLabel);

    // ── Dynamic tooltip ──
    if (!self.ctx.settings.tooltipText) {
        var tip;
        if (latest >= greenThr) {
            tip = 'On Track: Yield index at ' + latest.toFixed(decimals) +
                '% is within the target zone (>' + greenThr + '%). ' +
                'Period change: ' + changeSign + change.toFixed(decimals) + ' pp.';
        } else if (latest >= yellowThr) {
            tip = 'Warning: Yield index at ' + latest.toFixed(decimals) +
                '% has dipped below the ' + greenThr + '% target. ' +
                'Monitor panel degradation and soiling losses.';
        } else {
            tip = 'Critical: Yield index at ' + latest.toFixed(decimals) +
                '% is below the ' + yellowThr + '% threshold. ' +
                'Investigate equipment faults, inverter clipping, or abnormal degradation.';
        }
        $tooltip.text(tip);
    }

    // ── Angular change detection ──
    if (self.ctx.detectChanges) {
        self.ctx.detectChanges();
    }

    // ── Helpers ──
    function applyStatusClass($elem, val, gThr, yThr) {
        $elem.removeClass('good warn critical');
        if (val >= gThr) {
            $elem.addClass('good');
        } else if (val >= yThr) {
            $elem.addClass('warn');
        } else {
            $elem.addClass('critical');
        }
    }

    function showPlaceholders() {
        $currentVal.text('--%');
        $changeVal.text('--');
        $minVal.text('--%');
        $statusDot.removeClass('good warning critical');
        $statusText.text('--');
    }
};

// ──────────────────────────────────────────────────
//  Responsive font scaling (em-budget + chart fonts)
// ──────────────────────────────────────────────────
self.onResize = function () {
    var $el = self.ctx.$widget;
    var $card = $el.find('.dayi-card');
    var h = $el.height();
    var w = $el.width();

    // Em budget (vertical):
    //   header(0.65) + gap(0.15) + chart(flex:1, min ~4em) +
    //   gap(0.15) + footer(0.7) + padding(0.9)
    //   ≈ 6.55 em total fixed chrome
    var fromHeight = (h - 8) / 7.0;

    // Em budget (horizontal):
    //   padding(1.2) + chart needs ~10em minimum
    //   ≈ 14 em
    var fromWidth = w / 14;

    baseFontSize = Math.min(fromHeight, fromWidth);
    if (baseFontSize < 8) baseFontSize = 8;
    if (baseFontSize > 28) baseFontSize = 28;

    $card.css('font-size', baseFontSize + 'px');

    // ── Scale Chart.js fonts proportionally ──
    if (myChart) {
        var tickFont = Math.max(8, Math.min(14, baseFontSize * 0.5));

        myChart.options.scales.x.ticks.font.size = tickFont;
        myChart.options.scales.y.ticks.font.size = tickFont;
        myChart.resize();
    }
};

// ──────────────────────────────────────────────────
//  Cleanup
// ──────────────────────────────────────────────────
self.onDestroy = function () {
    if (myChart) {
        myChart.destroy();
        myChart = null;
    }
};
