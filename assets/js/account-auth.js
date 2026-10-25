
(function () {
  const B = window.VeloraaBackend;
  const $ = id => document.getElementById(id);

  function note(t, ok = false) {
    const n = $('auth-message');
    if (n) {
      n.textContent = t;
      n.className = 'notice ' + (ok ? 'ok' : 'bad');
      n.hidden = false;
    }
  }

  function unavailable() {
    note('برای فعال شدن حساب واقعی، آدرس پروژه و کلید عمومی Supabase را در assets/js/supabase-client.js تنظیم کن.');
  }

  async function refresh() {
    if (!B?.client) {
      unavailable();
      return;
    }

    const { data: { session }, error: sessionError } =
      await B.client.auth.getSession();

    if (sessionError) {
      note('بررسی وضعیت ورود ناموفق بود: ' + sessionError.message);
      return;
    }

    $('auth-forms').hidden = !!session;
    $('profile-panel').hidden = !session;

    if (!session) return;

    const { data: p, error } = await B.client
      .from('profiles')
      .select('full_name,phone,role')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      note('حساب وارد شده، اما دریافت پروفایل ناموفق بود: ' + error.message);
    }

    $('profile-email').textContent = session.user.email || '';
    $('profile-name').value = p?.full_name || '';
    $('profile-phone').value = p?.phone || '';
    $('profile-role').textContent =
      p?.role === 'admin' ? 'مدیر سایت' : 'مشتری';

    $('admin-link').hidden = p?.role !== 'admin';
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!B?.client) {
      unavailable();
      return;
    }

    $('signup-form').addEventListener('submit', async e => {
      e.preventDefault();

      const email = $('signup-email').value.trim();
      const password = $('signup-password').value;
      const name = $('signup-name').value.trim();
      const phoneInput = $('signup-phone');
      const phone = phoneInput ? phoneInput.value.trim() : '';

      if (!name) return note('نام و نام خانوادگی را وارد کن.');
      if (password.length < 10) {
        return note('رمز عبور باید حداقل ۱۰ نویسه داشته باشد.');
      }

      const { data, error } = await B.client.auth.signUp({
        email,
        password,
        options: {
  data: {
    full_name: name,
    phone: phone
  },
  emailRedirectTo: 'https://veloraashop.dpdns.org/account.html'
}
      });

      if (error) return note(error.message);

      if (data.session) {
        note('ثبت‌نام موفق بود. در حال بارگذاری حساب کاربری…', true);
        await refresh();
      } else {
        note(
          'ثبت‌نام انجام شد. ایمیلت را تأیید کن و سپس وارد حساب شو.',
          true
        );
      }
    });

    $('login-form').addEventListener('submit', async e => {
      e.preventDefault();

      const { error } = await B.client.auth.signInWithPassword({
        email: $('login-email').value.trim(),
        password: $('login-password').value
      });

      if (error) {
        return note('ورود ناموفق بود؛ ایمیل و رمز عبور را بررسی کن.');
      }

      note('با موفقیت وارد شدی.', true);
      await refresh();
    });

    $('profile-form').addEventListener('submit', async e => {
      e.preventDefault();

      const { data: { user }, error: userError } =
        await B.client.auth.getUser();

      if (userError || !user) {
        return note('نشست ورود معتبر نیست؛ دوباره وارد حساب شو.');
      }

      const { error } = await B.client
        .from('profiles')
        .update({
          full_name: $('profile-name').value.trim(),
          phone: $('profile-phone').value.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      note(
        error ? error.message : 'اطلاعات پروفایل ذخیره شد.',
        !error
      );
    });

    $('logout').addEventListener('click', async () => {
      const { error } = await B.client.auth.signOut();

      if (error) return note(error.message);

      await refresh();
      note('از حساب خارج شدی.', true);
    });

    $('reset-password').addEventListener('click', async () => {
      const email = $('login-email').value.trim();

      if (!email) {
        return note('ابتدا ایمیل خودت را در کادر ورود بنویس.');
      }

      const { error } = await B.client.auth.resetPasswordForEmail(email, {
        redirectTo: location.origin + location.pathname
      });

      note(
        error
          ? error.message
          : 'اگر این ایمیل ثبت شده باشد، لینک بازیابی برای آن ارسال می‌شود.',
        !error
      );
    });

    refresh();

    B.client.auth.onAuthStateChange(() => {
      setTimeout(refresh, 0);
    });
  });
})();
