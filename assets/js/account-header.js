(function () {
  const client = window.VeloraaBackend?.client;
  const link = document.getElementById('account-quick-link');
  const label = document.getElementById('account-quick-link-label');

  if (!client || !link || !label) {
    console.warn('Account header: Supabase client or header link not found.');
    return;
  }

  function updateHeader(session) {
    if (session?.user) {
      label.textContent = 'حساب من';
      link.href = 'account.html';
      link.title = session.user.email || 'حساب کاربری';
      link.setAttribute('aria-label', 'حساب کاربری؛ وارد شده‌اید');
    } else {
      label.textContent = 'ورود / ثبت‌نام';
      link.href = 'account.html';
      link.removeAttribute('title');
      link.setAttribute('aria-label', 'ورود یا ثبت‌نام');
    }
  }

  client.auth.getSession()
    .then(({ data, error }) => {
      if (error) {
        console.error('Session check failed:', error.message);
        return;
      }
      updateHeader(data.session);
    });

  client.auth.onAuthStateChange((_event, session) => {
    updateHeader(session);
  });
})();

