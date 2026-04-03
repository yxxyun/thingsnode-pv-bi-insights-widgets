/* ════════════════════════════════════════════════════
   Curtailment vs Potential Power — V3 TIMESERIES
   ThingsBoard v4.2.1.1 PE | Timeseries Widget
   Chart.js envelope chart with dynamic timeWindow bounds
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

function updateStatusBadge(state) {
    $statusDot.removeClass('live simulated nodata');
    if (state === 'live') {
        $statusDot.addClass('live');
        $statusText.text('LIVE');
    } else if (state === 'simulated') {
        $statusDot.addClass('simulated');
        $statusText.text('SIMULATED');
    } else {
        $statusDot.addClass('nodata');
        $statusText.text('NO DATA');
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

    var curtailmentLabelPlugin = {
        id: 'curtailmentLabel',
        afterDraw: function (chart) {
            if (!showCurtLabel) return;
            var datasets = chart.data.datasets;
            if (datasets.length < 3) return;

            var potentialData = datasets[0].data;
            var exportedData = datasets[1].data;
            var envData = datasets[2].data;
            if (!potentialData || !exportedData || potentialData.length === 0) return;

            var area = chart.chartArea;
            if (!area) return;
            var xScale = chart.scales.x;
            var yScale = chart.scales.y;
            var cCtx = chart.ctx;

            var maxCurt = 0;
            var maxIdx = -1;
            for (var i = 0; i < envData.length; i++) {
                var pVal = potentialData[i];
                var eVal = exportedData[i];
                var envVal = envData[i];
                if (pVal == null || eVal == null || envVal == null) continue;
                var curtVal = envVal - eVal;
                if (curtVal > maxCurt) {
                    maxCurt = curtVal;
                    maxIdx = i;
                }
            }

            if (maxIdx < 0 || maxCurt < 1) return;

            var pY = yScale.getPixelForValue(envData[maxIdx]);
            var eY = yScale.getPixelForValue(exportedData[maxIdx]);
            var labelX = xScale.getPixelForValue(maxIdx);
            var labelY = (pY + eY) / 2;

            labelX = Math.max(area.left + 30, Math.min(area.right - 30, labelX));
            labelY = Math.max(area.top + 10, Math.min(area.bottom - 10, labelY));

            cCtx.save();
            var fontSize = Math.max(10, Math.min(16, (baseFontSize || 14) * 0.55));
            cCtx.font = '700 ' + fontSize + 'px Roboto, sans-serif';
            cCtx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            cCtx.textAlign = 'center';
            cCtx.textBaseline = 'middle';

            cCtx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            cCtx.shadowBlur = 4;
            cCtx.shadowOffsetX = 1;
            cCtx.shadowOffsetY = 1;
            cCtx.fillText(curtLabelText, labelX, labelY);
            cCtx.restore();
        }
    };

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
                    fill: 'origin',
                    backgroundColor: 'rgba(6, 245, 255, 0.18)',
                    order: 2
                },
                {
                    label: '_curtailed_envelope',
                    data: [],
                    borderColor: 'transparent',
                    borderWidth: 0,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    tension: 0.4,
                    fill: {
                        target: 1,
                        above: 'rgba(229, 57, 53, 0.4)',
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
                    grid: { color: 'rgba(255, 255, 255, 0.06)', drawBorder: false },
                    ticks: { color: '#90A4AE', font: { size: 10, family: 'Roboto, sans-serif' }, maxTicksLimit: 9, maxRotation: 0 }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.06)', drawBorder: false },
                    ticks: { color: '#90A4AE', font: { size: 10, family: 'Roboto, sans-serif' } }
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
                    filter: function (tooltipItem) { return tooltipItem.datasetIndex !== 2; },
                    callbacks: {
                        title: function (items) {
                            if (items.length > 0) return items[0].label;
                            return '';
                        },
                        label: function (context) {
                            var val = (context.parsed.y || 0).toFixed(dec);
                            return context.dataset.label + ': ' + val + ' ' + unitLabel;
                        },
                        afterBody: function (items) {
                            if (items.length < 1) return '';
                            var chartData = items[0].chart.data;
                            var dataIdx = items[0].dataIndex;
                            var eVal  = chartData.datasets[1].data[dataIdx] || 0;
                            var envVal = chartData.datasets[2].data[dataIdx];
                            if (envVal == null) envVal = eVal;

                            var curtailed = Math.max(envVal - eVal, 0);
                            if (curtailed > 0) {
                                return 'Curtailed Gap: ' + curtailed.toFixed(dec) + ' ' + unitLabel;
                            }
                            return '';
                        }
                    }
                }
            }
        },
        plugins: [curtailmentLabelPlugin, crosshairPlugin]
    });
}

function parseCommaList(str) {
    if (!str) return [];
    return str.split(',').map(function(k) { return k.trim() }).filter(function(k) { return k.length > 0 });
}

/* ────────── LIVE DATA FETCH ────────── */
function fetchLiveData() {
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

    var entIdStr = (typeof entityId === 'object') ? entityId.id : entityId;
    var entTypeStr = (typeof entityType === 'string') ? entityType : entityId.entityType;
    if (!entIdStr) { renderNoData(); return; }

    var aKeysStr = s.actualPowerKeys || s.actualPowerKey || 'active_power';
    var setKeysStr = s.setpointKeys || s.setpointKey || 'setpoint_active_power, curtailment_limit, power_limit';

    var actualKeys = parseCommaList(aKeysStr);
    var setpointKeys = parseCommaList(setKeysStr);
    var capacityKey = s.plantCapacityKey || 'Plant Total Capacity';

    var tsKeys = actualKeys.concat(setpointKeys).join(',');

    /* Use the Dashboard Time Window natively for Timeseries mapping */
    var timeWindow = self.ctx.timeWindow || {};
    var endTs = timeWindow.maxTime || Date.now();
    var startTs = timeWindow.minTime || (endTs - 24 * 3600 * 1000);

    var fetchTs = function() {
        var url = '/api/plugins/telemetry/' + entTypeStr + '/' + entIdStr +
            '/values/timeseries?keys=' + tsKeys +
            '&startTs=' + startTs + '&endTs=' + endTs +
            '&limit=50000&agg=NONE';
        
        try {
            self.ctx.http.get(url).subscribe(
                function (data) {
                    if (data && Object.keys(data).length > 0) {
                        processLiveTimeSeries(data, startTs, endTs);
                    } else {
                        loadSimulation(startTs, endTs);
                    }
                },
                function () { loadSimulation(startTs, endTs); }
            );
        } catch (e) { loadSimulation(startTs, endTs); }
    };

    var attrService = self.ctx.attributeService;
    if (attrService && capacityKey) {
        var entityObj = { id: entIdStr, entityType: entTypeStr };
        try {
            attrService.getEntityAttributes(entityObj, 'SERVER_SCOPE', [capacityKey])
                .subscribe(
                    function (data) {
                        try {
                            if (data && Array.isArray(data)) {
                                var found = data.find(function (a) { return a.key === capacityKey; });
                                if (found) self._capacityVal = found.value;
                            }
                        } catch (e) {}
                        fetchTs();
                    },
                    function () { fetchTs(); }
                );
        } catch (e) { fetchTs(); }
    } else {
        fetchTs();
    }
}

/* ────────── PROCESS LIVE TIME SERIES ────────── */
function processLiveTimeSeries(rawData, minTime, maxTime) {
    isLiveData = true;
    updateStatusBadge('live');

    var aKeysStr = s.actualPowerKeys || s.actualPowerKey || 'active_power';
    var setKeysStr = s.setpointKeys || s.setpointKey || 'setpoint_active_power, curtailment_limit, power_limit';

    var actualKeys = parseCommaList(aKeysStr);
    var setpointKeys = parseCommaList(setKeysStr);

    var rawActual = null;
    for (var i = 0; i < actualKeys.length; i++) {
        if (rawData[actualKeys[i]] && rawData[actualKeys[i]].length > 0) {
            rawActual = rawData[actualKeys[i]]; 
            break;
        }
    }
    
    var rawSetpoint = null;
    for (var j = 0; j < setpointKeys.length; j++) {
        if (rawData[setpointKeys[j]] && rawData[setpointKeys[j]].length > 0) {
            rawSetpoint = rawData[setpointKeys[j]]; 
            break;
        }
    }

    if (!rawActual) {
        loadSimulation(minTime, maxTime);
        return;
    }

    if (rawSetpoint) {
        rawSetpoint.sort(function(a, b) { return a.ts - b.ts; });
    }

    var getSetpointAtTime = function(ts) {
        if (!rawSetpoint || rawSetpoint.length === 0) return 100;
        var lastVal = 100;
        for (var k = 0; k < rawSetpoint.length; k++) {
            if (rawSetpoint[k].ts <= ts) {
                lastVal = parseFloat(rawSetpoint[k].value);
            } else { break; }
        }
        return isNaN(lastVal) ? 100 : lastVal;
    };

    var capacity = parseFloat(self._capacityVal);
    if (isNaN(capacity) || capacity <= 0) capacity = parseFloat(s.maxPower) || 1000;
    
    var capUnit = s.capacityUnit || 'MW';
    var powUnit = s.unitLabel || 'kW';
    if (capUnit === 'MW' && powUnit === 'kW') capacity *= 1000;
    if (capUnit === 'kW' && powUnit === 'MW') capacity *= 0.001;

    /* Scalable bucket limits (96 fixed to adapt the duration gracefully) */
    var bucketCount = 96; 
    var bucketSizeMs = (maxTime - minTime) / bucketCount;

    var labels = [];
    var dataExported = new Array(bucketCount).fill(null);
    var dataCurtailedEnv = new Array(bucketCount).fill(null);
    var dataPotential = [];

    var timeDiffHours = (maxTime - minTime) / (3600*1000);
    var formatOptions = (timeDiffHours > 36) ? 
        { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } :
        { hour: '2-digit', minute: '2-digit' };

    for (var idx = 0; idx < bucketCount; idx++) {
        var bTs = minTime + (idx * bucketSizeMs);
        var labelStr = new Intl.DateTimeFormat('default', formatOptions).format(new Date(bTs));
        labels.push(labelStr);
        
        var d = new Date(bTs);
        var hrFrac = d.getHours() + (d.getMinutes() / 60);
        var sunrise = parseFloat(s.sunriseHour) || 6; 
        var sunset = parseFloat(s.sunsetHour) || 18;
        if (hrFrac < sunrise || hrFrac > sunset) {
            dataPotential.push(0);
        } else {
            var frac = (hrFrac - sunrise) / (sunset - sunrise);
            dataPotential.push(capacity * Math.sin(frac * Math.PI));
        }
    }

    for (var p = 0; p < rawActual.length; p++) {
        var ts = parseInt(rawActual[p].ts);
        var val = parseFloat(rawActual[p].value);
        if (isNaN(val)) continue;

        var tIdx = Math.floor((ts - minTime) / bucketSizeMs);
        if (tIdx >= 0 && tIdx < bucketCount) {
            if (dataExported[tIdx] === null) dataExported[tIdx] = val;
            else dataExported[tIdx] = (dataExported[tIdx] + val) / 2;
        }
    }

    for (var b = 0; b < bucketCount; b++) {
        if (dataExported[b] === null) continue;
        
        var bucketTs = minTime + (b * bucketSizeMs + bucketSizeMs / 2);
        var setpointPct = getSetpointAtTime(bucketTs);
        var allowedPower = capacity * (setpointPct / 100);

        if (setpointPct < 99 && dataPotential[b] > allowedPower) {
            dataCurtailedEnv[b] = Math.max(dataPotential[b], dataExported[b]);
        } else {
            dataCurtailedEnv[b] = dataExported[b];
        }
    }

    renderChartData(labels, dataPotential, dataExported, dataCurtailedEnv);
    updateTooltipSummary(dataPotential, dataExported, dataCurtailedEnv, bucketSizeMs);
}

/* ────────── SIMULATION ────────── */
function loadSimulation(minTime, maxTime) {
    isLiveData = false;
    updateStatusBadge('simulated');

    var capacity = parseFloat(s.maxPower) || 1000;
    var exportLimit = parseFloat(s.exportLimitKw) || 800;
    
    var labels = [];
    var dataPotential = [];
    var dataExported = [];
    var dataCurtailedEnv = [];

    var bucketCount = 96; var bucketSizeMs = (maxTime - minTime) / bucketCount;
    var timeDiffHours = (maxTime - minTime) / (3600*1000);
    var formatOptions = (timeDiffHours > 36) ? 
        { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } :
        { hour: '2-digit', minute: '2-digit' };

    var seed = 42;
    function seededRandom() {
        seed = (seed * 16807 + 0) % 2147483647;
        return (seed - 1) / 2147483646;
    }

    for (var i = 0; i < bucketCount; i++) {
        var bt = minTime + i * bucketSizeMs;
        labels.push(new Intl.DateTimeFormat('default', formatOptions).format(new Date(bt)));

        var d = new Date(bt);
        var hrFrac = d.getHours() + (d.getMinutes() / 60);
        var p = (hrFrac < 6 || hrFrac > 18) ? 0 : capacity * Math.sin(((hrFrac - 6) / 12) * Math.PI);
        p *= (1 + (seededRandom() - 0.5) * 0.06);
        dataPotential.push(p);

        var exported = p;
        var isCurtailedRule = false;

        if (exported > exportLimit) {
            isCurtailedRule = true;
            exported = exportLimit + (seededRandom() - 0.5) * exportLimit * 0.01;
        }

        if (hrFrac >= 15.5 && hrFrac <= 16.0 && p > exportLimit * 0.5) {
            isCurtailedRule = true;
            exported = Math.min(exported, exportLimit * 0.85);
        }

        if (hrFrac >= 13.0 && hrFrac <= 13.25) {
            exported = Math.min(exported, p * (0.7 + seededRandom() * 0.15));
        }

        exported = Math.max(0, exported);
        dataExported.push(exported);

        if (isCurtailedRule && p > exported) {
            dataCurtailedEnv.push(Math.max(p, exported));
        } else {
            dataCurtailedEnv.push(exported);
        }
    }

    renderChartData(labels, dataPotential, dataExported, dataCurtailedEnv);
    updateTooltipSummary(dataPotential, dataExported, dataCurtailedEnv, bucketSizeMs);
}

function renderNoData() {
    isLiveData = false;
    updateStatusBadge('nodata');
    if (myChart) {
        myChart.data.datasets.forEach(function (ds) { ds.data = []; });
        myChart.update();
    }
    $tooltip.html('No datasource configured.<br>Please add an Entity Alias.');
}

function renderChartData(labels, potential, exported, curtailedEnv) {
    if (!myChart) return;
    myChart.data.labels = labels;
    myChart.data.datasets[0].data = potential;
    myChart.data.datasets[1].data = exported;
    myChart.data.datasets[2].data = curtailedEnv;
    myChart.update('none');
}

function updateTooltipSummary(potential, exported, curtailedEnv, bucketSizeMs) {
    var totalPotentialEnergy = 0;
    var totalExportedEnergy = 0;
    var totalCurtailedEnergy = 0;
    
    var peakPotential = 0;
    var peakExported = 0;

    var dec = (s.decimals !== undefined) ? parseInt(s.decimals) : 1;
    var unitLabel = s.unitLabel || 'kW';

    var fractionOfHour = bucketSizeMs / (1000 * 3600);

    for (var i = 0; i < potential.length; i++) {
        var pVal = potential[i] || 0;
        var eVal = exported[i] || 0;
        var envVal = curtailedEnv[i];

        if (pVal > peakPotential) peakPotential = pVal;
        if (eVal > peakExported) peakExported = eVal;

        totalPotentialEnergy += pVal * fractionOfHour;
        totalExportedEnergy += eVal * fractionOfHour;

        if (envVal != null && envVal > eVal) {
            totalCurtailedEnergy += (envVal - eVal) * fractionOfHour;
        }
    }

    var energyDivisor = 1;
    var energyUnit = unitLabel + 'h';
    if (totalCurtailedEnergy > 1000 || totalExportedEnergy > 1000) {
        energyDivisor = 1000;
        energyUnit = (unitLabel === 'kW') ? 'MWh' : 'GWh';
    }

    var marginPct = (s.theoreticalMargin !== undefined) ? parseFloat(s.theoreticalMargin) : 10;
    var errorMargin = totalCurtailedEnergy * (marginPct / 100);

    var lines = [
        'Range Peak Potential: ' + peakPotential.toFixed(dec) + ' ' + unitLabel +
        ' | Peak Exported: ' + peakExported.toFixed(dec) + ' ' + unitLabel,
        'Curtailed Energy in Window: ' + (totalCurtailedEnergy / energyDivisor).toFixed(dec) +
        ' ' + energyUnit + ' (± ' + (errorMargin / energyDivisor).toFixed(dec) + ')',
        isLiveData ? 'Live telemetry evaluated.' : 'Simulated data for demonstration.'
    ];

    $tooltip.html(lines.join('<br>'));
}

/* ────────── EVENT HANDLERS ────────── */
self.onResize = function () {
    if (myChart && $el) {
        var cardHeight = $el.find('.curt-card').height();
        baseFontSize = Math.max(10, cardHeight * 0.05);
        myChart.resize();
    }
};

self.onDestroy = function () {
    if (myChart) myChart.destroy();
};
