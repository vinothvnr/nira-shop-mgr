("use strict");

let editId = null;
const $ = id => document.getElementById(id);
const GOOGLE_CLIENT_ID = "99773349762-ok4gijm3iedsqu7alk1k61vur86n7v3j.apps.googleusercontent.com";

function msg(text) {
  const t = $("toast");
  if (!t) return;
  t.textContent = text;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

function amountApplicable(type) {
  return type === "Cashin" || type === "Cashout";
}

function fmt(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", {minimumFractionDigits:2, maximumFractionDigits:2});
}

function dateKey(value) {
  if (!value) return "";
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  } catch (_) {
    return "";
  }
}

function todayKey() {
  return dateKey(new Date());
}

function selectedDashboardDate() {
  return $("dashboardDate")?.value || todayKey();
}

function getLogs() {
  try {
    const raw = LogStore.getAll();
    return Array.isArray(raw) ? raw.filter(x => x && !x.deleted) : [];
  } catch (e) {
    console.error("Unable to read LogStore:", e);
    return [];
  }
}

function updateStatus() {
  if (!window.SheetsSync) return;
  try {
    const n = SheetsSync.queue().length;
    const connected = !!SheetsSync.getUrl();
    if ($("syncStatus")) $("syncStatus").textContent = connected ? (n ? `${n} pending` : "Synced") : "Local only";
    if ($("syncDetails")) $("syncDetails").textContent = connected ? (n ? `${n} pending sync` : "Two-way sync enabled") : "Settings hidden";
  } catch (e) {
    console.error("Sync status error:", e);
  }
}

function toggleAmount() {
  const type = $("logType")?.value || "Log";
  const enabled = amountApplicable(type);
  $("amountField")?.classList.toggle("hidden", !enabled);
  if ($("amount")) {
    $("amount").required = enabled;
    if (!enabled) $("amount").value = "";
  }
}

function renderDashboard(logs) {
  const selected = selectedDashboardDate();
  const daily = logs.filter(x => dateKey(x.timestamp) === selected);

  const c = {
    "Total Logs": daily.length,
    "Cashin": 0,
    "Cashin Amount": 0,
    "Cashout": 0,
    "Cashout Amount": 0,
    "Distributor Visits": 0,
    "Customer Feedback": 0,
    "Payment Pending": 0,
    "Ordered": 0,
    "Inventory Added": 0
  };

  daily.forEach(x => {
    const type = String(x.logType || "");
    const status = String(x.status || "");
    if (type === "Cashin") {
      c.Cashin++;
      c["Cashin Amount"] += Number(x.amount) || 0;
    }
    if (type === "Cashout") {
      c.Cashout++;
      c["Cashout Amount"] += Number(x.amount) || 0;
    }
    if (type === "Distributor visit") c["Distributor Visits"]++;
    if (type === "Cust. Feedback") c["Customer Feedback"]++;
    if (status === "Payment pending") c["Payment Pending"]++;
    if (status === "Ordered") c.Ordered++;
    if (status === "Inventory added") c["Inventory Added"]++;
  });

  const grid = $("statsGrid");
  if (grid) {
    grid.innerHTML = Object.entries(c).map(([k,v]) =>
      `<div class="stat"><div>${esc(k)}</div><b>${k.endsWith("Amount") ? "₹" + fmt(v) : v}</b></div>`
    ).join("");
  }
}

function renderLogs(logs) {
  const query = ($("searchInput")?.value || "").trim().toLowerCase();
  const filtered = !query ? logs : logs.filter(x =>
    [
      x.description, x.logType, x.status, x.userName, x.amount
    ].join(" ").toLowerCase().includes(query)
  );

  const body = $("logTableBody");
  if (!body) return;

  body.innerHTML = filtered.map(x => `
    <tr>
      <td>${x.timestamp ? esc(new Date(x.timestamp).toLocaleString("en-IN")) : "—"}</td>
      <td class="user-cell">${esc(x.userName || "Unknown")}</td>
      <td>${esc(x.logType || "")}</td>
      <td>${esc(x.description || "")}</td>
      <td class="amount-cell">${amountApplicable(x.logType) ? fmt(x.amount) : "—"}</td>
      <td>${esc(x.status || "")}</td>
      <td>
        <button type="button" data-edit-id="${esc(x.id)}">Edit</button>
        <button type="button" data-delete-id="${esc(x.id)}">Delete</button>
      </td>
    </tr>
  `).join("");

  if ($("emptyState")) $("emptyState").style.display = filtered.length ? "none" : "block";
}

function drawChart(id, labels, datasets) {
  const canvas = $(id);
  if (!canvas) return;
  const w = Math.max(canvas.clientWidth || 320, 320);
  const h = Math.max(canvas.clientHeight || 230, 230);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(w*dpr);
  canvas.height = Math.round(h*dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);

  const pad = {l:42,r:12,t:24,b:34};
  const pw = w-pad.l-pad.r, ph = h-pad.t-pad.b;
  const values = datasets.flatMap(d => d.data.map(v => Number(v)||0));
  const max = Math.max(1, ...values);

  ctx.font = "11px sans-serif";
  ctx.strokeStyle = "#ddd";
  ctx.fillStyle = "#666";
  for(let i=0;i<=4;i++){
    const y=pad.t+ph*i/4;
    ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(w-pad.r,y); ctx.stroke();
    ctx.fillText(String(Math.round(max*(1-i/4))),3,y+4);
  }

  const n=labels.length;
  if(!n) return;

  labels.forEach((label,i)=>{
    const x=pad.l+(n===1?pw/2:pw*i/(n-1));
    ctx.fillStyle="#666";
    ctx.fillText(label,Math.max(0,x-18),h-10);
  });

  datasets.forEach((ds,di)=>{
    ctx.strokeStyle=ds.color;
    ctx.lineWidth=2;
    ctx.beginPath();
    ds.data.forEach((raw,i)=>{
      const v=Number(raw)||0;
      const x=pad.l+(n===1?pw/2:pw*i/(n-1));
      const y=pad.t+ph-(v/max)*ph;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
    ctx.fillStyle=ds.color;
    ds.data.forEach((raw,i)=>{
      const v=Number(raw)||0;
      const x=pad.l+(n===1?pw/2:pw*i/(n-1));
      const y=pad.t+ph-(v/max)*ph;
      ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();
    });
    ctx.fillText(ds.label,pad.l+di*120,14);
  });
}

function renderTrends() {
  const logs=getLogs();
  const end=selectedDashboardDate();
  const base=new Date(`${end}T00:00:00`);
  if(Number.isNaN(base.getTime())) return;
  base.setDate(base.getDate()-6);

  const labels=[],days=[];
  for(let i=0;i<7;i++){
    const d=new Date(base);
    d.setDate(base.getDate()+i);
    const key=dateKey(d);
    labels.push(key.slice(5));
    days.push(logs.filter(x=>dateKey(x.timestamp)===key));
  }

  const cashin=days.map(a=>a.filter(x=>x.logType==="Cashin").reduce((s,x)=>s+(Number(x.amount)||0),0));
  const cashout=days.map(a=>a.filter(x=>x.logType==="Cashout").reduce((s,x)=>s+(Number(x.amount)||0),0));
  const cashinCount=days.map(a=>a.filter(x=>x.logType==="Cashin").length);
  const cashoutCount=days.map(a=>a.filter(x=>x.logType==="Cashout").length);
  const logsCount=days.map(a=>a.length);
  const pending=days.map(a=>a.filter(x=>x.status==="Payment pending").length);
  const ordered=days.map(a=>a.filter(x=>x.status==="Ordered").length);
  const received=days.map(a=>a.filter(x=>x.status==="Received").length);

  drawChart("dailyLogChart",labels,[{label:"Logs",data:logsCount,color:"#2563eb"}]);
  drawChart("cashFlowChart",labels,[{label:"Cashin",data:cashin,color:"#16a34a"},{label:"Cashout",data:cashout,color:"#dc2626"}]);
  drawChart("cashCountChart",labels,[{label:"Cashin",data:cashinCount,color:"#16a34a"},{label:"Cashout",data:cashoutCount,color:"#dc2626"}]);
  drawChart("statusChart",labels,[{label:"Pending",data:pending,color:"#f59e0b"},{label:"Ordered",data:ordered,color:"#7c3aed"},{label:"Received",data:received,color:"#0891b2"}]);
}

function render() {
  const logs=getLogs();
  renderLogs(logs);
  renderDashboard(logs);
  updateStatus();
}

async function sync() {
  if(!Auth.isLoggedIn() || !SheetsSync.getUrl()) {
    render();
    return;
  }
  try {
    await SheetsSync.sync();
    render();
    renderTrends();
    msg("Google Sheets synced");
  } catch(e) {
    console.error("Sync failed:",e);
    render();
    msg("Sync failed; local data kept");
    updateStatus();
  }
}

function resetForm() {
  editId=null;
  $("logForm")?.reset();
  if($("logType")) $("logType").value="Log";
  if($("status")) $("status").value="NA";
  if($("saveBtn")) $("saveBtn").textContent="Add Log";
  $("cancelEditBtn")?.classList.add("hidden");
  toggleAmount();
}

function buttonFeedback(btn,busy,done) {
  if(!btn) return;
  const original=btn.dataset.originalText||btn.textContent;
  btn.dataset.originalText=original;
  btn.classList.add("is-busy");
  btn.textContent=busy;
  setTimeout(()=>{
    btn.classList.remove("is-busy");
    if(done){
      btn.textContent=done;
      setTimeout(()=>btn.textContent=original,800);
    } else btn.textContent=original;
  },700);
}

function bindAppEvents() {
  $("logType")?.addEventListener("change",toggleAmount);

  $("logForm")?.addEventListener("submit",e=>{
    e.preventDefault();
    if(!window.LogStore || !window.Auth) return;

    const old=editId ? LogStore.getAll().find(x=>x.id===editId) : null;
    const user=Auth.getUser()||{};
    const type=$("logType")?.value||"Log";
    const description=($("description")?.value||"").trim();
    const amount=amountApplicable(type) ? Number($("amount")?.value) : null;

    if(!description){msg("Enter a description");return;}
    if(amountApplicable(type) && (!Number.isFinite(amount)||amount<0)){
      msg("Enter a valid amount");return;
    }

    const record={
      id:editId||("log-"+Date.now()+"-"+Math.random().toString(36).slice(2)),
      timestamp:old?.timestamp||new Date().toISOString(),
      logType:type,
      description,
      amount,
      status:$("status")?.value||"NA",
      userName:old?.userName||user.name||user.email||"Unknown",
      updatedAt:new Date().toISOString(),
      updatedBy:user.email||""
    };

    LogStore.upsert(record);
    SheetsSync.enqueue(record);
    buttonFeedback($("saveBtn"),editId?"Updating…":"Saving…",editId?"Updated ✓":"Saved ✓");
    resetForm();
    render();
    renderTrends();
    sync();
  });

  $("logTableBody")?.addEventListener("click",e=>{
    const edit=e.target.closest("[data-edit-id]");
    const del=e.target.closest("[data-delete-id]");

    if(edit){
      const x=LogStore.getAll().find(y=>y.id===edit.dataset.editId);
      if(!x)return;
      editId=x.id;
      $("logType").value=x.logType||"Log";
      $("description").value=x.description||"";
      $("amount").value=x.amount??"";
      $("status").value=x.status||"NA";
      $("saveBtn").textContent="Update Log";
      $("cancelEditBtn")?.classList.remove("hidden");
      toggleAmount();
      window.scrollTo({top:0,behavior:"smooth"});
      return;
    }

    if(del){
      const x=LogStore.getAll().find(y=>y.id===del.dataset.deleteId);
      if(!x)return;
      x.deleted=true;
      x.updatedAt=new Date().toISOString();
      x.updatedBy=Auth.getUser()?.email||"";
      LogStore.upsert(x);
      SheetsSync.enqueue(x);
      render();
      renderTrends();
      sync();
    }
  });

  $("cancelEditBtn")?.addEventListener("click",resetForm);
  $("searchInput")?.addEventListener("input",render);

  $("toggleSync")?.addEventListener("click",()=>{
    $("syncPanel")?.classList.toggle("hidden");
    const hidden=$("syncPanel")?.classList.contains("hidden");
    if($("toggleSync")) $("toggleSync").textContent=hidden?"Show Sync Settings":"Hide Sync Settings";
  });

  if($("sheetUrl")) $("sheetUrl").value=SheetsSync.getUrl();
  $("saveSheetUrl")?.addEventListener("click",()=>{
    SheetsSync.setUrl($("sheetUrl").value);
    buttonFeedback($("saveSheetUrl"),"Saving…","Saved ✓");
    render();
    sync();
  });

  $("syncNow")?.addEventListener("click",()=>{
    buttonFeedback($("syncNow"),"Syncing…","Synced ✓");
    sync();
  });

  $("dashboardDate")?.addEventListener("change",()=>{render();renderTrends();});
  $("dashboardToday")?.addEventListener("click",()=>{
    if($("dashboardDate")) $("dashboardDate").value=todayKey();
    render();renderTrends();
  });

  $("dashboardTabBtn")?.addEventListener("click",()=>{
    $("dashboardPanel")?.classList.remove("hidden");
    $("trendsPanel")?.classList.add("hidden");
    $("dashboardTabBtn")?.classList.add("active");
    $("trendTabBtn")?.classList.remove("active");
  });

  $("trendTabBtn")?.addEventListener("click",()=>{
    $("dashboardPanel")?.classList.add("hidden");
    $("trendsPanel")?.classList.remove("hidden");
    $("trendTabBtn")?.classList.add("active");
    $("dashboardTabBtn")?.classList.remove("active");
    renderTrends();
  });
}

let googleReady=false;

function handleGoogleCredential(response){
  try{
    const part=response.credential.split(".")[1];
    const payload=JSON.parse(atob(part.replace(/-/g,"+").replace(/_/g,"/")));
    Auth.save({
      email:payload.email,
      name:payload.name||payload.email,
      picture:payload.picture||"",
      idToken:response.credential
    });
    authUI();
    sync();
  }catch(e){
    console.error("Google credential error:",e);
    msg("Google login failed");
  }
}

function initGoogleLogin(){
  if(!window.google?.accounts?.id){
    setTimeout(initGoogleLogin,300);
    return;
  }
  if(googleReady)return;
  try{
    google.accounts.id.initialize({
      client_id:GOOGLE_CLIENT_ID,
      callback:handleGoogleCredential,
      auto_select:false,
      cancel_on_tap_outside:true
    });
    googleReady=true;
    const target=$("googleButton");
    if(target){
      target.innerHTML="";
      google.accounts.id.renderButton(target,{
        type:"standard",theme:"outline",size:"large",
        text:"signin_with",shape:"rectangular",width:280
      });
    }
  }catch(e){
    googleReady=false;
    console.error("Google initialization error:",e);
    msg("Google sign-in could not initialize");
  }
}

function authUI(){
  const logged=Auth.isLoggedIn();
  $("loginCard")?.classList.toggle("hidden",logged);
  $("appContent")?.classList.toggle("hidden",!logged);
  $("loginBtn")?.classList.toggle("hidden",logged);
  $("logoutBtn")?.classList.toggle("hidden",!logged);
  if($("userSubtitle")) $("userSubtitle").textContent=logged?`Signed in: ${Auth.getUser()?.email||""}`:"Activity & cash log";
  if(logged) render();
}

function openGoogleLogin(){
  buttonFeedback($("loginBtn"),"Opening Google…",null);
  if(!window.google?.accounts?.id){
    msg("Google sign-in is still loading…");
    initGoogleLogin();
    return;
  }
  try{
    google.accounts.id.prompt(notification=>{
      if(notification?.isNotDisplayed?.()){
        msg("Use the Google sign-in button");
        $("googleButton")?.scrollIntoView({behavior:"smooth",block:"center"});
      }
    });
  }catch(e){
    console.error("Google prompt error:",e);
    msg("Unable to open Google sign-in");
  }
}

function init(){
  try{
    Auth.load();
    if($("dashboardDate")) $("dashboardDate").value=todayKey();
    bindAppEvents();
    toggleAmount();
    authUI();
    render();
    renderTrends();
    initGoogleLogin();
  }catch(e){
    console.error("Nira Log Book initialization error:",e);
    msg("App initialization error");
  }
}

$("loginBtn")?.addEventListener("click",openGoogleLogin);
$("logoutBtn")?.addEventListener("click",()=>{
  Auth.clear();
  if(window.google?.accounts?.id) google.accounts.id.disableAutoSelect();
  authUI();
  msg("Logged out");
});

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",init,{once:true});
}else{
  init();
}
