/* compute.js — Engine tính toán tiến độ dùng chung cho index / admin / condensed */
(function (global) {
  const parseDate = s => s ? new Date(s + "T00:00:00") : null;
  const daysBetween = (a, b) => (b - a) / (1000 * 60 * 60 * 24);

  function fmtDate(s) {
    if (!s) return "—";
    const d = parseDate(s);
    if (!d || isNaN(d)) return "—";
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  }

  function calcTask(item, today) {
    const ps = parseDate(item.plannedStart);
    const pe = parseDate(item.plannedEnd);

    let plannedPercent = 0;
    if (item.plannedPercentOverride !== null && item.plannedPercentOverride !== undefined && item.plannedPercentOverride !== "") {
      plannedPercent = Number(item.plannedPercentOverride);
    } else if (ps && pe && pe > ps) {
      const total = daysBetween(ps, pe);
      const elapsed = Math.max(0, Math.min(total, daysBetween(ps, today)));
      plannedPercent = (elapsed / total) * 100;
    } else if (pe && today >= pe) {
      plannedPercent = 100;
    }
    plannedPercent = Math.max(0, Math.min(100, plannedPercent));

    const pv = Number(item.plannedVolume) || 0;
    const av = Number(item.actualVolume) || 0;
    const actualPercent = pv > 0 ? Math.min(100, (av / pv) * 100) : (av > 0 ? 100 : 0);
    const delta = actualPercent - plannedPercent;
    const spi = plannedPercent > 0 ? actualPercent / plannedPercent : (actualPercent >= 100 ? 1 : 0);

    let status, statusLabel;
    if (!ps || today < ps) { status = "gray"; statusLabel = "Chưa bắt đầu"; }
    else if (actualPercent >= 100) { status = "green"; statusLabel = "Hoàn thành"; }
    else if (delta >= -3) { status = "green"; statusLabel = "Đúng / Vượt"; }
    else if (delta >= -10) { status = "yellow"; statusLabel = "Cảnh báo"; }
    else { status = "red"; statusLabel = "Trễ"; }

    let assessment;
    if (status === "gray") assessment = `Chưa khởi công (dự kiến ${fmtDate(item.plannedStart)}).`;
    else if (actualPercent >= 100) assessment = `Hoàn thành 100%.`;
    else if (delta >= 3) assessment = `Vượt ${delta.toFixed(1)}% — TT ${actualPercent.toFixed(1)}% / KH ${plannedPercent.toFixed(1)}%.`;
    else if (delta >= -3) assessment = `Đúng tiến độ — TT ${actualPercent.toFixed(1)}% / KH ${plannedPercent.toFixed(1)}%.`;
    else if (delta >= -10) assessment = `Chậm ${Math.abs(delta).toFixed(1)}% — TT ${actualPercent.toFixed(1)}% / KH ${plannedPercent.toFixed(1)}%. Cần theo dõi.`;
    else assessment = `Chậm nghiêm trọng ${Math.abs(delta).toFixed(1)}% — TT ${actualPercent.toFixed(1)}% / KH ${plannedPercent.toFixed(1)}%. Cần can thiệp.`;

    return { ...item, plannedPercent, actualPercent, delta, spi, status, statusLabel, assessment };
  }

  function calcOverall(items, today) {
    const tasks = items.map(it => calcTask(it, today));
    const totalWeight = tasks.reduce((s, t) => s + (Number(t.weight) || 0), 0);
    const w = totalWeight > 0 ? totalWeight : 100;
    const overallPlanned = tasks.reduce((s, t) => s + t.plannedPercent * (Number(t.weight) || 0), 0) / w;
    const overallActual = tasks.reduce((s, t) => s + t.actualPercent * (Number(t.weight) || 0), 0) / w;
    const overallSpi = overallPlanned > 0 ? overallActual / overallPlanned : 0;
    const delta = overallActual - overallPlanned;

    let status;
    if (delta >= -0.5) status = "green";
    else if (delta >= -5) status = "yellow";
    else status = "red";

    const counts = {
      green: tasks.filter(t => t.status === "green").length,
      yellow: tasks.filter(t => t.status === "yellow").length,
      red: tasks.filter(t => t.status === "red").length,
      gray: tasks.filter(t => t.status === "gray").length
    };
    return { tasks, totalWeight, overallPlanned, overallActual, overallSpi, delta, status, counts };
  }

  function computeMilestoneStatus(m, today) {
    if (m.actual) {
      const pa = parseDate(m.planned), ac = parseDate(m.actual);
      if (pa && ac && ac > pa) return "late";
      return "done";
    }
    const pd = parseDate(m.planned);
    if (pd && today > pd) return "late";
    return "upcoming";
  }

  function generateSummaryNote(overall, data) {
    const lines = [];
    const sign = overall.delta >= 0 ? "+" : "";
    lines.push(`Tổng ${overall.tasks.length} công việc: TT ${overall.overallActual.toFixed(1)}% / KH ${overall.overallPlanned.toFixed(1)}% → chênh ${sign}${overall.delta.toFixed(1)}% (SPI ${overall.overallSpi.toFixed(3)}).`);
    if (overall.counts.red > 0) {
      const reds = overall.tasks.filter(t => t.status === "red").sort((a,b)=>a.delta-b.delta).slice(0,3).map(t => `${t.name} (${t.delta.toFixed(1)}%)`).join(', ');
      lines.push(`⚠ ${overall.counts.red} công việc TRỄ: ${reds}${overall.counts.red > 3 ? '…' : ''}.`);
    }
    if (overall.counts.yellow > 0) lines.push(`${overall.counts.yellow} công việc cảnh báo vàng.`);
    if (overall.counts.green > 0) lines.push(`${overall.counts.green} công việc đúng/vượt.`);
    if (overall.counts.gray > 0) lines.push(`${overall.counts.gray} công việc chưa khởi công.`);
    let prefix;
    if (overall.status === "green") prefix = "Dự án ĐÚNG TIẾN ĐỘ.";
    else if (overall.status === "yellow") prefix = `Dự án CHẬM NHẸ ${Math.abs(overall.delta).toFixed(1)}%. Cần tăng tốc.`;
    else prefix = `Dự án CHẬM NGHIÊM TRỌNG ${Math.abs(overall.delta).toFixed(1)}%. Cần can thiệp ngay.`;
    return prefix + " " + lines.join(" ");
  }

  function computeAll(raw) {
    if (!raw) return null;
    const data = JSON.parse(JSON.stringify(raw));
    const today = data.project && data.project.reportDate ? parseDate(data.project.reportDate) : new Date();
    const items = data.workItems || [];

    if (!data.summary) data.summary = {};

    // === Milestones status (độc lập workItems) ===
    if (Array.isArray(data.milestones)) {
      data.milestones = data.milestones.map(m => ({ ...m, status: computeMilestoneStatus(m, today) }));
      data.summary.milestonesTotal = data.milestones.length;
      data.summary.milestonesHit = data.milestones.filter(m => m.status === "done").length;
    }

    if (items.length === 0) return data;

    const overall = calcOverall(items, today);

    // === Summary ===
    data.summary.planned = +overall.overallPlanned.toFixed(1);
    data.summary.actual = +overall.overallActual.toFixed(1);
    data.summary.spi = +overall.overallSpi.toFixed(3);

    if (!data.summary.daysBehind || data.summary.daysBehind <= 0) {
      if (overall.overallSpi > 0 && overall.overallSpi < 1 && data.project.contractStart && data.project.contractEnd) {
        const cs = parseDate(data.project.contractStart);
        const ce = parseDate(data.project.contractEnd);
        const dur = Math.max(1, daysBetween(cs, ce));
        data.summary.daysBehind = Math.round(dur * (1/overall.overallSpi - 1));
      } else {
        data.summary.daysBehind = 0;
      }
    }
    if (!data.summary.forecastFinish && data.project.contractEnd) {
      const ce = parseDate(data.project.contractEnd);
      const f = new Date(ce);
      f.setDate(f.getDate() + (data.summary.daysBehind || 0));
      data.summary.forecastFinish = f.toISOString().slice(0, 10);
    }
    data.summary.note = generateSummaryNote(overall, data);

    // === WBS (sinh từ workItems nếu data.wbs không có) ===
    if (Array.isArray(data.wbs) && data.wbs.length) {
      data.wbs = data.wbs.map(w => {
        const item = items.find(i => (i.wbsCode && i.wbsCode === w.code) || i.code === w.code);
        if (!item) return w;
        const c = calcTask(item, today);
        return { ...w, weight: item.weight ?? w.weight, planned: +c.plannedPercent.toFixed(1), actual: +c.actualPercent.toFixed(1), responsible: item.responsible || w.responsible, status: c.status };
      });
    } else {
      data.wbs = items.map(item => {
        const c = calcTask(item, today);
        return { code: item.wbsCode || item.code, name: item.name, weight: item.weight || 0, planned: +c.plannedPercent.toFixed(1), actual: +c.actualPercent.toFixed(1), responsible: item.responsible || "", status: c.status };
      });
    }

    // === Gantt (sinh từ workItems nếu data.gantt không có) ===
    if (Array.isArray(data.gantt) && data.gantt.length) {
      data.gantt = data.gantt.map(g => {
        const item = items.find(i => (i.ganttCode && i.ganttCode === g.code) || i.code === g.code);
        if (!item) return g;
        const c = calcTask(item, today);
        return { ...g, name: item.name || g.name, plannedStart: item.plannedStart, plannedEnd: item.plannedEnd, actualStart: item.actualStart || g.actualStart, actualEnd: c.actualPercent >= 100 ? (item.actualEnd || g.actualEnd || data.project.reportDate) : (item.actualEnd || null), progress: Math.round(c.actualPercent), status: c.status };
      });
    } else {
      data.gantt = items.map(item => {
        const c = calcTask(item, today);
        return { code: item.ganttCode || item.code, name: item.name, plannedStart: item.plannedStart, plannedEnd: item.plannedEnd, actualStart: item.actualStart || null, actualEnd: c.actualPercent >= 100 ? data.project.reportDate : null, progress: Math.round(c.actualPercent), status: c.status };
      });
    }

    // === Short Report auto-fields ===
    if (!data.shortReport) data.shortReport = {};
    data.shortReport.overallStatus = overall.status;
    data.shortReport.headline = overall.delta < 0
      ? `Dự án chậm ${Math.abs(overall.delta).toFixed(1)}% so với kế hoạch — TT ${overall.overallActual.toFixed(1)}% / KH ${overall.overallPlanned.toFixed(1)}%`
      : `Dự án đúng/vượt tiến độ — TT ${overall.overallActual.toFixed(1)}% / KH ${overall.overallPlanned.toFixed(1)}%`;

    if (!Array.isArray(data.shortReport.keyMetrics)) data.shortReport.keyMetrics = [];
    const setMetric = (label, value) => {
      const m = data.shortReport.keyMetrics.find(k => k.label === label);
      if (m) m.value = value;
      else data.shortReport.keyMetrics.push({ label, value });
    };
    setMetric("Tiến độ TT", overall.overallActual.toFixed(1) + "%");
    setMetric("Kế hoạch", overall.overallPlanned.toFixed(1) + "%");
    setMetric("Chênh lệch", (overall.delta >= 0 ? "+" : "") + overall.delta.toFixed(1) + "%");
    setMetric("SPI", overall.overallSpi.toFixed(3));
    setMetric("Số ngày chậm", (data.summary.daysBehind || 0) + " ngày");
    setMetric("Dự báo HT", fmtDate(data.summary.forecastFinish));

    return data;
  }

  global.ComputeEngine = { calcTask, calcOverall, computeAll, parseDate, fmtDate, daysBetween };
})(window);