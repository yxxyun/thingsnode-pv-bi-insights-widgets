// PREREQUISITE: Add https://cdn.jsdelivr.net/npm/chart.js to Resources

self.onInit = function() {
    self.ctx.settings = self.ctx.settings || {};
    self.chart = null;
    self.potentialProfile = null; // Store the profile here
    
    // 1. Manually Fetch the Attribute (Bypassing Datasource UI)
    fetchPotentialProfile();

    self.updateDom();
    self.onResize();
}

self.updateDom = function() {
    var s = self.ctx.settings;
    var title = s.widgetTitle || "CURTAILMENT VS POTENTIAL POWER";
    $('#chart-title').text(title);
}

function fetchPotentialProfile() {
    // Get the current Entity ID from the datasource
    if (!self.ctx.datasources || self.ctx.datasources.length === 0) return;
    var entityId = self.ctx.datasources[0].entityId;
    
    // Use ThingsBoard Attribute Service to fetch 'potential_power_profile'
    // We check SERVER_SCOPE (or SHARED_SCOPE if you configured it there)
    var attributeService = self.ctx.attributeService;
    
    // Try Server Scope first
    attributeService.getEntityAttributes(entityId, 'SERVER_SCOPE', ['potential_power_profile'])
        .subscribe(
            function(data) {
                processAttributeData(data);
            },
            function(error) {
                // If not found in Server, try Shared (optional fallback)
                console.log("Not found in Server scope, checking Shared...");
            }
        );
}

function processAttributeData(attributes) {
    // Check if key exists
    var key = 'potential_power_profile';
    var found = attributes.find(function(a) { return a.key === key; });
    
    if (found) {
        try {
            self.potentialProfile = (typeof found.value === 'string') ? JSON.parse(found.value) : found.value;
            // Force a chart update now that we have the profile
            self.onDataUpdated();
        } catch (e) {
            console.error("Profile JSON Parse Error", e);
        }
    }
}

self.onDataUpdated = function() {
    var s = self.ctx.settings;
    var maxPower = s.maxPower || 10.5; 
    
    var labels = [];
    var dataPotential = [];
    var dataActual = [];

    // 1. GENERATE TIME AXIS (00:00 - 24:00, 15 min intervals)
    for (var i = 0; i < 96; i++) {
        var totalMin = i * 15;
        var h = Math.floor(totalMin / 60);
        var m = totalMin % 60;
        var label = (h < 10 ? '0' : '') + h + ':' + (m === 0 ? '00' : m);
        labels.push(label);
    }

    // 2. PREPARE POTENTIAL PROFILE
    // Use the manually fetched profile if available
    if (self.potentialProfile && self.potentialProfile.length === 96) {
        dataPotential = self.potentialProfile;
    } else {
        // Fallback Simulation (Sine Wave) if attribute not loaded yet
        for (var i = 0; i < 96; i++) {
            var h = (i * 15) / 60;
            var val = 0;
            if (h > 6 && h < 18) {
                var x = (h - 6) / (12) * Math.PI;
                val = Math.sin(x) * maxPower;
            }
            dataPotential.push(val);
        }
    }

    // 3. PROCESS ACTUAL TELEMETRY (History from Timeseries Widget)
    // Timeseries widgets provide data in self.ctx.data as an array of [ts, value]
    dataActual = new Array(96).fill(null);
    
    if (self.ctx.data && self.ctx.data.length > 0) {
        // We assume the first datasource is our active_power
        var dataset = self.ctx.data[0]; 
        
        if (dataset.data && dataset.data.length > 0) {
            dataset.data.forEach(function(point) {
                var ts = point[0];
                var val = parseFloat(point[1]);
                var date = new Date(ts);
                
                // Map timestamp to 0-95 index based on Hour/Minute
                var h = date.getHours();
                var m = date.getMinutes();
                var index = Math.floor((h * 60 + m) / 15);
                
                if (index >= 0 && index < 96) {
                    dataActual[index] = val;
                }
            });
        }
    }

    renderChart(labels, dataPotential, dataActual);
}

function renderChart(labels, potential, actual) {
    if (self.chart) self.chart.destroy();
    
    var ctx = document.getElementById('powerChart').getContext('2d');
    
    self.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Potential Power',
                    data: potential,
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    tension: 0.4,
                    fill: false,
                    order: 1
                },
                {
                    label: 'Exported Power',
                    data: actual,
                    borderColor: '#06F5FF',
                    backgroundColor: 'rgba(229, 57, 53, 0.5)', 
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4,
                    spanGaps: true, 
                    fill: {
                        target: 0,
                        above: 'rgba(229, 57, 53, 0.0)',
                        below: 'rgba(229, 57, 53, 0.4)' 
                    },
                    order: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(2, 10, 67, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#ccc',
                    callbacks: {
                        label: function(ctx) {
                            return ctx.dataset.label + ': ' + (ctx.parsed.y || 0).toFixed(2) + ' MW';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#B0BEC5', maxTicksLimit: 8, font: {size: 10} }
                },
                y: {
                    title: { display: true, text: 'POWER (MW)', color: '#B0BEC5', font: {size: 9} },
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#B0BEC5', font: {size: 10} },
                    beginAtZero: true
                }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });
}

self.onResize = function() { if (self.chart) self.chart.resize(); }
self.onDestroy = function() { if (self.chart) self.chart.destroy(); }