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
  "loginCard", "appContent", "loginBtn", "logoutBtn", "userSubtitle", "googleButton"
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

const logs = JSON.parse(localStorage.getItem("logbook_v3_logs") || "[]");
assert.strictEqual(logs.length, 1, "one log should be stored after submitting Add Log");
assert.strictEqual(logs[0].description, "Automated add log test");
assert.strictEqual(logs[0].userName, "Tester");

const tableHtml = document.getElementById("logTableBody").innerHTML;
assert(tableHtml.includes("Automated add log test"), "new log should render in the table");
assert.strictEqual(document.getElementById("emptyState").style.display, "none");

console.log("add-log regression test passed");
