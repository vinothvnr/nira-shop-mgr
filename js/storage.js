const LogStore = (() => {
  const KEY = "logbook_v1_logs";

  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveAll(logs) {
    localStorage.setItem(KEY, JSON.stringify(logs));
  }

  function add(log) {
    const logs = getAll();
    logs.unshift(log);
    saveAll(logs);
    return log;
  }

  function update(id, changes) {
    const logs = getAll().map(x => x.id === id ? {...x, ...changes} : x);
    saveAll(logs);
  }

  function remove(id) {
    saveAll(getAll().filter(x => x.id !== id));
  }

  function clear() {
    localStorage.removeItem(KEY);
  }

  return { getAll, add, update, remove, clear };
})();
