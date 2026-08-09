let editingId = null;

const form = document.getElementById("logForm");
const logType = document.getElementById("logType");
const description = document.getElementById("description");
const status = document.getElementById("status");
const tableBody = document.getElementById("logTableBody");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const saveBtn = document.getElementById("saveBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const statsGrid = document.getElementById("statsGrid");
const toast = document.getElementById("toast");

function formatTimestamp(iso) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "medium"
  }).format(new Date(iso));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function render() {
  const logs = LogStore.getAll();
  const query = searchInput.value.trim().toLowerCase();

  const filtered = logs.filter(log =>
    log.description.toLowerCase().includes(query) ||
    log.logType.toLowerCase().includes(query) ||
    log.status.toLowerCase().includes(query)
  );

  tableBody.innerHTML = "";
  emptyState.style.display = filtered.length ? "none" : "block";

  filtered.forEach(log => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatTimestamp(log.timestamp)}</td>
      <td>${escapeHtml(log.logType)}</td>
      <td>${escapeHtml(log.description)}</td>
      <td>${escapeHtml(log.status)}</td>
      <td>
        <button class="action-btn edit" data-action="edit" data-id="${log.id}">Edit</button>
        <button class="action-btn delete" data-action="delete" data-id="${log.id}">Delete</button>
      </td>`;
    tableBody.appendChild(tr);
  });

  renderDashboard(logs);
}

function renderDashboard(logs) {
  const counts = {
    "Total Logs": logs.length,
    "Cashin": logs.filter(x => x.logType === "Cashin").length,
    "Cashout": logs.filter(x => x.logType === "Cashout").length,
    "Distributor Visits": logs.filter(x => x.logType === "Distributor visit").length,
    "Customer Feedback": logs.filter(x => x.logType === "Cust. Feedback").length,
    "Ordered": logs.filter(x => x.status === "Ordered").length,
    "Payment Pending": logs.filter(x => x.status === "Payment pending").length,
    "Inventory Added": logs.filter(x => x.status === "Inventory added").length
  };

  statsGrid.innerHTML = Object.entries(counts).map(([label, value]) => `
    <div class="stat"><div class="label">${label}</div><div class="value">${value}</div></div>
  `).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

form.addEventListener("submit", e => {
  e.preventDefault();
  const text = description.value.trim();
  if (!text) return;

  if (editingId) {
    LogStore.update(editingId, {
      logType: logType.value,
      description: text,
      status: status.value
    });
    showToast("Log updated");
  } else {
    LogStore.add({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      timestamp: new Date().toISOString(),
      logType: logType.value,
      description: text,
      status: status.value
    });
    showToast("Log added");
  }

  resetForm();
  render();
});

tableBody.addEventListener("click", e => {
  const button = e.target.closest("button");
  if (!button) return;

  const id = button.dataset.id;
  const log = LogStore.getAll().find(x => x.id === id);
  if (!log) return;

  if (button.dataset.action === "edit") {
    editingId = id;
    logType.value = log.logType;
    description.value = log.description;
    status.value = log.status;
    saveBtn.textContent = "Update Log";
    cancelEditBtn.classList.remove("hidden");
    description.focus();
    window.scrollTo({top:0, behavior:"smooth"});
  }

  if (button.dataset.action === "delete") {
    if (confirm("Delete this log?")) {
      LogStore.remove(id);
      showToast("Log deleted");
      render();
    }
  }
});

cancelEditBtn.addEventListener("click", resetForm);
searchInput.addEventListener("input", render);
document.getElementById("refreshDashboard").addEventListener("click", render);

document.getElementById("clearAllBtn").addEventListener("click", () => {
  if (confirm("Delete ALL logs? This cannot be undone.")) {
    LogStore.clear();
    resetForm();
    render();
    showToast("All logs cleared");
  }
});

function resetForm() {
  editingId = null;
  form.reset();
  logType.value = "Log";
  status.value = "NA";
  saveBtn.textContent = "Add Log";
  cancelEditBtn.classList.add("hidden");
}

render();
