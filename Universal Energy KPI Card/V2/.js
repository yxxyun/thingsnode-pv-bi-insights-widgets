self.onInit = function() {
    self.ctx.settings = self.ctx.settings || {};
    self.updateDom();
    self.onResize();
    self.onDataUpdated();
}

self.updateDom = function() {
    // SCOPED SELECTOR: Ensures we only update THIS widget instance
    var $el = self.ctx.$scope ? $(self.ctx.$scope) : $(self.ctx.$container);
    
    var s = self.ctx.settings;
    var mode = s.cardMode || "custom";
    
    var configMap = {
        "today": { title: "TODAY'S ENERGY", sub: "Today" },
        "mtd":   { title: "MTD ENERGY", sub: "Month-to-Date" },
        "ytd":   { title: "YTD ENERGY", sub: "Year-to-Date" },
        "life":  { title: "LIFETIME ENERGY", sub: "Since COD" },
        "custom":{ title: "ENERGY", sub: "Production" }
    };

    var cfg = configMap[mode] || configMap["custom"];
    
    var title = s.overrideTitle || cfg.title;
    var sub = s.overrideSub || cfg.sub;
    
    $el.find('.js-kpi-title').text(title);
    $el.find('.js-kpi-subtitle').text(sub);
}

self.onDataUpdated = function() {
    var $el = self.ctx.$scope ? $(self.ctx.$scope) : $(self.ctx.$container);
    var $valElement = $el.find('.js-kpi-value');
    var $unitElement = $el.find('.js-kpi-unit');

    // 1. Data Safety Check
    if (!self.ctx.data || self.ctx.data.length === 0 || !self.ctx.data[0].data || self.ctx.data[0].data.length === 0) {
        $valElement.text("--"); // No data available
        return; 
    }

    var rawVal = self.ctx.data[0].data[0][1];
    
    // 2. NaN Protection (Fix for your screenshot)
    if (rawVal === null || rawVal === undefined || isNaN(parseFloat(rawVal))) {
        $valElement.text("--");
        return;
    }

    var val = parseFloat(rawVal);
    
    // 3. Unit Logic
    var inputDiv = self.ctx.settings.inputDivider || 1; 
    var mwhVal = val / inputDiv;
    
    var displayVal = mwhVal;
    var displayUnit = "MWh";
    var autoScale = (self.ctx.settings.autoScale !== false); // Default true

    // 4. Auto-Scaling (MWh <-> GWh)
    if (autoScale) {
        if (Math.abs(mwhVal) >= 1000) {
            displayVal = mwhVal / 1000;
            displayUnit = "GWh";
        }
    }
    
    // 5. Formatting
    var decimals = (self.ctx.settings.decimals !== undefined) ? self.ctx.settings.decimals : 1;
    var formattedVal = displayVal.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });

    // 6. Render
    $valElement.text(formattedVal);
    $valElement.removeClass('skeleton');
    $unitElement.text(displayUnit);
}

self.onResize = function() {
    var $el = self.ctx.$scope ? $(self.ctx.$scope) : $(self.ctx.$container);
    var h = $el.height();
    var w = $el.width();
    
    // Dynamic Font Scaling
    var baseSize = Math.min(h, w) / 5; 
    if (w > h * 2.5) baseSize = h / 2.5; 
    
    // Clamp
    if (baseSize < 10) baseSize = 10;
    if (baseSize > 40) baseSize = 40;

    $el.find('.energy-card').css('font-size', baseSize + 'px');
}

self.onDestroy = function() {
}