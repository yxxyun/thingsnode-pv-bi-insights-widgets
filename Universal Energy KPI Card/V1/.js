self.onInit = function() {
    self.ctx.settings = self.ctx.settings || {};
    self.updateDom();
    self.onResize();
    self.onDataUpdated();
}

self.updateDom = function() {
    var $el = $(self.ctx.$container); // <--- SCOPED SELECTOR
    var s = self.ctx.settings;
    var mode = s.cardMode || "custom";
    
    // Default Configuration Map
    var configMap = {
        "today": { title: "TODAY'S ENERGY", sub: "Today" },
        "mtd":   { title: "MTD ENERGY", sub: "Month-to-Date" },
        "ytd":   { title: "YTD ENERGY", sub: "Year-to-Date" },
        "life":  { title: "LIFETIME ENERGY", sub: "Since COD" },
        "custom":{ title: "ENERGY", sub: "Production" }
    };

    var cfg = configMap[mode] || configMap["custom"];
    
    // User overrides take precedence
    var title = s.overrideTitle || cfg.title;
    var sub = s.overrideSub || cfg.sub;
    
    // FIND ELEMENTS WITHIN THIS WIDGET ONLY
    $el.find('.js-kpi-title').text(title);
    $el.find('.js-kpi-subtitle').text(sub);
}

self.onDataUpdated = function() {
    var $el = $(self.ctx.$container); // <--- SCOPED SELECTOR
    
    // 1. Validate Data
    if (!self.ctx.data || self.ctx.data.length === 0 || !self.ctx.data[0].data || self.ctx.data[0].data.length === 0) {
        return; 
    }

    var rawVal = self.ctx.data[0].data[0][1];
    if (rawVal === null || rawVal === undefined) return;

    var val = parseFloat(rawVal);
    
    // 2. Unit Logic
    // Default divider = 1 (Assume input is MWh). If input is kWh, user sets 1000.
    var inputDiv = self.ctx.settings.inputDivider || 1; 
    var mwhVal = val / inputDiv;
    
    var displayVal = mwhVal;
    var displayUnit = "MWh";
    var autoScale = (self.ctx.settings.autoScale !== false); // Default true

    // 3. Auto-Scaling Logic (MWh <-> GWh)
    if (autoScale) {
        if (Math.abs(mwhVal) >= 1000) {
            displayVal = mwhVal / 1000;
            displayUnit = "GWh";
        }
    }
    
    // 4. Formatting
    var decimals = (self.ctx.settings.decimals !== undefined) ? self.ctx.settings.decimals : 1;
    var formattedVal = displayVal.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });

    // 5. Render Scoped
    var $valElement = $el.find('.js-kpi-value');
    $valElement.text(formattedVal);
    $valElement.removeClass('skeleton');
    
    $el.find('.js-kpi-unit').text(displayUnit);
}

self.onResize = function() {
    // This part was actually already correct, but good to double check
    var $el = $(self.ctx.$container);
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