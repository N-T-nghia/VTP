document.addEventListener("DOMContentLoaded", () => {
  // Mặc định dùng data.js (nguồn chân lý). Chỉ dùng localStorage khi ?preview
  const useLocal = new URLSearchParams(location.search).has("preview");
  const local = useLocal ? localStorage.getItem("reportData") : null;
  const raw = local ? JSON.parse(local) : window.reportData;

  // Compute từ workItems → full data
  const data = window.ComputeEngine ? window.ComputeEngine.computeAll(raw) : raw;

  initHeader(data);
  initProjectInfo(data);
  initShortReport(data);
  initKPIs(data);
  initCharts(data);
  initWBS(data);
  initGantt(data);
  initMilestones(data);
  initPhotos(data);
  initWeekly(data);
  initMeasures(data);
  initRisks(data);
});

/* ============ HELPERS ============ */
const parseDate = s => new Date(s + "T00:00:00");
const fmtDate = s => {
  if (!s) return "—";
  const d = parseDate(s);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};
const daysBetween = (a, b) => (b - a) / (1000 * 60 * 60 * 24);
const statusClass = s => s === "green" ? "green" : s === "yellow" ? "yellow" : s === "red" ? "red" : "gray";
const statusLabel = s => s === "green" ? "Đúng / Vượt" : s === "yellow" ? "Cảnh báo" : s === "red" ? "Trễ" : "Chưa bắt đầu";

function initHeader(data) {
  const p = data.project;
  document.getElementById("project-name").textContent = p.name;
  document.getElementById("project-meta").textContent =
    `${p.code} · ${p.location} · Giá trị HĐ: ${p.contractValue}`;
  document.getElementById("revision").textContent = p.revision;
  document.getElementById("updated-at").textContent = "Cập nhật: " + fmtDate(p.reportDate);
  document.getElementById("footer-info").textContent =
    `Người lập: ${p.preparedBy} · Phê duyệt: ${p.approvedBy} · ${p.revision}`;
}

function initShortReport(data) {
  const s = data.shortReport;
  document.getElementById("sr-period").textContent = s.period;
  document.getElementById("sr-title").textContent = s.title;
  document.getElementById("sr-headline").textContent = s.headline;
  const badge = document.getElementById("sr-status");
  badge.textContent = s.overallStatus === "green" ? "Đúng tiến độ" : s.overallStatus === "yellow" ? "Cần theo dõi" : "Nghiêm trọng";
  badge.className = "pill " + s.overallStatus;

  document.getElementById("sr-metrics").innerHTML = s.keyMetrics.map(m => `
    <div class="sr-metric">
      <div class="sr-metric-label">${m.label}</div>
      <div class="sr-metric-value">${m.value}</div>
    </div>
  `).join("");

  const list = (id, items) => {
    document.getElementById(id).innerHTML = items.map(i => `<li>${i}</li>`).join("");
  };
  list("sr-highlights", s.highlights);
  list("sr-issues", s.topIssues);
  list("sr-actions", s.topActions);
  document.getElementById("sr-conclusion").textContent = s.conclusion;
}

function initProjectInfo(data) {
  const p = data.project;
  const items = [
    ["Chủ đầu tư", p.investor],
    ["Nhà thầu chính", p.contractor],
    ["Tư vấn giám sát", p.supervisor],
    ["Giá trị hợp đồng", p.contractValue],
    ["Khởi công (HĐ)", fmtDate(p.contractStart)],
    ["Hoàn thành (HĐ)", fmtDate(p.contractEnd)],
    ["Dự báo hoàn thành", fmtDate(data.summary.forecastFinish)],
    ["Người lập báo cáo", p.preparedBy]
  ];
  document.getElementById("project-info").innerHTML = items.map(([k, v]) => `
    <div class="info-item">
      <div class="label">${k}</div>
      <div class="value">${v}</div>
    </div>
  `).join("");
}

function initKPIs(data) {
  const s = data.summary;
  const delta = (s.actual - s.planned).toFixed(1);
  const deltaClass = delta >= -0.5 ? "green" : delta >= -5 ? "yellow" : "red";
  const spiClass = s.spi >= 0.98 ? "green" : s.spi >= 0.9 ? "yellow" : "red";

  const kpis = [
    { label: "Tiến độ thực tế", value: s.actual + "%", sub: `Kế hoạch: ${s.planned}%`, cls: "blue" },
    { label: "Chênh lệch", value: (delta >= 0 ? "+" : "") + delta + "%", sub: delta < 0 ? "Chậm hơn kế hoạch" : "Vượt kế hoạch", cls: deltaClass },
    { label: "SPI", value: s.spi.toFixed(3), sub: s.spi >= 1 ? "Đúng tiến độ" : "Đang chậm", cls: spiClass },
    { label: "Số ngày chậm", value: s.daysBehind + " ngày", sub: "So với baseline", cls: s.daysBehind <= 7 ? "yellow" : "red" },
    { label: "Mốc đạt được", value: `${s.milestonesHit}/${s.milestonesTotal}`, sub: "Milestones", cls: s.milestonesHit >= s.milestonesTotal * 0.75 ? "green" : "yellow" },
    { label: "Dự báo hoàn thành", value: fmtDate(s.forecastFinish), sub: "Theo xu hướng hiện tại", cls: "blue" }
  ];

  document.getElementById("kpi-grid").innerHTML = kpis.map(k => `
    <div class="kpi ${k.cls}">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>
  `).join("");
  document.getElementById("summary-note").textContent = s.note;
}

function initCharts(data) {
  new Chart(document.getElementById("sCurveChart"), {
    type: "line",
    data: {
      labels: data.sCurve.labels,
      datasets: [
        { label: "Kế hoạch (%)", data: data.sCurve.planned, borderColor: "#94a3b8", backgroundColor: "rgba(148,163,184,0.1)", borderDash: [6, 4], borderWidth: 2, pointRadius: 3, pointBackgroundColor: "#94a3b8", tension: 0.35 },
        { label: "Thực tế (%)", data: data.sCurve.actual, borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,0.15)", borderWidth: 3, pointRadius: 4, pointBackgroundColor: "#2563eb", tension: 0.35, fill: true }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: "top", labels: { font: { size: 12, weight: "600" }, boxWidth: 14 } },
        tooltip: { callbacks: { label: c => `${c.dataset.label}: ${c.parsed.y?.toFixed(1) ?? "—"}%` } }
      },
      scales: {
        y: { beginAtZero: true, max: 100, ticks: { callback: v => v + "%", font: { size: 11 } }, grid: { color: "#f1f5f9" } },
        x: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  });

  new Chart(document.getElementById("manpowerChart"), {
    type: "bar",
    data: {
      labels: data.manpower.labels,
      datasets: [
        { label: "Kế hoạch", data: data.manpower.planned, backgroundColor: "#cbd5e1", borderRadius: 4 },
        { label: "Thực tế", data: data.manpower.actual, backgroundColor: "#2563eb", borderRadius: 4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "top", labels: { font: { size: 12, weight: "600" }, boxWidth: 14 } } },
      scales: {
        y: { beginAtZero: true, ticks: { font: { size: 11 } }, grid: { color: "#f1f5f9" } },
        x: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  });
}

function initWBS(data) {
  const tbody = document.querySelector("#wbs-table tbody");
  const tfoot = document.querySelector("#wbs-table tfoot");
  tbody.innerHTML = data.wbs.map(w => {
    const delta = (w.actual - w.planned).toFixed(1);
    const dClass = delta >= -0.5 ? "delta-pos" : delta >= -5 ? "delta-zero" : "delta-neg";
    const barColor = w.status === "green" ? "var(--green)" : w.status === "yellow" ? "var(--yellow)" : w.status === "red" ? "var(--red)" : "var(--muted)";
    return `
      <tr>
        <td><strong>${w.code}</strong></td>
        <td>${w.name}<div class="progress-mini"><div style="width:${w.actual}%; background:${barColor}"></div></div></td>
        <td class="num">${w.weight}</td>
        <td class="num">${w.planned}</td>
        <td class="num"><strong>${w.actual}</strong></td>
        <td class="num"><span class="${dClass}">${delta >= 0 ? "+" : ""}${delta}</span></td>
        <td>${w.responsible}</td>
        <td><span class="pill ${statusClass(w.status)}">${statusLabel(w.status)}</span></td>
      </tr>`;
  }).join("");

  const tw = data.wbs.reduce((s, w) => s + w.weight, 0);
  const tp = data.wbs.reduce((s, w) => s + w.weight * w.planned / 100, 0);
  const ta = data.wbs.reduce((s, w) => s + w.weight * w.actual / 100, 0);
  const d = (ta - tp).toFixed(2);
  tfoot.innerHTML = `
    <tr>
      <td colspan="2">TỔNG CỘNG (theo trọng số)</td>
      <td class="num">${tw}</td>
      <td class="num">${tp.toFixed(1)}</td>
      <td class="num">${ta.toFixed(1)}</td>
      <td class="num ${d >= 0 ? "delta-pos" : "delta-neg"}">${d >= 0 ? "+" : ""}${d}</td>
      <td colspan="2">SPI = ${(ta / tp || 0).toFixed(3)}</td>
    </tr>`;
}

function initGantt(data) {
  const g = data.gantt;
  if (!g || !g.length) {
    document.getElementById("gantt-wrap").innerHTML = '<p style="padding:20px;color:var(--muted)">Chưa có công việc nào.</p>';
    return;
  }
  const allDates = [];
  g.forEach(t => ["plannedStart","plannedEnd","actualStart","actualEnd"].forEach(k => { if (t[k]) allDates.push(parseDate(t[k])); }));
  if (!allDates.length) return;
  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));
  const totalDays = daysBetween(minDate, maxDate);
  // Tự co giãn: đảm bảo timeline tối thiểu ~900px dù dự án ngắn
  const pxPerDay = Math.max(2.6, 900 / Math.max(totalDays, 30));
  const timelineWidth = totalDays * pxPerDay;
  const today = parseDate(data.project.reportDate);
  const todayLeft = daysBetween(minDate, today) * pxPerDay;

  const months = [];
  let cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  while (cursor <= maxDate) {
    const mStart = new Date(Math.max(cursor, minDate));
    const nextM = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const mEnd = new Date(Math.min(nextM, maxDate));
    const days = daysBetween(mStart, mEnd);
    if (days > 0) months.push({ label: `T${cursor.getMonth() + 1}·${String(cursor.getFullYear()).slice(2)}`, width: days * pxPerDay });
    cursor = nextM;
  }
  const headerCells = months.map(m => `<div class="gantt-month" style="width:${m.width}px">${m.label}</div>`).join("");

  const rows = g.map(t => {
    if (!t.plannedStart || !t.plannedEnd) return "";
    const ps = parseDate(t.plannedStart), pe = parseDate(t.plannedEnd);
    const pl = daysBetween(minDate, ps) * pxPerDay;
    const pw = Math.max(daysBetween(ps, pe) * pxPerDay, 3);
    const color = t.status === "green" ? "#16a34a" : t.status === "yellow" ? "#ca8a04" : t.status === "red" ? "#dc2626" : "#94a3b8";
    let actualHTML = "";
    if (t.actualStart) {
      const as = parseDate(t.actualStart);
      const ae = t.actualEnd ? parseDate(t.actualEnd) : today;
      const al = daysBetween(minDate, as) * pxPerDay;
      const aw = Math.max(daysBetween(as, ae) * pxPerDay, 4);
      actualHTML = `
        <div class="gantt-bar-actual" style="left:${al}px;width:${aw}px;background:${color}25;border:1px solid ${color}">
          <div class="gantt-bar-fill" style="width:${t.progress}%;background:${color}"></div>
        </div>`;
    }
    return `
      <div class="gantt-row">
        <div class="gantt-label">
          <span class="gantt-code">${t.code}</span>
          <span class="gantt-name">${t.name}</span>
          <span class="gantt-pct">${t.progress}% hoàn thành</span>
        </div>
        <div class="gantt-track" style="width:${timelineWidth}px">
          <div class="gantt-bar-plan" style="left:${pl}px;width:${pw}px"></div>
          ${actualHTML}
        </div>
      </div>`;
  }).join("");

  document.getElementById("gantt-wrap").innerHTML = `
    <div class="gantt-grid" style="width:${240 + timelineWidth}px">
      <div class="gantt-header">
        <div class="gantt-header-label">Hạng mục / Công việc</div>
        <div class="gantt-header-track" style="width:${timelineWidth}px">${headerCells}</div>
      </div>
      <div class="gantt-body">${rows}<div class="gantt-today" style="left:${240 + todayLeft}px"></div></div>
    </div>`;
}

function initMilestones(data) {
  document.getElementById("milestone-track").innerHTML = data.milestones.map(m => {
    let cls = m.status === "done" ? "done" : m.status === "late" ? "late" : "upcoming";
    return `
      <div class="milestone ${cls}">
        <div class="milestone-name">${m.name}</div>
        <div class="milestone-date">KH: ${fmtDate(m.planned)}</div>
        ${m.actual ? `<div class="milestone-date actual">TT: ${fmtDate(m.actual)}</div>` : ""}
      </div>`;
  }).join("");
}

function initPhotos(data) {
  const grid = document.getElementById("photo-grid");
  const filters = document.getElementById("photo-filters");
  if (!data.photos || data.photos.length === 0) {
    grid.innerHTML = `<div class="photo-empty">Chưa có ảnh nào. Vào trang Quản trị để thêm ảnh.</div>`;
    return;
  }
  const cats = ["Tất cả", ...new Set(data.photos.map(p => p.category).filter(Boolean))];

  const render = (cat) => {
    const list = cat === "Tất cả" ? data.photos : data.photos.filter(p => p.category === cat);
    grid.innerHTML = list.map((p, i) => `
      <div class="photo-item" onclick='openLightbox(${JSON.stringify(p).replace(/'/g, "&#39;")})'>
        <img src="${p.url}" alt="${p.caption || ''}" loading="lazy">
        <div class="photo-item-overlay">
          <div class="photo-item-caption">${p.caption || ""}</div>
          <div class="photo-item-meta">${p.date || ""}${p.location ? " · " + p.location : ""}</div>
        </div>
      </div>`).join("");
  };

  filters.innerHTML = cats.map((c, i) => `<button class="photo-chip ${i === 0 ? "active" : ""}" data-cat="${c}">${c}</button>`).join("");
  filters.addEventListener("click", e => {
    const btn = e.target.closest(".photo-chip");
    if (!btn) return;
    filters.querySelectorAll(".photo-chip").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    render(btn.dataset.cat);
  });
  render("Tất cả");
}

function openLightbox(photo) {
  document.getElementById("lightbox-img").src = photo.url;
  document.getElementById("lightbox-title").textContent = photo.caption || "";
  document.getElementById("lightbox-meta").textContent =
    [photo.date, photo.location, photo.category].filter(Boolean).join(" · ");
  document.getElementById("lightbox").classList.add("active");
}
function closeLightbox() { document.getElementById("lightbox").classList.remove("active"); }
document.addEventListener("keydown", e => { if (e.key === "Escape") closeLightbox(); });
document.getElementById("lightbox")?.addEventListener("click", closeLightbox);

function initWeekly(data) {
  document.querySelector("#weekly-table tbody").innerHTML = data.weeklyTasks.map((t, i) => {
    const prioClass = t.priority === "high" ? "red" : t.priority === "medium" ? "yellow" : "gray";
    const prioLabel = t.priority === "high" ? "Cao" : t.priority === "medium" ? "TB" : "Thấp";
    return `<tr>
      <td>${i + 1}</td><td><strong>${t.task}</strong></td><td>${t.location}</td>
      <td>${t.start}</td><td>${t.end}</td><td>${t.responsible}</td>
      <td><span class="pill ${prioClass}">${prioLabel}</span></td></tr>`;
  }).join("");
}

function initMeasures(data) {
  document.querySelector("#measures-table tbody").innerHTML = data.measures.map(m => {
    const cls = m.status === "Hoàn thành" ? "green" : m.status === "Đang thực hiện" ? "yellow" : "gray";
    return `<tr>
      <td>${m.issue}</td><td>${m.action}</td><td>${m.owner}</td><td>${m.deadline}</td>
      <td><span class="pill ${cls}">${m.status}</span></td></tr>`;
  }).join("");
}

function initRisks(data) {
  document.querySelector("#risks-table tbody").innerHTML = data.risks.map(r => {
    const sevLabel = r.severity === "high" ? "Cao" : r.severity === "medium" ? "TB" : "Thấp";
    return `<tr>
      <td><strong>${r.id}</strong></td><td>${r.description}</td><td>${r.impact}</td>
      <td><span class="pill ${r.severity === "high" ? "red" : r.severity === "medium" ? "yellow" : "green"}">${sevLabel}</span></td>
      <td>${r.mitigation}</td><td>${r.owner}</td></tr>`;
  }).join("");
}