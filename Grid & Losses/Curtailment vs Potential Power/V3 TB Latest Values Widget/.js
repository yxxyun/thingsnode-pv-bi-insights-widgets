/* ════════════════════════════════════════════════════
   Curtailment vs Potential Power — V3
   ThingsBoard v4.2.1.1 PE | Latest Values Widget
   Chart.js envelope chart with simulation fallback
   ════════════════════════════════════════════════════ */

var $el, s, myChart, baseFontSize;
var $title, $statusDot, $statusText;
var $yTitle, $tooltip;
var $legendPotential, $legendExported, $legendCurtailed;
var isLiveData = false;

/* ────────── LIFECYCLE: INIT ────────── */
self.onInit = function () {
    s = self.ctx.settings || {};
    $el = self.ctx.$container;

    /* ── cache DOM ── */
    $title = $el.find('.js-title');
    $statusDot = $el.find('.js-status-dot');
    $statusText = $el.find('.js-status-text');
    $yTitle = $el.find('.js-y-title');
    $tooltip = $el.find('.js-tooltip');
    $legendPotential = $el.find('.js-legend-potential');
    $legendExported = $el.find('.js-legend-exported');
    $legendCurtailed = $el.find('.js-legend-curtailed');

    updateDom();
    initChart();
    self.onResize();

    /* ── Attempt live data fetch ── */
    fetchLiveData();
};

/* ────────── DOM SETUP ────────── */
function updateDom() {
    $title.text(s.widgetTitle || 'CURTAILMENT VS POTENTIAL POWER');

    var unitLabel = s.unitLabel || 'kW';
    $yTitle.text('POWER (' + unitLabel + ')');

    $legendPotential.text(s.potentialLineLabel || 'Potential Power');
    $legendExported.text(s.exportedAreaLabel || 'Exported Power');
    $legendCurtailed.text(s.curtailmentLabel || 'Curtailed Energy');

    /* ── accent override ── */
    var accent = s.accentColor;
    if (accent) {
        $el.find('.curt-card').css({
            'border-color': accent,
            'box-shadow': '0 0 12px ' + accent + '33, inset 0 0 15px rgba(0,0,0,0.4)'
        });
    }

    if (s.tooltipText) {
        $tooltip.text(s.tooltipText);
    }
}

/* ────────── CHART INITIALIZATION ────────── */
function initChart() {
    var canvasEl = $el.find('.js-canvas')[0];
    if (!canvasEl) return;
    var ctx = canvasEl.getContext('2d');

    var unitLabel = s.unitLabel || 'kW';
    var dec = (s.decimals !== undefined) ? parseInt(s.decimals) : 1;
    var showCurtLabel = (s.showCurtailmentLabel !== undefined) ? s.showCurtailmentLabel : true;
    var curtLabelText = s.curtailmentLabel || 'Curtailed Energy';

    /* ── Plugin: Curtailment Label Overlay ── */
    var curtailmentLabelPlugin = {
        id: 'curtailmentLabel',
        afterDraw: function (chart) {
            if (!showCurtLabel) return;
            var datasets = chart.data.datasets;
            if (datasets.length < 3) return;

            var potentialData = datasets[0].data;
            var exportedData = datasets[2].data;
            if (!potentialData || !exportedData || potentialData.length === 0) return;

            var area = chart.chartArea;
            if (!area) return;
            var xScale = chart.scales.x;
            var yScale = chart.scales.y;
            var cCtx = chart.ctx;

            /* find the point of maximum curtailment */
            var maxCurt = 0;
            var maxIdx = -1;
            for (var i = 0; i < potentialData.length; i++) {
                var pVal = potentialData[i];
                var eVal = exportedData[i];
                if (pVal == null || eVal == null) continue;
                var curtVal = pVal - eVal;
                if (curtVal > maxCurt) {
                    maxCurt = curtVal;
                    maxIdx = i;
                }
            }

            if (maxIdx < 0 || maxCurt < 1) return;

            var pY = yScale.getPixelForValue(potentialData[maxIdx]);
            var eY = yScale.getPixelForValue(exportedData[maxIdx]);
            var labelX = xScale.getPixelForValue(maxIdx);
            var labelY = (pY + eY) / 2;

            /* clamp within chart area */
            labelX = Math.max(area.left + 30, Math.min(area.right - 30, labelX));
            labelY = Math.max(area.top + 10, Math.min(area.bottom - 10, labelY));

            cCtx.save();
            var fontSize = Math.max(10, Math.min(16, baseFontSize * 0.55));
            cCtx.font = '700 ' + fontSize + 'px Roboto, sans-serif';
            cCtx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            cCtx.textAlign = 'center';
            cCtx.textBaseline = 'middle';

            /* text shadow for readability */
            cCtx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            cCtx.shadowBlur = 4;
            cCtx.shadowOffsetX = 1;
            cCtx.shadowOffsetY = 1;
            cCtx.fillText(curtLabelText, labelX, labelY);
            cCtx.restore();
        }
    };

    /* ── Plugin: Crosshair ── */
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

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                /* Dataset 0: Potential Power (dashed line, no fill) */
                {
                    label: s.potentialLineLabel || 'Potential Power',
                    data: [],
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                    borderWidth: 2,
                    borderDash: [6, 4],
                    pointRadius: 0,
                    pointHoverRadius: 3,
                    pointHoverBackgroundColor: 'rgba(255,255,255,0.7)',
                    tension: 0.4,
                    fill: false,
                    order: 3
                },
                /* Dataset 1: Exported Power — CYAN AREA FILL (invisible line, fill to origin) */
                {
                    label: '_cyan_fill',
                    data: [],
                    borderColor: 'transparent',
                    borderWidth: 0,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    tension: 0.4,
                    fill: 'origin',
                    backgroundColor: 'rgba(6, 245, 255, 0.18)',
                    order: 2
                },
                /* Dataset 2: Exported Power — VISIBLE LINE + RED CURTAILMENT FILL */
                {
                    label: s.exportedAreaLabel || 'Exported Power',
                    data: [],
                    borderColor: '#06F5FF',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: '#06F5FF',
                    pointHoverBorderColor: '#FFFFFF',
                    pointHoverBorderWidth: 2,
                    tension: 0.4,
                    fill: {
                        target: 0,
                        above: 'rgba(0, 0, 0, 0)',
                        below: 'rgba(229, 57, 53, 0.4)'
                    },
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                mode: 'index',
                axis: 'x',
                intersect: false
            },
            layout: {
                padding: { top: 4, right: 6, bottom: 0, left: 0 }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.06)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#90A4AE',
                        font: { size: 10, family: 'Roboto, sans-serif' },
                        maxTicksLimit: 9,
                        maxRotation: 0
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.06)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#90A4AE',
                        font: { size: 10, family: 'Roboto, sans-serif' },
                        callback: function (val) { return val; }
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
                    bodyFont: { weight: '600', family: 'Roboto, sans-serif' },
                    borderColor: 'rgba(6, 245, 255, 0.3)',
                    borderWidth: 1,
                    cornerRadius: 4,
                    padding: { top: 6, right: 10, bottom: 6, left: 10 },
                    displayColors: false,
                    filter: function (tooltipItem) {
                        /* hide the invisible cyan fill dataset from tooltip */
                        return tooltipItem.datasetIndex !== 1;
                    },
                    callbacks: {
                        title: function (items) {
                            if (items.length > 0) {
                                return items[0].label;
                            }
                            return '';
                        },
                        label: function (context) {
                            var val = (context.parsed.y || 0).toFixed(dec);
                            return context.dataset.label + ': ' + val + ' ' + unitLabel;
                        },
                        afterBody: function (items) {
                            if (items.length < 2) return '';
                            var potVal = 0;
                            var expVal = 0;
                            for (var i = 0; i < items.length; i++) {
                                if (items[i].datasetIndex === 0) potVal = items[i].parsed.y || 0;
                                if (items[i].datasetIndex === 2) expVal = items[i].parsed.y || 0;
                            }
                            var curtailed = Math.max(potVal - expVal, 0);
                            return 'Curtailed: ' + curtailed.toFixed(dec) + ' ' + unitLabel;
                        }
                    }
                }
            }
        },
        plugins: [curtailmentLabelPlugin, crosshairPlugin]
    });
}

/* ────────── LIVE DATA FETCH ────────── */
function fetchLiveData() {
    /* Get entity from datasource */
    if (!self.ctx.datasources || self.ctx.datasources.length === 0) {
        renderNoData();
        return;
    }

    var ds = self.ctx.datasources[0];
    var entityId = ds.entityId;
    var entityType = ds.entityType;

    if (!entityId || !entityType) {
        renderNoData();
        return;
    }

    /* Resolve entityId format — can be string or object {id, entityType} */
    var entIdStr = (typeof entityId === 'object') ? entityId.id : entityId;
    var entTypeStr = (typeof entityType === 'string') ? entityType : entityId.entityType;

    if (!entIdStr) {
        renderNoData();
        return;
    }

    /* Fetch potential power profile attribute */
    var profileKey = s.potentialProfileKey || 'potential_power_profile';
    fetchPotentialProfile(entIdStr, entTypeStr, profileKey);

    /* Fetch active_power time series for today */
    var actualKey = s.actualPowerKey || 'active_power';
    var now = new Date();
    var startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var endTs = now.getTime();

    var url = '/api/plugins/telemetry/' + entTypeStr + '/' + entIdStr +
        '/values/timeseries?keys=' + actualKey +
        '&startTs=' + startOfDay + '&endTs=' + endTs +
        '&limit=10000&agg=NONE';

    try {
        self.ctx.http.get(url).subscribe(
            function (data) {
                if (data && data[actualKey] && data[actualKey].length > 5) {
                    processLiveTimeSeries(data[actualKey]);
                } else {
                    loadSimulation();
                }
            },
            function () {
                loadSimulation();
            }
        );
    } catch (e) {
        loadSimulation();
    }
}

function fetchPotentialProfile(entityId, entityType, profileKey) {
    try {
        var attrService = self.ctx.attributeService;
        if (!attrService) return;

        var entityObj = { id: entityId, entityType: entityType };
        attrService.getEntityAttributes(entityObj, 'SERVER_SCOPE', [profileKey])
            .subscribe(
                function (data) {
                    var found = data.find(function (a) { return a.key === profileKey; });
                    if (found) {
                        try {
                            self._potentialProfile = (typeof found.value === 'string')
                                ? JSON.parse(found.value) : found.value;
                        } catch (e) { /* ignore parse errors */ }
                    }
                },
                function () { /* attribute not found, ignore */ }
            );
    } catch (e) { /* service not available, ignore */ }
}

/* ────────── PROCESS LIVE TIME SERIES ────────── */
function processLiveTimeSeries(rawData) {
    isLiveData = true;
    updateStatusBadge('live');

    var labels = [];
    var dataPotential = [];
    var dataExported = new Array(96).fill(null);

    /* Generate 96 time labels (15-min intervals) */
    for (var i = 0; i < 96; i++) {
        var totalMin = i * 15;
        var h = Math.floor(totalMin / 60);
        var m = totalMin % 60;
        labels.push((h < 10 ? '0' : '') + h + ':' + (m === 0 ? '00' : (m < 10 ? '0' + m : m)));
    }

    /* Map telemetry to 15-min buckets */
    for (var j = 0; j < rawData.length; j++) {
        var ts = parseInt(rawData[j].ts);
        var val = parseFloat(rawData[j].value);
        if (isNaN(val)) continue;

        var date = new Date(ts);
        var h2 = date.getHours();
        var m2 = date.getMinutes();
        var idx = Math.floor((h2 * 60 + m2) / 15);

        if (idx >= 0 && idx < 96) {
            /* average if multiple values in same bucket */
            if (dataExported[idx] === null) {
                dataExported[idx] = val;
            } else {
                dataExported[idx] = (dataExported[idx] + val) / 2;
            }
        }
    }

    /* Potential profile: use attribute if available, else generate from simulation */
    if (self._potentialProfile && self._potentialProfile.length === 96) {
        dataPotential = self._potentialProfile;
    } else {
        dataPotential = generatePotentialCurve();
    }

    /* Filter window to 5AM (idx 20) to 7PM (idx 76) inclusive */
    var startIdx = 20;
    var endIdx = 77;
    labels = labels.slice(startIdx, endIdx);
    dataPotential = dataPotential.slice(startIdx, endIdx);
    dataExported = dataExported.slice(startIdx, endIdx);

    renderChartData(labels, dataPotential, dataExported);
    updateTooltipSummary(dataPotential, dataExported);
}

/* ────────── SIMULATION ────────── */
function loadSimulation() {
    isLiveData = false;
    updateStatusBadge('simulated');

    var maxPower = parseFloat(s.maxPower) || 1000;
    var exportLimit = parseFloat(s.exportLimitKw) || 800;
    var sunrise = parseFloat(s.sunriseHour) || 6;
    var sunset = parseFloat(s.sunsetHour) || 18;

    var labels = [];
    var dataPotential = [];
    var dataExported = [];

    /* Seed for deterministic noise */
    var seed = 42;
    function seededRandom() {
        seed = (seed * 16807 + 0) % 2147483647;
        return (seed - 1) / 2147483646;
    }

    for (var i = 0; i < 96; i++) {
        var totalMin = i * 15;
        var h = Math.floor(totalMin / 60);
        var m = totalMin % 60;
        labels.push((h < 10 ? '0' : '') + h + ':' + (m === 0 ? '00' : (m < 10 ? '0' + m : m)));

        var hourFrac = totalMin / 60;

        /* Potential: sine curve between sunrise and sunset */
        var potential = 0;
        if (hourFrac > sunrise && hourFrac < sunset) {
            var x = (hourFrac - sunrise) / (sunset - sunrise) * Math.PI;
            potential = Math.sin(x) * maxPower;
            /* small cloud variations (±3%) */
            potential *= (1 + (seededRandom() - 0.5) * 0.06);
            potential = Math.max(0, potential);
        }
        dataPotential.push(potential);

        /* Exported: capped at export limit with realistic ramp behavior */
        var exported = potential;
        if (exported > exportLimit) {
            /* Apply ramp smoothing near the limit */
            var rampZone = exportLimit * 0.05;
            if (exported > exportLimit + rampZone) {
                exported = exportLimit;
            } else {
                var t = (exported - exportLimit) / rampZone;
                exported = exportLimit - rampZone * (1 - t) * 0.1;
            }
            /* slight noise on the flat ceiling */
            exported += (seededRandom() - 0.5) * exportLimit * 0.01;
            exported = Math.min(exported, exportLimit);
        }

        /* Simulate a brief grid dispatch event (step-down) around 15:30-16:00 */
        if (hourFrac >= 15.5 && hourFrac <= 16.0 && potential > exportLimit * 0.5) {
            exported = Math.min(exported, exportLimit * 0.85);
        }

        /* Simulate brief cloud transient around 13:00 */
        if (hourFrac >= 13.0 && hourFrac <= 13.25) {
            var cloudFactor = 0.7 + seededRandom() * 0.15;
            exported = Math.min(exported, potential * cloudFactor);
        }

        exported = Math.max(0, exported);
        dataExported.push(exported);
    }

    /* Filter window to 5AM (idx 20) to 7PM (idx 76) inclusive */
    var startIdx = 20;
    var endIdx = 77;
    labels = labels.slice(startIdx, endIdx);
    dataPotential = dataPotential.slice(startIdx, endIdx);
    dataExported = dataExported.slice(startIdx, endIdx);

    renderChartData(labels, dataPotential, dataExported);
    updateTooltipSummary(dataPotential, dataExported);
}

/* ────────── NO DATA STATE ────────── */
function renderNoData() {
    isLiveData = false;
    updateStatusBadge('nodata');
    if (myChart) {
        myChart.data.datasets.forEach(function (ds) { ds.data = []; });
        myChart.update();
    }
    $tooltip.html('No datasource configured.<br>Please add a telemetry source.');
}

/* ────────── GENERATE POTENTIAL CURVE ────────── */
function generatePotentialCurve() {
    var maxPower = parseFloat(s.maxPower) || 1000;
    var sunrise = parseFloat(s.sunriseHour) || 6;
    var sunset = parseFloat(s.sunsetHour) || 18;
    var curve = [];

    for (var i = 0; i < 96; i++) {
        var hourFrac = (i * 15) / 60;
        var val = 0;
        if (hourFrac > sunrise && hourFrac < sunset) {
            var x = (hourFrac - sunrise) / (sunset - sunrise) * Math.PI;
            val = Math.sin(x) * maxPower;
        }
        curve.push(Math.max(0, val));
    }
    return curve;
}

/* ────────── RENDER CHART DATA ────────── */
function renderChartData(labels, potential, exported) {
    if (!myChart) return;

    myChart.data.labels = labels;
    myChart.data.datasets[0].data = potential;
    myChart.data.datasets[1].data = exported;
    myChart.data.datasets[2].data = exported;
    myChart.update('none');
}

/* ────────── STATUS BADGE ────────── */
function updateStatusBadge(state) {
    /* state: 'live', 'simulated', 'nodata' */
    $statusDot.removeClass('live simulated nodata');

    if (state === 'live') {
        $statusDot.addClass('live');
        $statusText.text('LIVE');
    } else if (state === 'simulated') {
        $statusDot.addClass('simulated');
        $statusText.text('SIMULATED');
    } else {
        /* no data */
        $statusDot.addClass('nodata'); /* css needs this */
        $statusText.text('NO DATA');
    }
}


/* ────────── DYNAMIC TOOLTIP ────────── */
function updateTooltipSummary(potential, exported) {
    if (s.tooltipText) return;

    var dec = (s.decimals !== undefined) ? parseInt(s.decimals) : 1;
    var unitLabel = s.unitLabel || 'kW';
    var intervalHours = 0.25; /* 15 minutes */

    var totalPotentialEnergy = 0;
    var totalExportedEnergy = 0;
    var totalCurtailedEnergy = 0;
    var peakPotential = 0;
    var peakExported = 0;

    for (var i = 0; i < potential.length; i++) {
        var pVal = potential[i] || 0;
        var eVal = (exported[i] !== null && exported[i] !== undefined) ? exported[i] : 0;
        var curtailed = Math.max(pVal - eVal, 0);

        totalPotentialEnergy += pVal * intervalHours;
        totalExportedEnergy += eVal * intervalHours;
        totalCurtailedEnergy += curtailed * intervalHours;

        if (pVal > peakPotential) peakPotential = pVal;
        if (eVal > peakExported) peakExported = eVal;
    }

    /* Convert kWh to MWh if values are large */
    var energyUnit = 'kWh';
    var energyDivisor = 1;
    if (totalPotentialEnergy > 1000) {
        energyUnit = 'MWh';
        energyDivisor = 1000;
    }

    var curtPct = totalPotentialEnergy > 0
        ? ((totalCurtailedEnergy / totalPotentialEnergy) * 100).toFixed(1) : '0.0';

    var lines = [
        'Peak Potential: ' + peakPotential.toFixed(dec) + ' ' + unitLabel +
        ' | Peak Exported: ' + peakExported.toFixed(dec) + ' ' + unitLabel,
        'Curtailed Energy: ' + (totalCurtailedEnergy / energyDivisor).toFixed(dec) +
        ' ' + energyUnit + ' (' + curtPct + '% of potential)',
        isLiveData ? 'Live telemetry from today.' : 'Simulated data for demonstration.'
    ];

    $tooltip.html(lines.join('<br>'));
}

/* ────────── LIFECYCLE: DATA UPDATED ────────── */
self.onDataUpdated = function () {
    /* For a Latest Values widget, data updates may signal entity changes.
       Re-fetch live data when the datasource updates. */
    fetchLiveData();
};

/* ────────── LIFECYCLE: RESIZE ────────── */
self.onResize = function () {
    var w = $el.width();
    var h = $el.height();
    if (!w || !h) return;

    /* Em budget (vertical):
       header(0.65) + chart(flex:1 ≈ 5em min) + footer(0.45) + padding(0.6) ≈ 6.7em
    */
    var fromH = (h - 8) / 7.5;

    /* Em budget (horizontal):
       y-axis-title(0.5) + chart(flex:1 ≈ 10em) + padding(1.0) ≈ 14em
    */
    var fromW = w / 14;

    baseFontSize = Math.min(fromH, fromW);
    if (baseFontSize < 8) baseFontSize = 8;
    if (baseFontSize > 32) baseFontSize = 32;

    $el.find('.curt-card').css('font-size', baseFontSize + 'px');

    /* Scale Chart.js fonts proportionally */
    if (myChart) {
        var tickFont = Math.max(8, Math.min(14, baseFontSize * 0.5));

        myChart.options.scales.x.ticks.font.size = tickFont;
        myChart.options.scales.y.ticks.font.size = tickFont;
        myChart.resize();
    }
};

/* ────────── LIFECYCLE: DESTROY ────────── */
self.onDestroy = function () {
    if (myChart) {
        myChart.destroy();
        myChart = null;
    }
};
