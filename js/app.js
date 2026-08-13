
"use strict";

let editId = null;
const $ = id => document.getElementById(id);

function msg(text) {
  const t = $("toast");
  if (!t) return;
  t.textContent = text;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[c]));

const amountApplicable = type => type === "Cashin" || type === "Cashout";

function fmt(v) {
  return v === "" || v == null
    ? "—"
    : Number(v).toLocaleString("en-IN", {minimumFractionDigits:2, maximumFractionDigits:2});
}

function isoDate(value) {
  return new Date(value).toLocaleDateString("en-CA");
}

function selectedDashboardDate() {
  return $("dashboardDate")?.value || isoDate(new Date());
}

function updateStatus() {
  if (!window.SheetsSync) return;
  const n = SheetsSync.queue().length;
  const connected = !!SheetsSync.getUrl();
  if ($("syncStatus")) $("syncStatus").textContent = connected ? (n ? `${n} pending` : "Synced") : "Local only";
  if ($("syncDetails")) $("syncDetails").textContent = connected ? (n ? `${n} pending sync` : "Two-way sync enabled") : "Settings hidden";
}

function toggleAmount() {
  const type = $("logType")?.value || "Log";
  const on = amountApplicable(type);
  const field = $("amountField");
  const input = $("amount");
  if (field) field.classList.toggle("hidden", !on);
  if (input) {
    input.required = on;
    if (!on) input.value = "";
  }
}

function logsForDate(date) {
  return LogStore.getAll().filter(x => !x.deleted && isoDate(x.timestamp) === date);
}

function drawChart(canvasId, labels, datasets, maxY) {
  const canvas = $(canvasId);
  if (!canvas) return;

  const cssW = Math.max(canvas.clientWidth || 320, 320);
  const cssH = Math.max(canvas.clientHeight || 230, 230);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const pad = {l:42,r:12,t:24,b:34};
  const pw = cssW-pad.l-pad.r;
  const ph = cssH-pad.t-pad.b;
  const values = datasets.flatMap(d => d.data.map(Number));
  const top = Math.max(1, Number(maxY) || Math.max(...values, 0));

  ctx.strokeStyle = "#ddd";
  ctx.fillStyle = "#666";
  ctx.font = "11px sans-serif";

  for (let i=0; i<=4; i++) {
    const y = pad.t + ph*i/4;
    const v = top*(1-i/4);
    ctx.beginPath();
    ctx.moveTo(pad.l,y);
    ctx.lineTo(cssW-pad.r,y);
    ctx.stroke();
    ctx.fillText(String(Math.round(v)), 3, y+4);
  }

  const n = labels.length;
  if (!n) return;

  labels.forEach((label,i) => {
    const x = pad.l + (n===1 ? pw/2 : pw*i/(n-1));
    ctx.fillText(label, Math.max(0,x-18), cssH-10);
  });

  datasets.forEach((ds,di) => {
    ctx.strokeStyle = ds.color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    ds.data.forEach((raw,i) => {
      const v = Number(raw) || 0;
      const x = pad.l + (n===1 ? pw/2 : pw*i/(n-1));
      const y = pad.t + ph - (v/top)*ph;
      if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();

    ctx.fillStyle = ds.color;
    ds.data.forEach((raw,i) => {
      const v = Number(raw) || 0;
      const x = pad.l + (n===1 ? pw/2 : pw*i/(n-1));
      const y = pad.t + ph - (v/top)*ph;
      ctx.beginPath();
      ctx.arc(x,y,3,0,Math.PI*2);
      ctx.fill();
    });

    ctx.fillText(ds.label, pad.l + di*120, 14);
  });
}

function renderTrends() {
  if (!window.LogStore) return;

  const all = LogStore.getAll().filter(x => !x.deleted);
  const end = selectedDashboardDate();
  const start = new Date(`${end}T00:00:00`);
  start.setDate(start.getDate()-6);

  const labels = [];
  const byDay = [];

  for (let i=0; i<7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate()+i);
    const ds = isoDate(d);
    labels.push(ds.slice(5));
    byDay.push(all.filter(x => isoDate(x.timestamp) === ds));
  }

  const count = byDay.map(a => a.length);
  const cin = byDay.map(a => a.filter(x=>x.logType==="Cashin").reduce((s,x)=>s+(Number(x.amount)||0),0));
  const cout = byDay.map(a => a.filter(x=>x.logType==="Cashout").reduce((s,x)=>s+(Number(x.amount)||0),0));
  const cinc = byDay.map(a => a.filter(x=>x.logType==="Cashin").length);
  const coutc = byDay.map(a => a.filter(x=>x.logType==="Cashout").length);
  const pending = byDay.map(a => a.filter(x=>x.status==="Payment pending").length);
  const ordered = byDay.map(a => a.filter(x=>x.status==="Ordered").length);
  const received = byDay.map(a => a.filter(x=>x.status==="Received").length);

  drawChart("dailyLogChart",labels,[{label:"Logs",data:count,color:"#2563eb"}]);
  drawChart("cashFlowChart",labels,[{label:"Cashin",data:cin,color:"#16a34a"},{label:"Cashout",data:cout,color:"#dc2626"}]);
  drawChart("cashCountChart",labels,[{label:"Cashin",data:cinc,color:"#16a34a"},{label:"Cashout",data:coutc,color:"#dc2626"}]);
  drawChart("statusChart",labels,[{label:"Pending",data:pending,color:"#f59e0b"},{label:"Ordered",data:ordered,color:"#7c3aed"},{label:"Received",data:received,color:"#0891b2"}]);
}

function render() {
  if (!window.LogStore) return;

  const allLogs = LogStore.getAll().filter(x => !x.deleted);
  const dashboardDate = selectedDashboardDate();
  const a = allLogs.filter(x => isoDate(x.timestamp) === dashboardDate);
  const q = ($("searchInput")?.value || "").toLowerCase();

  const filtered = a.filter(x =>
    `${x.description||""} ${x.logType||""} ${x.status||""} ${x.userName||""}`.toLowerCase().includes(q)
  );

  const body = $("logTableBody");
  if (body) {
    body.innerHTML = filtered.map(x => `
      <tr>
        <td>${new Date(x.timestamp).toLocaleString("en-IN")}</td>
        <td class="user-cell">${esc(x.userName || "Unknown")}</td>
        <td>${esc(x.logType)}</td>
        <td>${esc(x.description)}</td>
        <td class="amount-cell">${amountApplicable(x.logType) ? fmt(x.amount) : "—"}</td>
        <td>${esc(x.status)}</td>
        <td>
          <button type="button" data-e="${x.id}">Edit</button>
          <button type="button" data-d="${x.id}">Delete</button>
        </td>
      </tr>`).join("");
  }

  if ($("emptyState")) $("emptyState").style.display = filtered.length ? "none" : "block";

  const c = {
    "Total Logs": a.length,
    "Cashin": 0, "Cashin Amount": 0,
    "Cashout": 0, "Cashout Amount": 0,
    "Distributor Visits": 0, "Customer Feedback": 0,
    "Payment Pending": 0, "Ordered": 0, "Inventory Added": 0
  };

  a.forEach(x => {
    if (x.logType === "Cashin") { c.Cashin++; c["Cashin Amount"] += Number(x.amount)||0; }
    if (x.logType === "Cashout") { c.Cashout++; c["Cashout Amount"] += Number(x.amount)||0; }
    if (x.logType === "Distributor visit") c["Distributor Visits"]++;
    if (x.logType === "Cust. Feedback") c["Customer Feedback"]++;
    if (x.status === "Payment pending") c["Payment Pending"]++;
    if (x.status === "Ordered") c.Ordered++;
    if (x.status === "Inventory added") c["Inventory Added"]++;
  });

  if ($("statsGrid")) {
    $("statsGrid").innerHTML = Object.entries(c).map(([k,v]) =>
      `<div class="stat"><div>${k}</div><b>${k.endsWith("Amount") ? "₹"+fmt(v) : v}</b></div>`
    ).join("");
  }

  updateStatus();
}

async function sync() {
  if (!Auth.isLoggedIn() || !SheetsSync.getUrl()) return;
  try {
    await SheetsSync.sync();
    render();
    msg("Google Sheets synced");
  } catch (e) {
    console.error("Sync failed:", e);
    msg("Sync failed; local data kept");
    updateStatus();
  }
}

function reset() {
  editId = null;
  $("logForm")?.reset();
  if ($("logType")) $("logType").value = "Log";
  if ($("status")) $("status").value = "NA";
  if ($("saveBtn")) $("saveBtn").textContent = "Add Log";
  $("cancelEditBtn")?.classList.add("hidden");
  toggleAmount();
}

function buttonBusy(button, busyText, doneText, duration=700) {
  if (!button) return;
  const original = button.dataset.originalText || button.textContent;
  button.dataset.originalText = original;
  button.classList.add("is-busy");
  button.textContent = busyText;
  setTimeout(() => {
    button.classList.remove("is-busy");
    if (doneText) {
      button.textContent = doneText;
      setTimeout(() => {
        button.textContent = original;
        button.classList.remove("is-success");
      }, 900);
    } else {
      button.textContent = original;
    }
  }, duration);
}

function bindAppEvents() {
  $("logType")?.addEventListener("change", toggleAmount);

  $("logForm")?.addEventListener("submit", e => {
    e.preventDefault();

    const old = editId ? LogStore.getAll().find(y=>y.id===editId) : null;
    const user = Auth.getUser() || {};
    const type = $("logType").value;
    const amount = amountApplicable(type) ? Number($("amount").value) : null;

    if (amountApplicable(type) && (!Number.isFinite(amount) || amount < 0)) {
      msg("Enter a valid amount");
      return;
    }

    const description = $("description").value.trim();
    if (!description) {
      msg("Enter a description");
      return;
    }

    const x = {
      id: editId || crypto.randomUUID(),
      timestamp: old ? old.timestamp : new Date().toISOString(),
      logType: type,
      description,
      amount,
      status: $("status").value,
      userName: old?.userName || user.name || user.email || "Unknown",
      updatedAt: new Date().toISOString(),
      updatedBy: user.email || ""
    };

    LogStore.upsert(x);
    SheetsSync.enqueue(x);

    const b = $("saveBtn");
    buttonBusy(b, editId ? "Updating…" : "Saving…", editId ? "Updated ✓" : "Saved ✓");

    reset();
    render();
    sync();
  });

  $("logTableBody")?.addEventListener("click", e => {
    const edit = e.target.closest("[data-e]");
    const del = e.target.closest("[data-d]");

    if (edit) {
      const x = LogStore.getAll().find(y=>y.id===edit.dataset.e);
      if (!x) return;
      editId = x.id;
      $("logType").value = x.logType;
      $("description").value = x.description;
      $("amount").value = x.amount ?? "";
      $("status").value = x.status;
      $("saveBtn").textContent = "Update Log";
      $("cancelEditBtn").classList.remove("hidden");
      toggleAmount();
      return;
    }

    if (del) {
      const x = LogStore.getAll().find(y=>y.id===del.dataset.d);
      if (!x) return;
      x.deleted = true;
      x.updatedAt = new Date().toISOString();
      x.updatedBy = Auth.getUser()?.email || "";
      SheetsSync.enqueue(x);
      LogStore.upsert(x);
      render();
      sync();
    }
  });

  $("cancelEditBtn")?.addEventListener("click", reset);
  $("searchInput")?.addEventListener("input", render);

  $("toggleSync")?.addEventListener("click", () => {
    $("syncPanel")?.classList.toggle("hidden");
    const hidden = $("syncPanel")?.classList.contains("hidden");
    $("toggleSync").textContent = hidden ? "Show Sync Settings" : "Hide Sync Settings";
  });

  if ($("sheetUrl")) $("sheetUrl").value = SheetsSync.getUrl();

  $("saveSheetUrl")?.addEventListener("click", () => {
    SheetsSync.setUrl($("sheetUrl").value);
    render();
    buttonBusy($("saveSheetUrl"), "Saving…", "Saved ✓");
    sync();
  });

  $("syncNow")?.addEventListener("click", () => {
    buttonBusy($("syncNow"), "Syncing…", "Synced ✓", 1000);
    sync();
  });

  window.addEventListener("online", sync);

  $("dashboardDate")?.addEventListener("change", () => {
    render();
    renderTrends();
  });

  $("dashboardToday")?.addEventListener("click", () => {
    if ($("dashboardDate")) $("dashboardDate").value = isoDate(new Date());
    render();
    renderTrends();
  });

  $("dashboardTabBtn")?.addEventListener("click", () => {
    $("dashboardPanel")?.classList.remove("hidden");
    $("trendsPanel")?.classList.add("hidden");
    $("dashboardTabBtn")?.classList.add("active");
    $("trendTabBtn")?.classList.remove("active");
  });

  $("trendTabBtn")?.addEventListener("click", () => {
    $("dashboardPanel")?.classList.add("hidden");
    $("trendsPanel")?.classList.remove("hidden");
    $("trendTabBtn")?.classList.add("active");
    $("dashboardTabBtn")?.classList.remove("active");
    renderTrends();
  });

  document.querySelectorAll("button").forEach(b => {
    b.addEventListener("click", () => {
      b.classList.add("is-pressed");
      setTimeout(() => b.classList.remove("is-pressed"), 120);
    });
  });
}

const GOOGLE_CLIENT_ID = "99773349762-ok4gijm3iedsqu7alk1k61vur86n7v3j.apps.googleusercontent.com";
let googleReady = false;

function decodeGoogleCredential(credential) {
  const payload = credential.split(".")[1];
  const normalized = payload.replace(/-/g,"+").replace(/_/g,"/");
  return JSON.parse(atob(normalized));
}

function handleGoogleCredential(response) {
  try {
    const payload = decodeGoogleCredential(response.credential);
    Auth.save({
      email: payload.email,
      name: payload.name || payload.email,
      picture: payload.picture || "",
      idToken: response.credential
    });
    authUI();
    sync();
  } catch (e) {
    console.error("Google credential error:", e);
    msg("Google login failed");
  }
}

function initGoogleLogin() {
  if (!window.google?.accounts?.id) {
    setTimeout(initGoogleLogin, 300);
    return;
  }

  if (googleReady) return;
  googleReady = true;

  try {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true
    });

    const target = $("googleButton");
    if (target) {
      target.innerHTML = "";
      google.accounts.id.renderButton(target, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "rectangular",
        width: 280
      });
    }
  } catch (e) {
    googleReady = false;
    console.error("Google Identity Services initialization error:", e);
    msg("Google sign-in could not initialize");
  }
}

function authUI() {
  const loggedIn = Auth.isLoggedIn();
  $("loginCard")?.classList.toggle("hidden", loggedIn);
  $("appContent")?.classList.toggle("hidden", !loggedIn);
  $("loginBtn")?.classList.toggle("hidden", loggedIn);
  $("logoutBtn")?.classList.toggle("hidden", !loggedIn);
  if ($("userSubtitle")) {
    $("userSubtitle").textContent = loggedIn
      ? `Signed in: ${Auth.getUser()?.email || ""}`
      : "Activity & cash log";
  }
  if (loggedIn) render();
}

function openGoogleLogin() {
  const button = $("loginBtn");
  buttonBusy(button, "Opening Google…", null, 1200);

  if (!window.google?.accounts?.id) {
    msg("Google sign-in is still loading…");
    initGoogleLogin();
    return;
  }

  try {
    google.accounts.id.prompt(notification => {
      if (notification?.isNotDisplayed?.()) {
        msg("Use the Google sign-in button below");
        $("googleButton")?.scrollIntoView({behavior:"smooth", block:"center"});
      }
    });
  } catch (e) {
    console.error("Google prompt error:", e);
    msg("Unable to open Google sign-in");
  }
}

function init() {
  Auth.load();
  authUI();

  const date = $("dashboardDate");
  if (date) date.value = isoDate(new Date());

  bindAppEvents();
  toggleAmount();
  render();
  renderTrends();
  initGoogleLogin();
}

$("loginBtn")?.addEventListener("click", openGoogleLogin);
$("logoutBtn")?.addEventListener("click", () => {
  Auth.clear();
  if (window.google?.accounts?.id) google.accounts.id.disableAutoSelect();
  authUI();
  msg("Logged out");
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, {once:true});
} else {
  init();
}
