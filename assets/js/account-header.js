/* Keeps the desktop and mobile account shortcuts in sync with Supabase Auth. */
(function () {
  const backend = window.VeloraaBackend;
  const desktopLink = document.getElementById('account-quick-link');
  const desktopLabel = document.getElementById('account-quick-link-label');
  const mobileLink = document.getElementById('mobile-account-quick-link');
  const mobileLabel = document.getElementById('mobile-account-quick-link-label');

  function update(session) {
    const signedIn = Boolean(session && session.user);
    const label = signedIn ? 'حساب من' : 'ورود / ثبت‌نام';
    for (const el of [desktopLabel, mobileLabel]) {
      if (el) el.textContent = label;
    }
    for (const el of [desktopLink, mobileLink]) {
      if (!el) continue;
      el.href = 'account.html';
      if (signedIn) {
        el.title = session.user.email || 'حساب کاربری';
        el.setAttribute('aria-label', 'حساب کاربری؛ وارد شده‌اید');
      } else {
        el.removeAttribute('title');
        el.setAttribute('aria-label', 'ورود یا ثبت‌نام');
      }
    }
  }

  if (!backend?.client) {
    update(null);
    console.info('Veloraa account shortcut: Supabase is not configured yet.');
    return;
  }

  backend.client.auth.getSession()
    .then(({ data, error }) => {
      if (error) { console.warn('Could not read auth session:', error.message); update(null); return; }
      update(data?.session || null);
    })
    .catch(error => { console.warn('Could not read auth session:', error); update(null); });

  backend.client.auth.onAuthStateChange((_event, session) => update(session));
})();
