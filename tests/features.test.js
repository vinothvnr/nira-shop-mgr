const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

class ClassList {
  constructor() { this.values = new Set(); }
  add(name) { this.values.add(name); }
  remove(name) { this.values.delete(name); }
  toggle(name, force) {
    if (force === true) { this.add(name); return true; }
    if (force === false) { this.remove(name); return false; }
    return this.values.has(name) ? (this.remove(name), false) : (this.add(name), true);
  }
  contains(name) { return this.values.has(name); }
}

class Element {
  constructor(id, document) {
    this.id = id;
    this.document = document;
    this.value = "";
    this.textContent = "";
    this.innerHTML = "";
    this.style = {};
    this.dataset = {};
    this.listeners = {};
    this.classList = new ClassList();
    this.clientWidth = 320;
    this.clientHeight = 230;
  }
  addEventListener(type, handler) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(handler);
  }
  dispatchEvent(event) {
    event.target = event.target || this;
    (this.listeners[event.type] || []).forEach(handler => handler(event));
  }
  reset() {
    ["description", "amount"].forEach(id => {
      const element = this.document.getElementById(id);
      if (element) element.value = "";
    });
  }
  closest() { return null; }
  getContext() {
    return {
      setTransform() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
      stroke() {}, fillText() {}, arc() {}, fill() {}, font: "", strokeStyle: "",
      fillStyle: "", lineWidth: 1
    };
  }
}

function createDocument(ids) {
  const document = {
    readyState: "loading",
    listeners: {},
    elements: {},
    getElementById(id) { return this.elements[id] || null; },
    addEventListener(type, handler) {
      this.listeners[type] = this.listeners[type] || [];
      this.listeners[type].push(handler);
    },
    dispatchEvent(event) { (this.listeners[event.type] || []).forEach(handler => handler(event)); }
  };
  ids.forEach(id => { document.elements[id] = new Element(id, document); });
  return document;
}

function createLocalStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    clear() { values.clear(); }
  };
}

const ids = [
  "toast", "syncStatus", "syncDetails", "amountField", "amount", "dayCloseFields", "cashCounter1", "cashCounter2", "paytmTotal", "posSalesTotal", "logType", "dashboardDate", "statsGrid",
  "searchInput", "logTableBody", "emptyState", "logForm", "description", "status", "saveBtn", "cancelEditBtn",
  "toggleSync", "syncPanel", "sheetUrl", "saveSheetUrl", "syncNow", "dashboardToday", "dashboardTabBtn",
  "trendTabBtn", "dashboardPanel", "trendsPanel", "dailyLogChart", "cashFlowChart", "cashCountChart", "statusChart", "dayCloseChart",
  "loginCard", "appContent", "loginBtn", "logoutBtn", "userSubtitle", "googleButton", "statusHelp", "logsPage",
  "ticketsPage", "logsPageBtn", "ticketsPageBtn", "ticketNavCount", "ticketSummary", "workflowStrip", "refreshTickets",
  "ticketTableBody", "ticketEmptyState", "filterTimestamp", "filterUser", "filterLogType", "filterDescription",
  "filterAmount", "filterStatus"
];

const document = createDocument(ids);
const localStorage = createLocalStorage();
localStorage.setItem("logbook_v3_user", JSON.stringify({ email: "tester@example.com", name: "Tester" }));
document.getElementById("logType").value = "Log";
document.getElementById("status").value = "NA";

let serverNextTicket = 999;
let confirmationMessage = "";
async function mockFetch(_url, options) {
  const body = JSON.parse(options.body);
  const byId = {};
  [...(body.logs?.localLogs || []), ...(body.logs?.pendingLogs || [])].forEach(log => {
    if (log?.id) byId[log.id] = { ...log };
  });
  const records = Object.values(byId);
  records.forEach(log => {
    const match = String(log.ticketId || "").match(/^NIRA-(\d+)$/i);
    if (match) serverNextTicket = Math.max(serverNextTicket, Number(match[1]));
  });
  records.forEach(log => {
    if (String(log.logType || "").toLowerCase() === "distributor visit" && !/^NIRA-\d+$/i.test(log.ticketId || "")) {
      log.ticketId = `NIRA-${++serverNextTicket}`;
    }
  });
  return { json: async () => ({ ok: true, logs: records }) };
}

const context = {
  console, document, localStorage, window: null, Date, Math, Number, String, JSON, Error, Array,
  setTimeout() {}, clearTimeout() {},
  fetch: mockFetch,
  confirm: message => {
    confirmationMessage = message;
    return true;
  }
};
context.window = context;
vm.createContext(context);

["js/storage.js", "js/auth.js", "js/sheets.js", "js/app.js"].forEach(file => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context, { filename: file });
});
document.dispatchEvent({ type: "DOMContentLoaded" });
context.Auth.isLoggedIn = () => false;

const defaultUrl = "https://script.google.com/macros/s/AKfycbzl2PjCxTos6w0CUJyFO93pBzHz8BnfAbeQjsgD6ZlZKDeGPUORVZUv_2AFgS3pFmDw3g/exec";
assert.strictEqual(document.getElementById("sheetUrl").value, defaultUrl, "sync URL should be filled by default");

function submitLog({ type = "Log", status = "NA", description, amount = "" }) {
  document.getElementById("logType").value = type;
  document.getElementById("status").value = status;
  document.getElementById("description").value = description;
  document.getElementById("amount").value = amount;
  document.getElementById("logForm").dispatchEvent({ type: "submit", preventDefault() {} });
}

function setDayCloseFields({ cashCounter1, cashCounter2, paytmTotal, posSalesTotal }) {
  document.getElementById("cashCounter1").value = String(cashCounter1);
  document.getElementById("cashCounter2").value = String(cashCounter2);
  document.getElementById("paytmTotal").value = String(paytmTotal);
  document.getElementById("posSalesTotal").value = String(posSalesTotal);
}

async function runFeatureTests() {
submitLog({ description: "Searchable alpha record" });
submitLog({ type: "Cashin", description: "Numeric amount record", amount: "1250" });
await context.SheetsSync.sync();

setDayCloseFields({ cashCounter1: 500, cashCounter2: 100, paytmTotal: 200, posSalesTotal: 600 });
submitLog({ type: "Day close", description: "Ignored for generated Day close details" });
let dayClose = JSON.parse(localStorage.getItem("logbook_v3_logs")).find(log => log.logType === "Day close");
assert(dayClose, "Day close should be stored as a log");
assert.strictEqual(dayClose.amount, -1050, "Day close amount should store the calculated shortage");
assert(confirmationMessage.includes("Cash counter 1: 500.00"), "Day close confirmation should show entered amounts");
assert(confirmationMessage.includes("Shortage: 1050.00"), "Day close confirmation should show discrepancy classification");
assert(dayClose.description.includes("Cash counter 1: 500.00"));
assert(dayClose.description.includes("Day's total cashin: 1250.00"));
assert(dayClose.description.includes("Shortage: 1050.00"));
context.renderTrends();

const searchInput = document.getElementById("searchInput");
searchInput.value = "alpha";
searchInput.dispatchEvent({ type: "input" });
assert(document.getElementById("logTableBody").innerHTML.includes("Searchable alpha record"), "search should find matching logs");
assert(!document.getElementById("logTableBody").innerHTML.includes("Numeric amount record"), "search should hide non-matching logs");

searchInput.value = "";
searchInput.dispatchEvent({ type: "input" });
const amountFilter = document.getElementById("filterAmount");
amountFilter.value = "1250";
amountFilter.dispatchEvent({ type: "input" });
assert(document.getElementById("logTableBody").innerHTML.includes("Numeric amount record"), "amount filter should find the exact amount");
assert(!document.getElementById("logTableBody").innerHTML.includes("Searchable alpha record"), "amount filter should hide other amounts");

const logHtml = document.getElementById("logTableBody").innerHTML;
assert(!logHtml.includes("Edit"), "Logs table should not show Edit");
assert(!logHtml.includes("Delete"), "Logs table should not show Delete");

submitLog({ type: "Distributor visit", status: "Ordered", description: "Vendor 1" });
submitLog({ type: "Distributor visit", status: "Ordered", description: "Vendor 2" });
await context.SheetsSync.sync();
context.render();
let logs = JSON.parse(localStorage.getItem("logbook_v3_logs"));
const vendorIds = logs.filter(log => log.logType === "Distributor visit").map(log => log.ticketId).sort();
assert.deepStrictEqual(vendorIds, ["NIRA-1000", "NIRA-1001"], "ticket IDs should increment from NIRA-1000");

const vendorHtml = document.getElementById("ticketTableBody").innerHTML;
assert(vendorHtml.includes("vendor-status-group"), "Vendor tracking should render separate status table groups");
assert(vendorHtml.includes("Ordered"), "Vendor tracking should include the Ordered table");
assert(vendorHtml.includes("Received"), "Vendor tracking should include the Received table");
assert(vendorHtml.includes("NIRA-1000"), "Vendor tracking should display numeric ticket IDs");
assert(vendorHtml.includes("Next: Received"), "Vendor tracking should provide a next-state action");
assert(!vendorHtml.includes("<th>Status</th>"), "Vendor tracking tables should not show a status column");
assert(!vendorHtml.includes("Last Change"), "Vendor tracking should not show Last Change");
assert(!vendorHtml.includes("Source log:"), "Vendor summaries should not show Source log");

const indexHtml = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const stylesheet = fs.readFileSync(path.join(__dirname, "..", "css/style.css"), "utf8");
const appsScript = fs.readFileSync(path.join(__dirname, "..", "google-app-script/Code.gs"), "utf8");
assert(indexHtml.includes("Vendor tracking"), "index should label the tab Vendor tracking");
assert(stylesheet.includes("overflow: auto"), "status tables should be scrollable");
assert(stylesheet.includes("max-height: 520px"), "status tables should limit the visible rows");
assert(stylesheet.includes("background: #f8fbff"), "status tables should have a soft boundary tone");
assert(appsScript.includes("LockService.getScriptLock()"), "Apps Script should lock ticket allocation");
assert(appsScript.includes("function normalTicketId"), "Apps Script should validate ticket IDs");
assert(appsScript.includes("function nextTicketNumber"), "Apps Script should calculate the shared ticket sequence");

console.log("feature regression tests passed");
}

runFeatureTests().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
