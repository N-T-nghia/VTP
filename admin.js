let data = null;
let activeTab = "workItems";

const CE = () => window.ComputeEngine;
const esc = s => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const fmtDate = s => window.ComputeEngine ? window.ComputeEngine.fmtDate(s) : s;
const parseDate = s => window.ComputeEngine ? window.ComputeEngine.parseDate(s) : new Date(s);

/* ============ SCHEMAS ============ */
const schemas = {
  project: {
    title: "Thông tin dự án", type: "scalar",
    fields: [
      { key: "name", label: "Tên dự án", type: "text" },
      { key: "code", label: "Mã dự án", type: "text" },
      { key: "location", label: "Địa điểm", type: "text", full: true },
      { key: "investor", label: "Chủ đầu tư", type: "text" },
      { key: "contractor", label: "Nhà thầu chính", type: "text" },
      { key: "supervisor", label: "Tư vấn giám sát", type: "text" },
      { key: "contractValue", label: "Giá trị HĐ", type: "text" },
      { key: "contractStart", label: "Khởi công", type: "date" },
      { key: "contractEnd", label: "Hoàn thành HĐ", type: "date" },
      { key: "reportDate", label: "Ngày báo cáo", type: "date" },
      { key: "revision", label: "Kỳ báo cáo", type: "text" },
      { key: "preparedBy", label: "Người lập", type: "text" },
      { key: "approvedBy", label: "Người phê duyệt", type: "text" }
    ]
  },
  workItems: {
    title: "Công việc & Tiến độ",
    type: "computed",
    hint: "Nhập KL kế hoạch, KL thực tế, ngày KH. Hệ thống tự tính %KH, %TT, chênh lệch, SPI, trạng thái, đánh giá. Các bảng WBS / Gantt / Tóm tắt / KeyMetrics / Milestone status tự sinh khi export.",
    fields: [
      { key: "code", label: "Mã", type: "text" },
      { key: "name", label: "Công việc", type: "text", full: true },
      { key: "unit", label: "ĐVT", type: "text" },
      { key: "plannedVolume", label: "KL kế hoạch", type: "number", step: 0.01 },
      { key: "actualVolume", label: "KL thực tế", type: "number", step: 0.01 },
      { key: "plannedStart", label: "KH bắt đầu", type: "date" },
      { key: "plannedEnd", label: "KH kết thúc", type: "date" },
      { key: "actualStart", label: "TT bắt đầu", type: "date" },
      { key: "actualEnd", label: "TT kết thúc", type: "date" },
      { key: "plannedPercentOverride", label: "Ghi đè %KH (tuỳ chọn)", type: "number", step: 0.1 },
      { key: "weight", label: "Trọng số (%)", type: "number", step: 0.1 },
      { key: "responsible", label: "Phụ trách", type: "text" },
      { key: "wbsCode", label: "Mã WBS", type: "text" },
      { key: "ganttCode", label: "Mã Gantt", type: "text" }
    ]
  },
  shortReport: {
    title: "Văn bản báo cáo", type: "mixed",
    hint: "Headline, overallStatus, keyMetrics tự sinh từ bảng Công việc. Chỉ nhập văn bản định tính.",
    fields: [
      { key: "title", label: "Tiêu đề", type: "text" },
      { key: "period", label: "Kỳ báo cáo", type: "text" },
      { key: "conclusion", label: "Kết luận", type: "textarea", rows: 3, full: true }
    ],
    stringArrays: [
      { key: "highlights", label: "Điểm nổi bật (mỗi dòng 1 ý)" },
      { key: "topIssues", label: "Vấn đề chính (mỗi dòng 1 ý)" },
      { key: "topActions", label: "Hành động chính (mỗi dòng 1 ý)" }
    ]
  },
  sCurve: {
    title: "Đường cong S", type: "scalar",
    fields: [
      { key: "labels", label: "Nhãn (cách nhau dấu phẩy)", type: "text", full: true },
      { key: "planned", label: "Kế hoạch % (cách nhau dấu phẩy)", type: "text", full: true },
      { key: "actual", label: "Thực tế % (cách nhau dấu phẩy, trống cho tháng tương lai)", type: "text", full: true }
    ],
    commaArrays: ["labels", "planned", "actual"]
  },
  manpower: {
    title: "Nhân lực", type: "scalar",
    fields: [
      { key: "labels", label: "Nhãn (cách nhau dấu phẩy)", type: "text", full: true },
      { key: "planned", label: "Kế hoạch", type: "text", full: true },
      { key: "actual", label: "Thực tế", type: "text", full: true }
    ],
    commaArrays: ["labels", "planned", "actual"]
  },
  milestones: {
    title: "Mốc tiến độ", type: "array",
    hint: "Status (done/late/upcoming) tự tính từ ngày.",
    fields: [
      { key: "name", label: "Tên mốc", type: "text" },
      { key: "planned", label: "Kế hoạch", type: "date" },
      { key: "actual", label: "Thực tế", type: "date" }
    ]
  },
  photos: {
    title: "Hình ảnh", type: "array",
    hint: "URL ảnh tương đối hoặc đầy đủ.",
    fields: [
      { key: "url", label: "URL ảnh", type: "text", full: true },
      { key: "caption", label: "Chú thích", type: "text", full: true },
      { key: "date", label: "Ngày", type: "date" },
      { key: "location", label: "Vị trí", type: "text" },
      { key: "category", label: "Danh mục", type: "text" }
    ]
  },
  weeklyTasks: {
    title: "Công việc tuần", type: "array",
    fields: [
      { key: "task", label: "Công việc", type: "text", full: true },
      { key: "location", label: "Khu vực", type: "text" },
      { key: "start", label: "Bắt đầu", type: "text" },
      { key: "end", label: "Kết thúc", type: "text" },
      { key: "responsible", label: "Phụ trách", type: "text" },
      { key: "priority", label: "Ưu tiên", type: "select", options: [
        { value: "high", label: "Cao" }, { value: "medium", label: "TB" }, { value: "low", label: "Thấp" }
      ]}
    ]
  },
  measures: {
    title: "Biện pháp", type: "array",
    fields: [
      { key: "issue", label: "Vấn đề", type: "text", full: true },
      { key: "action", label: "Biện pháp", type: "text", full: true },
      { key: "owner", label: "Người thực hiện", type: "text" },
      { key: "deadline", label: "Deadline", type: "text" },
      { key: "status", label: "Trạng thái", type: "select", options: [
        { value: "Đang thực hiện", label: "Đang thực hiện" },
        { value: "Hoàn thành", label: "Hoàn thành" },
        { value: "Chưa bắt đầu", label: "Chưa bắt đầu" }
      ]}
    ]
  },
  risks: {
    title: "Rủi ro", type: "array",
    fields: [
      { key: "id", label: "Mã", type: "text" },
      { key: "description", label: "Mô tả", type: "text", full: true },
      { key: "impact", label: "Tác động", type: "text", full: true },
      { key: "severity", label: "Mức độ", type: "select", options: [
        { value: "high", label: "Cao" }, { value: "medium", label: "TB" }, { value: "low", label: "Thấp" }
      ]},
      { key: "mitigation", label: "Biện pháp giảm thiểu", type: "text", full: true },
      { key: "owner", label: "Phụ trách", type: "text" }
    ]
  }
};

/* ============ HELPERS ============ */
function setVal(path, value) {
  const keys = path.split(".");
  let obj = data;
  for (let i = 0; i < keys.length - 1; i++) {
    if (obj[keys[i]] == null) obj[keys[i]] = {};
    obj = obj[keys[i]];
  }
  obj[keys[keys.length - 1]] = value;
}
function getArrayFields(basePath) {
  const keys = basePath.split(".");
  const schema = schemas[keys[0]];
  return schema && schema.fields ? schema.fields : null;
}

/* Chuẩn hóa data: bỏ các field computed (để export gọn, compute lại khi load) */
function normalizeData(d) {
  delete d.wbs;
  delete d.gantt;
  if (d.shortReport) {
    delete d.shortReport.keyMetrics;
    delete d.shortReport.headline;
    delete d.shortReport.overallStatus;
  }
  if (Array.isArray(d.milestones)) {
    d.milestones = d.milestones.map(m => ({ name: m.name, planned: m.planned, actual: m.actual }));
  }
  if (d.summary) {
    const keep = {};
    if (d.summary.daysBehind) keep.daysBehind = d.summary.daysBehind;
    if (d.summary.forecastFinish) keep.forecastFinish = d.summary.forecastFinish;
    d.summary = keep;
  }
  if (!Array.isArray(d.workItems)) d.workItems = [];
  return d;
}

/* ============ INIT ============ */
function init() {
  const local = localStorage.getItem("reportData");
  try { data = local ? JSON.parse(local) : JSON.parse(JSON.stringify(window.reportData)); }
  catch (e) { data = JSON.parse(JSON.stringify(window.reportData)); }
  if (!data) {
    document.getElementById("admin-main").innerHTML = '<div class="admin-section"><h2>Lỗi</h2><p>Không đọc được data.js</p></div>';
    return;
  }
  normalizeData(data);

  renderTabs();
  renderTab(activeTab);

  document.getElementById("btn-save").addEventListener("click", saveLocal);
  document.getElementById("btn-export").addEventListener("click", exportData);
  document.getElementById("btn-reset").addEventListener("click", resetLocal);
  document.getElementById("btn-import").addEventListener("change", importData);
  document.getElementById("admin-tabs").addEventListener("click", e => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    activeTab = btn.dataset.tab;
    renderTabs();
    renderTab(activeTab);
  });
}

function renderTabs() {
  document.getElementById("admin-tabs").innerHTML = Object.entries(schemas).map(([key, s]) =>
    `<button data-tab="${key}" class="${key === activeTab ? "active" : ""}">${s.title}</button>`
  ).join("");
}

/* ============ RENDER TAB ============ */
function renderTab(tabKey) {
  const s = schemas[tabKey];
  const container = document.getElementById("admin-main");
  container.innerHTML = `<div class="admin-section"><h2>${s.title}</h2>${
    s.hint ? `<p style="font-size:12px;color:#64748b;margin-bottom:12px;">${s.hint}</p>` : ""
  }<div id="admin-fields"></div></div>`;

  const fieldsEl = document.getElementById("admin-fields");

  if (s.type === "scalar" || s.type === "mixed") {
    const grid = document.createElement("div");
    grid.className = "admin-grid";
    grid.innerHTML = s.fields.map(f => {
      let val = data[tabKey] ? data[tabKey][f.key] : "";
      if (s.commaArrays && s.commaArrays.includes(f.key) && Array.isArray(val)) {
        val = val.map(v => v == null ? "" : v).join(", ");
      }
      return renderField(f, `${tabKey}.${f.key}`, val);
    }).join("");
    fieldsEl.appendChild(grid);

    if (s.stringArrays) {
      s.stringArrays.forEach(arr => {
        const items = (data[tabKey] && data[tabKey][arr.key] || []).join("\n");
        const wrap = document.createElement("div");
        wrap.className = "admin-field admin-field-full";
        wrap.style.marginTop = "14px";
        wrap.innerHTML = `<span class="admin-label">${esc(arr.label)}</span><textarea data-path="${tabKey}.${arr.key}__lines" rows="4">${esc(items)}</textarea>`;
        fieldsEl.appendChild(wrap);
      });
    }
  } else if (s.type === "array") {
    renderObjectArray(fieldsEl, tabKey, s.fields);
  } else if (s.type === "computed") {
    renderComputedArray(fieldsEl, tabKey, s);
  }
}

function renderField(field, path, val) {
  val = val ?? "";
  let input;
  if (field.type === "textarea") {
    input = `<textarea data-path="${path}" rows="${field.rows || 2}">${esc(val)}</textarea>`;
  } else if (field.type === "select") {
    input = `<select data-path="${path}">${field.options.map(o =>
      `<option value="${esc(o.value)}" ${o.value === val ? "selected" : ""}>${esc(o.label)}</option>`).join("")}</select>`;
  } else {
    input = `<input type="${field.type || "text"}" data-path="${path}" value="${esc(val)}" ${field.step ? `step="${field.step}"` : ""}>`;
  }
  return `<label class="admin-field ${field.full ? "admin-field-full" : ""}">
    <span class="admin-label">${esc(field.label)}</span>${input}</label>`;
}

function renderObjectArray(container, basePath, fields) {
  const keys = basePath.split(".");
  let arr = data;
  for (const k of keys) arr = arr[k];
  if (!Array.isArray(arr)) arr = data[basePath] = [];

  container.innerHTML = "";
  arr.forEach((item, idx) => {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <div class="admin-row-header">
        <span class="admin-row-num">#${idx + 1}</span>
        <button type="button" class="btn-icon btn-danger" data-action="del" data-path="${basePath}" data-index="${idx}">×</button>
      </div>
      <div class="admin-row-fields">
        ${fields.map(f => renderField(f, `${basePath}.${idx}.${f.key}`, item[f.key])).join("")}
      </div>`;
    container.appendChild(row);
  });

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "btn-add";
  addBtn.textContent = "+ Thêm dòng";
  addBtn.dataset.action = "add";
  addBtn.dataset.path = basePath;
  container.appendChild(addBtn);
}

/* ============ COMPUTED ARRAY ============ */
function renderComputedArray(container, tabKey, schema) {
  const items = data[tabKey] || [];
  const today = data.project && data.project.reportDate ? parseDate(data.project.reportDate) : new Date();
  const overall = CE().calcOverall(items, today);

  const summary = document.createElement("div");
  summary.className = "computed-summary";
  summary.innerHTML = renderComputedSummary(overall);
  container.appendChild(summary);

  const hint = document.createElement("p");
  hint.className = "computed-hint";
  hint.textContent = "Nhập liệu bên dưới — các ô %KH, %TT, Chênh lệch, SPI, Trạng thái, Đánh giá tự cập nhật ngay.";
  container.appendChild(hint);

  const rowsWrap = document.createElement("div");
  rowsWrap.className = "computed-rows";
  container.appendChild(rowsWrap);

  items.forEach((item, idx) => {
    rowsWrap.appendChild(createComputedRow(tabKey, idx, item, schema.fields, today));
  });

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "btn-add";
  addBtn.textContent = "+ Thêm công việc";
  addBtn.dataset.action = "add";
  addBtn.dataset.path = tabKey;
  container.appendChild(addBtn);
}

function renderComputedSummary(overall) {
  const statusLabel = overall.status === "green" ? "✓ ĐÚNG / VƯỢT TIẾN ĐỘ"
                    : overall.status === "yellow" ? "⚠ CẢNH BÁO" : "✕ CHẬM";
  const deltaClass = overall.delta >= -0.5 ? "text-green" : overall.delta >= -5 ? "text-yellow" : "text-red";
  const lines = [];
  if (overall.counts.red > 0) lines.push(`${overall.counts.red} TRỄ`);
  if (overall.counts.yellow > 0) lines.push(`${overall.counts.yellow} cảnh báo`);
  if (overall.counts.green > 0) lines.push(`${overall.counts.green} đúng/vượt`);
  if (overall.counts.gray > 0) lines.push(`${overall.counts.gray} chưa khởi công`);

  return `
    <div class="computed-summary-head">
      <div class="computed-summary-kpis">
        <div><div class="csk-label">Tiến độ KH</div><div class="csk-val">${overall.overallPlanned.toFixed(1)}%</div></div>
        <div><div class="csk-label">Tiến độ TT</div><div class="csk-val">${overall.overallActual.toFixed(1)}%</div></div>
        <div><div class="csk-label">Chênh lệch</div><div class="csk-val ${deltaClass}">${overall.delta >= 0 ? '+' : ''}${overall.delta.toFixed(1)}%</div></div>
        <div><div class="csk-label">SPI</div><div class="csk-val">${overall.overallSpi.toFixed(3)}</div></div>
        <div><div class="csk-label">Ngày tham chiếu</div><div class="csk-val" style="font-size:14px;">${fmtDate(data.project.reportDate)}</div></div>
      </div>
      <div class="computed-summary-status status-${overall.status}">${statusLabel}</div>
    </div>
    <div class="computed-summary-assessment"><strong>${overall.tasks.length} công việc:</strong> ${lines.join(" · ")}</div>
  `;
}

function createComputedRow(tabKey, idx, item, fields, today) {
  const calc = CE().calcTask(item, today);
  const row = document.createElement("div");
  row.className = "computed-row";
  row.dataset.index = idx;
  const basePath = `${tabKey}.${idx}`;
  row.innerHTML = `
    <div class="computed-row-header">
      <span class="admin-row-num">#${idx + 1} — ${esc(item.name || '(chưa đặt tên)')}</span>
      <button type="button" class="btn-icon btn-danger" data-action="del" data-path="${tabKey}" data-index="${idx}">×</button>
    </div>
    <div class="computed-row-inputs">
      ${fields.map(f => renderField(f, `${basePath}.${f.key}`, item[f.key])).join("")}
    </div>
    <div class="computed-row-output">${renderComputedOutput(calc)}</div>`;
  return row;
}

function renderComputedOutput(calc) {
  const color = calc.status === "green" ? "#16a34a" : calc.status === "yellow" ? "#ca8a04" : calc.status === "red" ? "#dc2626" : "#94a3b8";
  const deltaClass = calc.delta >= -0.5 ? "text-green" : calc.delta >= -5 ? "text-yellow" : "text-red";
  return `
    <div class="computed-cell">
      <div class="cc-label">% KH</div>
      <div class="cc-value">${calc.plannedPercent.toFixed(1)}%</div>
      <div class="cc-bar"><div style="width:${calc.plannedPercent}%;background:#94a3b8"></div></div>
    </div>
    <div class="computed-cell">
      <div class="cc-label">% TT</div>
      <div class="cc-value" style="color:${color}">${calc.actualPercent.toFixed(1)}%</div>
      <div class="cc-bar"><div style="width:${calc.actualPercent}%;background:${color}"></div></div>
    </div>
    <div class="computed-cell">
      <div class="cc-label">Chênh lệch</div>
      <div class="cc-value ${deltaClass}">${calc.delta >= 0 ? '+' : ''}${calc.delta.toFixed(1)}%</div>
    </div>
    <div class="computed-cell">
      <div class="cc-label">SPI</div>
      <div class="cc-value">${calc.spi.toFixed(3)}</div>
    </div>
    <div class="computed-cell">
      <div class="cc-label">Trạng thái</div>
      <div class="cc-value"><span class="pill ${calc.status}">${calc.statusLabel}</span></div>
    </div>
    <div class="computed-cell computed-cell-wide">
      <div class="cc-label">Đánh giá</div>
      <div class="cc-assessment">${esc(calc.assessment)}</div>
    </div>`;
}

function refreshComputedRow(rowEl, tabKey, idx) {
  if (!rowEl) return;
  const today = data.project && data.project.reportDate ? parseDate(data.project.reportDate) : new Date();
  const item = data[tabKey][idx];
  if (!item) return;
  const calc = CE().calcTask(item, today);
  const out = rowEl.querySelector(".computed-row-output");
  if (out) out.innerHTML = renderComputedOutput(calc);
  const header = rowEl.querySelector(".admin-row-num");
  if (header) header.textContent = `#${idx + 1} — ${item.name || '(chưa đặt tên)'}`;
}

function refreshComputedSummary(tabKey) {
  const today = data.project && data.project.reportDate ? parseDate(data.project.reportDate) : new Date();
  const overall = CE().calcOverall(data[tabKey], today);
  const summary = document.querySelector(".computed-summary");
  if (summary) summary.innerHTML = renderComputedSummary(overall);
}

/* ============ EVENT: INPUT ============ */
document.getElementById("admin-main").addEventListener("input", e => {
  const el = e.target;
  if (!el.dataset.path) return;
  const path = el.dataset.path;
  let val = el.value;

  if (path.endsWith("__lines")) {
    setVal(path.replace("__lines", ""), val.split("\n").map(s => s.trim()).filter(Boolean));
    return;
  }

  if (el.type === "number") {
    if (path.endsWith(".plannedPercentOverride") && val === "") setVal(path, null);
    else { const n = parseFloat(val); setVal(path, isNaN(n) ? 0 : n); }
    const tabKey = path.split(".")[0];
    if (schemas[tabKey] && schemas[tabKey].type === "computed") {
      const rowEl = el.closest(".computed-row");
      if (rowEl) refreshComputedRow(rowEl, tabKey, parseInt(rowEl.dataset.index, 10));
      refreshComputedSummary(tabKey);
    }
    return;
  }

  const parts = path.split(".");
  const tabKey = parts[0];
  const lastKey = parts[parts.length - 1];
  const schema = schemas[tabKey];

  if (schema && schema.commaArrays && schema.commaArrays.includes(lastKey)) {
    const arr = val.split(",").map(s => s.trim()).map(s => {
      if (s === "") return null;
      const n = parseFloat(s);
      return isNaN(n) ? s : n;
    });
    setVal(path, arr);
    return;
  }

  setVal(path, val);

  if (schema && schema.type === "computed") {
    const rowEl = el.closest(".computed-row");
    if (rowEl) refreshComputedRow(rowEl, tabKey, parseInt(rowEl.dataset.index, 10));
    refreshComputedSummary(tabKey);
  }
});

/* ============ EVENT: CLICK ============ */
document.getElementById("admin-main").addEventListener("click", e => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const path = btn.dataset.path;
  const keys = path.split(".");
  let arr = data;
  for (const k of keys) arr = arr[k];
  if (!Array.isArray(arr)) return;

  if (action === "add") {
    const fields = getArrayFields(path);
    if (!fields) return;
    const newItem = {};
    fields.forEach(f => {
      if (f.type === "number") newItem[f.key] = f.key === "plannedPercentOverride" ? null : 0;
      else if (f.type === "select") newItem[f.key] = f.options[0].value;
      else newItem[f.key] = "";
    });
    arr.push(newItem);
    renderTab(activeTab);
  } else if (action === "del") {
    const idx = parseInt(btn.dataset.index, 10);
    if (isNaN(idx)) return;
    arr.splice(idx, 1);
    renderTab(activeTab);
  }
});

/* ============ ACTIONS ============ */
function toast(msg, type = "success") {
  const el = document.getElementById("admin-toast");
  el.textContent = msg;
  el.className = "admin-toast show " + type;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.className = "admin-toast " + type; }, 2600);
}

function saveLocal() {
  try {
    localStorage.setItem("reportData", JSON.stringify(data));
    toast("Đã lưu tạm. Mở index.html?preview để xem, hoặc Xuất data.js để deploy.", "success");
  } catch (err) { toast("Lỗi lưu: " + err.message, "error"); }
}

function exportData() {
  const content = "var reportData = " + JSON.stringify(data, null, 2) + ";\n";
  const blob = new Blob([content], { type: "text/javascript;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "data.js";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast("Đã xuất data.js — ghi đè file trong repo và git push", "success");
}

function resetLocal() {
  if (!confirm("Xóa dữ liệu lưu tạm và khôi phục data.js gốc?")) return;
  localStorage.removeItem("reportData");
  data = normalizeData(JSON.parse(JSON.stringify(window.reportData)));
  renderTab(activeTab);
  toast("Đã khôi phục dữ liệu gốc", "warn");
}

function importData(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const text = ev.target.result;
      const match = text.match(/=\s*(\{[\s\S]*\})\s*;?\s*$/);
      if (!match) throw new Error("Không tìm thấy object reportData");
      data = normalizeData(JSON.parse(match[1]));
      renderTab(activeTab);
      toast("Đã nhập data.js thành công", "success");
    } catch (err) { toast("Lỗi nhập file: " + err.message, "error"); }
  };
  reader.readAsText(file);
  e.target.value = "";
}

init();