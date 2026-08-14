const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

class ClassList {
  constructor() {
    this.values = new Set();
  }

  add(name) {
    this.values.add(name);
  }

  remove(name) {
    this.values.delete(name);
  }

  toggle(name, force) {
    if (force === true) {
      this.add(name);
      return true;
    }
    if (force === false) {
      this.remove(name);
      return false;
    }
    if (this.values.has(name)) {
      this.remove(name);
      return false;
    }
    this.add(name);
    return true;
  }

  contains(name) {
    return this.values.has(name);
  }
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

  closest() {
    return null;
  }

  scrollIntoView() {}

  getContext() {
    return {
      setTransform() {},
      clearRect() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      fillText() {},
      arc() {},
      fill() {},
      font: "",
      strokeStyle: "",
      fillStyle: "",
      lineWidth: 1
    };
  }
}

function createDocument(ids) {
  const document = {
    readyState: "loading",
    listeners: {},
    elements: {},
    getElementById(id) {
      return this.elements[id] || null;
    },
    addEventListener(type, handler) {
      this.listeners[type] = this.listeners[type] || [];
      this.listeners[type].push(handler);
    },
    dispatchEvent(event) {
      (this.listeners[event.type] || []).forEach(handler => handler(event));
    }
  };

  ids.forEach(id => {
    document.elements[id] = new Element(id, document);
  });

  return document;
}

function createLocalStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    clear() {
      values.clear();
    }
  };
}

const ids = [
  "toast", "syncStatus", "syncDetails", "amountField", "amount", "logType",
  "dashboardDate", "statsGrid", "searchInput", "logTableBody", "emptyState",
  "logForm", "description", "status", "saveBtn", "cancelEditBtn", "toggleSync",
  "syncPanel", "sheetUrl", "saveSheetUrl", "syncNow", "dashboardToday",
  "dashboardTabBtn", "trendTabBtn", "dashboardPanel", "trendsPanel",
  "dailyLogChart", "cashFlowChart", "cashCountChart", "statusChart",
  "loginCard", "appContent", "loginBtn", "logoutBtn", "userSubtitle", "googleButton",
  "statusHelp", "logsPage", "ticketsPage", "logsPageBtn", "ticketsPageBtn",
  "ticketNavCount", "ticketSummary", "workflowStrip", "refreshTickets",
  "ticketTableBody", "ticketEmptyState"
];

const document = createDocument(ids);
const localStorage = createLocalStorage();
localStorage.setItem("logbook_v3_user", JSON.stringify({
  email: "tester@example.com",
  name: "Tester"
}));

document.getElementById("logType").value = "Log";
document.getElementById("status").value = "NA";

document.getElementById("loginCard").classList.add("hidden");
document.getElementById("appContent").classList.add("hidden");
document.getElementById("logoutBtn").classList.add("hidden");
document.getElementById("amountField").classList.add("hidden");
document.getElementById("statusHelp").classList.add("hidden");
document.getElementById("ticketsPage").classList.add("hidden");
document.getElementById("logsPageBtn").classList.add("active");

const context = {
  console,
  document,
  localStorage,
  window: null,
  setTimeout() {},
  clearTimeout() {},
  Date,
  Math,
  Number,
  String,
  JSON,
  Error,
  Array,
  atob(value) {
    return Buffer.from(value, "base64").toString("binary");
  }
};
context.window = context;
vm.createContext(context);

["js/storage.js", "js/auth.js", "js/sheets.js", "js/app.js"].forEach(file => {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  vm.runInContext(source, context, { filename: file });
});

document.dispatchEvent({ type: "DOMContentLoaded" });

document.getElementById("description").value = "Automated add log test";
document.getElementById("logForm").dispatchEvent({
  type: "submit",
  preventDefault() {}
});

let logs = JSON.parse(localStorage.getItem("logbook_v3_logs") || "[]");
assert.strictEqual(logs.length, 1, "one log should be stored after submitting Add Log");
assert.strictEqual(logs[0].description, "Automated add log test");
assert.strictEqual(logs[0].userName, "Tester");

let tableHtml = document.getElementById("logTableBody").innerHTML;
assert(tableHtml.includes("Automated add log test"), "new log should render in the table");
assert.strictEqual(document.getElementById("emptyState").style.display, "none");

document.getElementById("logType").value = "Distributor visit";
document.getElementById("status").value = "NA";
document.getElementById("description").value = "Distributor status missing";
document.getElementById("logForm").dispatchEvent({
  type: "submit",
  preventDefault() {}
});

logs = JSON.parse(localStorage.getItem("logbook_v3_logs") || "[]");
assert.strictEqual(logs.length, 1, "Distributor visit without workflow status should not be added");
assert.strictEqual(document.getElementById("toast").textContent, "Select a workflow status for Distributor visit");

document.getElementById("logType").value = "Distributor visit";
document.getElementById("status").value = "Ordered";
document.getElementById("description").value = "Distributor workflow test";
document.getElementById("logForm").dispatchEvent({
  type: "submit",
  preventDefault() {}
});

logs = JSON.parse(localStorage.getItem("logbook_v3_logs") || "[]");
const ticket = logs.find(log => log.description === "Distributor workflow test");
assert(ticket, "Distributor visit should be stored as a log-backed ticket");
assert.strictEqual(ticket.ticketCreatedBy, "Tester");
assert.strictEqual(ticket.status, "Ordered");
assert.strictEqual(ticket.ticketStatusHistory.length, 1);
assert.strictEqual(ticket.ticketStatusHistory[0].status, "Ordered");
assert.strictEqual(ticket.ticketStatusHistory[0].userName, "Tester");

assert(document.getElementById("ticketTableBody").innerHTML.includes("Distributor workflow test"), "ticket should render in outstanding ticket table");
assert.strictEqual(document.getElementById("ticketNavCount").textContent, "1");
assert(document.getElementById("statsGrid").innerHTML.includes("Outstanding Tickets"), "dashboard should show outstanding ticket metric");
assert(document.getElementById("statsGrid").innerHTML.includes(">1<"), "dashboard outstanding ticket count should be one");

context.advanceTicket(ticket.id);
logs = JSON.parse(localStorage.getItem("logbook_v3_logs") || "[]");
const advanced = logs.find(log => log.id === ticket.id);
assert.strictEqual(advanced.status, "Received");
assert.strictEqual(advanced.ticketStatusHistory.length, 2);
assert.strictEqual(advanced.ticketStatusHistory[1].status, "Received");
assert.strictEqual(advanced.ticketStatusHistory[1].userName, "Tester");

console.log("add-log and ticket workflow regression tests passed");
