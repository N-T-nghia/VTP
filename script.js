document.addEventListener("DOMContentLoaded", () => {
  // Ngày
  document.getElementById("report-date").textContent = "Cập nhật: " + reportData.reportDate;

  // Tiến độ
  const { actual, planned, statusText } = reportData.progress;
  const delta = actual - planned;

  document.getElementById("progress-actual").textContent = actual + "%";
  document.getElementById("progress-plan").textContent = planned + "%";
  document.getElementById("progress-delta").textContent =
    (delta >= 0 ? "+" : "") + delta + "%";
  document.getElementById("progress-status").textContent = statusText;

  const bar = document.getElementById("progress-bar");
  bar.style.width = actual + "%";

  // Đổi màu thanh tiến độ theo mức chênh lệch
  if (delta >= -3) bar.style.background = "var(--green)";
  else if (delta >= -10) bar.style.background = "var(--yellow)";
  else bar.style.background = "var(--red)";

  // Đánh giá RAG
  const rag = document.getElementById("rag-badge");
  rag.textContent = reportData.evaluation.label;
  rag.className = "rag-badge rag-" + reportData.evaluation.level;
  document.getElementById("evaluation-text").textContent = reportData.evaluation.text;

  // Render danh sách
  const renderList = (id, items) => {
    document.getElementById(id).innerHTML = items.map(i => `<li>${i}</li>`).join("");
  };

  renderList("weekly-tasks", reportData.weeklyTasks);
  renderList("measures", reportData.measures);
  renderList("issues", reportData.issues);
});