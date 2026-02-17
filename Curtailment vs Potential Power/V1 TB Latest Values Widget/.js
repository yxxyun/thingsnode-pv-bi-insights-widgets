self.onInit = function () {
    self.ctx.settings = self.ctx.settings || {};
    $('#title').text(self.ctx.settings.title || "CURTAILMENT VS POTENTIAL POWER");
  };
  
  self.onDataUpdated = function () {
    const svg = document.getElementById("chart");
    svg.innerHTML = "";
  
    const exportedSeries = self.ctx.data[0]?.data || [];
    if (!exportedSeries.length) return;
    const attr =
      self.ctx.attributes?.P341 ||
      self.ctx.attributes?.Finance ||
      {};
  
    const profile = attr.potential_power_profile || [];
  
    const maxKW = self.ctx.settings.maxKW || 1100;
  
    let ptsExp = [];
    let ptsPot = [];
    let ptsCur = [];
  
    let cumulative = 0;
  
    const profileLen = profile.length;
    const seriesLen = exportedSeries.length;
  
    function potentialAt(i) {
      const idx = Math.floor(i * profileLen / seriesLen);
      return profile[idx] ?? 0;
    }
  
  
    exportedSeries.forEach((p, i) => {
      const t = i / (exportedSeries.length - 1);
      const x = t * 1000;
  
      const expKW = p[1] / 1000;
      const potKW = potentialAt(i);
      const curKW = Math.max(potKW - expKW, 0);
  
      cumulative += curKW * (24 / exportedSeries.length);
  
      ptsExp.push([x, 400 - (expKW / maxKW) * 350]);
      ptsPot.push([x, 400 - (potKW / maxKW) * 350]);
      ptsCur.push([x, 400 - (potKW / maxKW) * 350]);
    });
  
    const path = arr =>
      "M " + arr.map(p => `${p[0]},${p[1]}`).join(" L ");
  
    // Curtailment fill
    svg.innerHTML += `
      <path d="${path(ptsCur)} L ${path(ptsExp).replace("M","")} Z"
            fill="var(--red)" />
    `;
  
    // Exported
    svg.innerHTML += `
      <path d="${path(ptsExp)}"
            fill="none" stroke="var(--cyan)" stroke-width="3"/>
    `;
  
    // Potential
    svg.innerHTML += `
      <path d="${path(ptsPot)}"
            fill="none" stroke="#AAA" stroke-dasharray="6,6" stroke-width="2"/>
    `;
  };
  