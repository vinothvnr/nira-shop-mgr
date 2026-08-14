const LogStore = (() => {
  const K = "logbook_v3_logs";

  const getAll = () => JSON.parse(localStorage.getItem(K) || "[]");
  const save = logs => localStorage.setItem(K, JSON.stringify(logs));

  const upsert = record => {
    const logs = getAll();
    const index = logs.findIndex(item => item.id === record.id);

    if (index < 0) {
      logs.unshift(record);
    } else {
      logs[index] = { ...logs[index], ...record };
    }

    save(logs);
  };

  const remove = id => save(getAll().filter(item => item.id !== id));
  const clear = () => localStorage.removeItem(K);

  return { getAll, upsert, remove, clear };
})();
