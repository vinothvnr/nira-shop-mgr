const Auth = (() => {
  const K = "logbook_v3_user";
  let user = null;

  const load = () => {
    try {
      user = JSON.parse(localStorage.getItem(K) || "null");
    } catch {
      user = null;
    }
  };

  const save = value => {
    user = value;
    localStorage.setItem(K, JSON.stringify(value));
  };

  const clear = () => {
    user = null;
    localStorage.removeItem(K);
  };

  return {
    load,
    save,
    clear,
    isLoggedIn: () => !!user,
    getUser: () => user
  };
})();
