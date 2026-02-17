// ============================================
// Multi-Site Energy Contribution (YTD)
// ThingsBoard v4.3.0 PE | Latest Values
// ============================================

self.onInit = function () {
    self.ctx.settings = self.ctx.settings || {};
    self.ctx.$widget = self.ctx.$container;
    self.ctx.chart = null;

    // Site colors from settings or defaults
    self.colors = [
        self.ctx.settings.colorSiteA || '#66BB6A',
        self.ctx.settings.colorSiteB || '#06F5FF',
        self.ctx.settings.colorSiteC || '#2979FF',
        self.ctx.settings.colorSiteD || '#AB47BC',
        self.ctx.settings.colorSiteE || '#FF9800'
    ];

    // Load Chart.js if missing
    if (typeof Chart === 'undefined') {
        var script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = function () { startWidget(); };
        document.head.appendChild(script);
    } else {
        startWidget();
    }
};

function startWidget() {
    self.updateDom();
    self.onResize();
    self.onDataUpdated();
}

// --------------------------------------------------
//  DOM setup
// --------------------------------------------------
self.updateDom = function () {
    var s = self.ctx.settings;
    var $el = self.ctx.$widget;
    $el.find('.chart-title').text(
        s.widgetTitle || 'Multi-Site Energy Contribution (YTD)'
    );

    if (!self.ctx.chart && typeof Chart !== 'undefined') {
        initChart();
    }
};

// --------------------------------------------------
//  Chart initialization
// --------------------------------------------------
function initChart() {
    var $el = self.ctx.$widget;
    var canvas = $el.find('canvas')[0];
    if (!canvas) return;

    var ctx = canvas.getContext('2d');

    self.ctx.chart = new Chart(ctx, {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            animation: {
                duration: 600,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#B0BEC5',
                        font: { size: 11, family: 'Roboto', weight: '500' },
                        boxWidth: 10,
                        boxHeight: 10,
                        padding: 12,
                        usePointStyle: true,
                        pointStyle: 'rectRounded'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(2, 10, 67, 0.95)',
                    titleColor: '#FFFFFF',
                    bodyColor: '#FFFFFF',
                    borderColor: 'rgba(6, 245, 255, 0.4)',
                    borderWidth: 1,
                    titleFont: { weight: 'bold', size: 12 },
                    bodyFont: { size: 11 },
                    padding: 10,
                    cornerRadius: 6,
                    callbacks: {
                        label: function (context) {
                            var label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toLocaleString() + ' MWh';
                            }
                            return label;
                        },
                        footer: function (tooltipItems) {
                            var sum = 0;
                            tooltipItems.forEach(function (item) {
                                sum += item.parsed.y || 0;
                            });
                            return '─────────\nTotal: ' + sum.toLocaleString() + ' MWh';
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.04)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#B0BEC5',
                        font: { size: 11, family: 'Roboto' }
                    }
                },
                y: {
                    stacked: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.08)',
                        borderDash: [4, 4],
                        drawBorder: false
                    },
                    ticks: {
                        color: '#B0BEC5',
                        font: { size: 11, family: 'Roboto' },
                        callback: function (value) {
                            if (value >= 1000) {
                                return (value / 1000).toFixed(0) + 'k';
                            }
                            return value;
                        }
                    },
                    title: {
                        display: true,
                        text: 'Energy (MWh)',
                        color: '#90A4AE',
                        font: { size: 11, family: 'Roboto', weight: '500' }
                    }
                }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });
}

// --------------------------------------------------
//  Data handler
// --------------------------------------------------
self.onDataUpdated = function () {
    var $el = self.ctx.$widget;

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

    if (!dataObj.sites || !dataObj.months) return;

    // 3. Build datasets
    var datasets = [];
    var totalYTD = 0;

    dataObj.sites.forEach(function (site, index) {
        var siteTotal = 0;
        for (var i = 0; i < site.data.length; i++) {
            siteTotal += (site.data[i] || 0);
        }
        totalYTD += siteTotal;

        datasets.push({
            label: site.name,
            data: site.data,
            backgroundColor: self.colors[index % self.colors.length],
            borderRadius: 3,
            borderSkipped: false,
            barPercentage: 0.65,
            categoryPercentage: 0.8
        });
    });

    // 4. Update chart
    if (self.ctx.chart) {
        self.ctx.chart.data.labels = dataObj.months;
        self.ctx.chart.data.datasets = datasets;

        if (dataObj.unit && self.ctx.chart.options.scales.y.title) {
            self.ctx.chart.options.scales.y.title.text = 'Energy (' + (dataObj.unit || 'MWh') + ')';
        }

        self.ctx.chart.update('none'); // skip animation on data update
    }

    // 5. Update header total with highlighted value
    var unit = dataObj.unit || 'MWh';
    var formatted = totalYTD.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
    $el.find('.chart-total').html(
        'Total YTD: <span class="total-value">' + formatted + '</span> ' + unit
    );

    // 6. Angular change detection
    if (self.ctx.detectChanges) {
        self.ctx.detectChanges();
    }
};

// --------------------------------------------------
//  Responsive font / chart scaling
// --------------------------------------------------
self.onResize = function () {
    var $el = self.ctx.$widget;
    var $card = $el.find('.energy-chart-card');
    var w = $el.width();
    var h = $el.height();

    // Card font: drives title, total, padding
    var fromWidth = w / 28;
    var fromHeight = h / 12;
    var fontSize = Math.min(fromWidth, fromHeight);
    if (fontSize < 8) fontSize = 8;
    if (fontSize > 22) fontSize = 22;
    $card.css('font-size', fontSize + 'px');

    // Chart.js font scaling: proportional to widget size
    if (self.ctx.chart) {
        var tickFont = Math.max(8, Math.min(14, fontSize * 0.75));
        var legendFont = Math.max(8, Math.min(13, fontSize * 0.7));
        var axisLabelFont = Math.max(8, Math.min(13, fontSize * 0.7));

        // X axis ticks
        self.ctx.chart.options.scales.x.ticks.font.size = tickFont;
        // Y axis ticks
        self.ctx.chart.options.scales.y.ticks.font.size = tickFont;
        // Y axis title
        if (self.ctx.chart.options.scales.y.title) {
            self.ctx.chart.options.scales.y.title.font.size = axisLabelFont;
        }
        // Legend
        self.ctx.chart.options.plugins.legend.labels.font.size = legendFont;
        self.ctx.chart.options.plugins.legend.labels.boxWidth = Math.max(6, legendFont * 0.85);
        self.ctx.chart.options.plugins.legend.labels.boxHeight = Math.max(6, legendFont * 0.85);
        self.ctx.chart.options.plugins.legend.labels.padding = Math.max(6, legendFont * 0.9);

        self.ctx.chart.resize();
    }
};

// --------------------------------------------------
//  Cleanup
// --------------------------------------------------
self.onDestroy = function () {
    if (self.ctx.chart) {
        self.ctx.chart.destroy();
        self.ctx.chart = null;
    }
};