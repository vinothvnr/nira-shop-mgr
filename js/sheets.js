const SheetsSync = (() => {
  const U = "logbook_v3_url";
  const Q = "logbook_v3_queue";

  const getUrl = () => localStorage.getItem(U) || "";
  const setUrl = value => localStorage.setItem(U, value.trim());
  const queue = () => JSON.parse(localStorage.getItem(Q) || "[]");
  const saveQueue = records => localStorage.setItem(Q, JSON.stringify(records));

  const enqueue = record => {
    const records = queue();
    const index = records.findIndex(item => item.id === record.id);

    if (index < 0) {
      records.push(record);
    } else {
      records[index] = { ...records[index], ...record };
    }

    saveQueue(records);
  };

  async function sync() {
    if (!getUrl()) throw Error("URL not configured");

    const response = await fetch(getUrl(), {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "sync",
        logs: {
          localLogs: LogStore.getAll(),
          pendingLogs: queue()
        },
        user: Auth.getUser()
      })
    });
    const data = await response.json();

    if (!data.ok) throw Error(data.error || "Sync failed");

    (data.logs || []).forEach(LogStore.upsert);
    saveQueue([]);

    return data;
  }

  return { getUrl, setUrl, queue, enqueue, sync };
})();

if (typeof window !== 'undefined') {
  window.SheetsSync = SheetsSync;
}
