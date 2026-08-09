let editId=null;
const $=x=>document.getElementById(x);
const msg=x=>{let t=$("toast");t.textContent=x;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const amountApplicable=t=>t==="Cashin"||t==="Cashout";
const fmt=v=>v===""||v==null?"—":Number(v).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
function toggleAmount(){let on=amountApplicable($("logType").value);$("amountField").classList.toggle("hidden",!on);$("amount").required=on;if(!on)$("amount").value=""}
function updateStatus(){let n=SheetsSync.queue().length,c=!!SheetsSync.getUrl();$("syncStatus").textContent=c?(n?n+" pending":"Synced"):"Local only";$("syncDetails").textContent=c?(n?n+" pending sync":"Two-way sync enabled"):"Settings hidden"}

function isoDate(d){return new Date(d).toLocaleDateString("en-CA")}
function selectedDashboardDate(){return $("dashboardDate")?.value || isoDate(new Date())}
function logsForDate(date){
  return LogStore.getAll().filter(x=>!x.deleted && isoDate(x.timestamp)===date)
}
function drawChart(canvasId, labels, datasets, maxY){
  const c=$(canvasId); if(!c)return;
  const ctx=c.getContext("2d"), w=c.width=c.clientWidth*2, h=c.height=c.clientHeight*2;
  ctx.scale(2,2); const W=c.clientWidth,H=c.clientHeight;
  ctx.clearRect(0,0,W,H);
  const pad={l:42,r:12,t:16,b:34}, pw=W-pad.l-pad.r, ph=H-pad.t-pad.b;
  const all=datasets.flatMap(d=>d.data); const top=Math.max(1,maxY||Math.max(...all,0));
  ctx.strokeStyle="#ddd";ctx.fillStyle="#666";ctx.font="11px sans-serif";
  for(let i=0;i<=4;i++){let y=pad.t+ph*i/4,v=top*(1-i/4);ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();ctx.fillText(String(Math.round(v)),3,y+4)}
  const n=labels.length; if(!n)return;
  labels.forEach((lab,i)=>{let x=pad.l+(n===1?pw/2:pw*i/(n-1));ctx.fillText(lab,x-18,H-10)});
  datasets.forEach((ds,di)=>{
    ctx.strokeStyle=ds.color;ctx.lineWidth=2;ctx.beginPath();
    ds.data.forEach((v,i)=>{let x=pad.l+(n===1?pw/2:pw*i/(n-1)),y=pad.t+ph-(v/top)*ph;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});
    ctx.stroke(); ctx.fillStyle=ds.color;
    ds.data.forEach((v,i)=>{let x=pad.l+(n===1?pw/2:pw*i/(n-1)),y=pad.t+ph-(v/top)*ph;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill()});
    ctx.fillStyle=ds.color;ctx.fillText(ds.label,pad.l+di*120,12)
  })
}
function renderTrends(){
  const all=LogStore.getAll().filter(x=>!x.deleted), dates=[...new Set(all.map(x=>isoDate(x.timestamp)))].sort();
  const end=selectedDashboardDate(), endMs=new Date(end+"T23:59:59").getTime();
  const start=new Date(end+"T00:00:00"); start.setDate(start.getDate()-6);
  const labels=[], byDay=[];
  for(let i=0;i<7;i++){let d=new Date(start);d.setDate(start.getDate()+i);let ds=isoDate(d);labels.push(ds.slice(5));byDay.push(all.filter(x=>isoDate(x.timestamp)===ds))}
  const count=byDay.map(a=>a.length), cin=byDay.map(a=>a.filter(x=>x.logType==="Cashin").reduce((s,x)=>s+(Number(x.amount)||0),0)), cout=byDay.map(a=>a.filter(x=>x.logType==="Cashout").reduce((s,x)=>s+(Number(x.amount)||0),0));
  const cinc=byDay.map(a=>a.filter(x=>x.logType==="Cashin").length),coutc=byDay.map(a=>a.filter(x=>x.logType==="Cashout").length);
  const pending=byDay.map(a=>a.filter(x=>x.status==="Payment pending").length),ordered=byDay.map(a=>a.filter(x=>x.status==="Ordered").length),received=byDay.map(a=>a.filter(x=>x.status==="Received").length);
  drawChart("dailyLogChart",labels,[{label:"Logs",data:count,color:"#2563eb"}]);
  drawChart("cashFlowChart",labels,[{label:"Cashin",data:cin,color:"#16a34a"},{label:"Cashout",data:cout,color:"#dc2626"}]);
  drawChart("cashCountChart",labels,[{label:"Cashin",data:cinc,color:"#16a34a"},{label:"Cashout",data:coutc,color:"#dc2626"}]);
  drawChart("statusChart",labels,[{label:"Pending",data:pending,color:"#f59e0b"},{label:"Ordered",data:ordered,color:"#7c3aed"},{label:"Received",data:received,color:"#0891b2"}]);
}

function render(){
 let dashboardDate=selectedDashboardDate(), allLogs=LogStore.getAll().filter(x=>!x.deleted), a=allLogs.filter(x=>isoDate(x.timestamp)===dashboardDate), q=($("searchInput").value||"").toLowerCase();
 let f=a.filter(x=>(x.description+" "+x.logType+" "+x.status+" "+(x.userName||"")).toLowerCase().includes(q));
 $("logTableBody").innerHTML=f.map(x=>`<tr><td>${new Date(x.timestamp).toLocaleString("en-IN")}</td><td class="user-cell">${esc(x.userName||"Unknown")}</td><td>${esc(x.logType)}</td><td>${esc(x.description)}</td><td class="amount-cell">${amountApplicable(x.logType)?fmt(x.amount):"—"}</td><td>${esc(x.status)}</td><td><button data-e="${x.id}">Edit</button><button data-d="${x.id}">Delete</button></td></tr>`).join("");
 $("emptyState").style.display=f.length?"none":"block";
 let c={"Total Logs":a.length,"Cashin":0,"Cashin Amount":0,"Cashout":0,"Cashout Amount":0,"Distributor Visits":0,"Customer Feedback":0,"Payment Pending":0,"Ordered":0,"Inventory Added":0};
 a.forEach(x=>{if(x.logType==="Cashin"){c.Cashin++;c["Cashin Amount"]+=Number(x.amount)||0}if(x.logType==="Cashout"){c.Cashout++;c["Cashout Amount"]+=Number(x.amount)||0}if(x.logType==="Distributor visit")c["Distributor Visits"]++;if(x.logType==="Cust. Feedback")c["Customer Feedback"]++;if(x.status==="Payment pending")c["Payment Pending"]++;if(x.status==="Ordered")c.Ordered++;if(x.status==="Inventory added")c["Inventory Added"]++});
 $("statsGrid").innerHTML=Object.entries(c).map(([k,v])=>`<div class="stat"><div>${k}</div><b>${k.endsWith("Amount")?"₹"+fmt(v):v}</b></div>`).join("");updateStatus()
}
async function sync(){if(!Auth.isLoggedIn()||!SheetsSync.getUrl())return;try{await SheetsSync.sync();render();msg("Google Sheets synced")}catch(e){msg("Sync failed; local data kept");updateStatus()}}
function reset(){editId=null;$("logForm").reset();$("logType").value="Log";$("status").value="NA";$("saveBtn").textContent="Add Log";$("cancelEditBtn").classList.add("hidden");toggleAmount()}
$("logType").onchange=toggleAmount;
$("logForm").onsubmit=e=>{e.preventDefault();let old=editId?LogStore.getAll().find(y=>y.id===editId):null,user=Auth.getUser()||{},type=$("logType").value,amount=amountApplicable(type)?Number($("amount").value):null;if(amountApplicable(type)&&(!Number.isFinite(amount)||amount<0)){msg("Enter a valid amount");return}let x={id:editId||crypto.randomUUID(),timestamp:old?old.timestamp:new Date().toISOString(),logType:type,description:$("description").value.trim(),amount,status:$("status").value,userName:old?.userName||user.name||user.email||"Unknown",updatedAt:new Date().toISOString(),updatedBy:user.email||""};if(!x.description)return;LogStore.upsert(x);SheetsSync.enqueue(x);reset();render();sync()};
$("logTableBody").onclick=e=>{let id=e.target.dataset.e||e.target.dataset.d;if(!id)return;let x=LogStore.getAll().find(y=>y.id===id);if(e.target.dataset.e){editId=id;$("logType").value=x.logType;$("description").value=x.description;$("amount").value=x.amount??"";$("status").value=x.status;$("saveBtn").textContent="Update Log";$("cancelEditBtn").classList.remove("hidden");toggleAmount()}else{x.deleted=true;x.updatedAt=new Date().toISOString();x.updatedBy=Auth.getUser()?.email||"";SheetsSync.enqueue(x);LogStore.upsert(x);render();sync()}};
$("cancelEditBtn").onclick=reset;$("searchInput").oninput=render;$("clearAllBtn").onclick=()=>{if(confirm("Delete local data?")){LogStore.clear();render()}};$("toggleSync").onclick=()=>{$("syncPanel").classList.toggle("hidden");$("toggleSync").textContent=$("syncPanel").classList.contains("hidden")?"Show Sync Settings":"Hide Sync Settings"};$("sheetUrl").value=SheetsSync.getUrl();$("saveSheetUrl").onclick=()=>{SheetsSync.setUrl($("sheetUrl").value);render();sync()};$("syncNow").onclick=sync;addEventListener("online",sync);

$("dashboardDate").value=isoDate(new Date());
$("dashboardDate").onchange=()=>{render();renderTrends()};
$("dashboardToday").onclick=()=>{$("dashboardDate").value=isoDate(new Date());render();renderTrends()};
$("dashboardTabBtn").onclick=()=>{$("dashboardPanel").classList.remove("hidden");$("trendsPanel").classList.add("hidden");$("dashboardTabBtn").classList.add("active");$("trendTabBtn").classList.remove("active")};
$("trendTabBtn").onclick=()=>{$("dashboardPanel").classList.add("hidden");$("trendsPanel").classList.remove("hidden");$("trendTabBtn").classList.add("active");$("dashboardTabBtn").classList.remove("active");renderTrends()};
renderTrends();

function authUI(){let ok=Auth.isLoggedIn();$("loginCard").classList.toggle("hidden",ok);$("appContent").classList.toggle("hidden",!ok);$("loginBtn").classList.toggle("hidden",ok);$("logoutBtn").classList.toggle("hidden",!ok);$("userSubtitle").textContent=ok?"Signed in: "+Auth.getUser().email:"Activity & cash log";render()}$("logoutBtn").onclick=()=>{Auth.clear();authUI();msg("Logged out")};$("loginBtn").onclick=()=>$("loginCard").scrollIntoView({behavior:"smooth"});window.onGoogleCredential=token=>{let p=JSON.parse(atob(token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));Auth.save({email:p.email,name:p.name||p.email,idToken:token});authUI();sync()};window.addEventListener("load",()=>{Auth.load();authUI();if(window.google){google.accounts.id.initialize({client_id:"99773349762-ok4gijm3iedsqu7alk1k61vur86n7v3j.apps.googleusercontent.com",callback:r=>window.onGoogleCredential(r.credential)});google.accounts.id.renderButton($("googleButton"),{theme:"outline",size:"large"})}});render();