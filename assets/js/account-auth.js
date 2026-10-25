
(function () {
  const B = window.VeloraaBackend;
  const $ = id => document.getElementById(id);
  const SITE_URL = 'https://veloraashop.dpdns.org';
  const ACCOUNT_URL = SITE_URL + '/account.html';

  function note(message, ok = false) {
    const n = $('auth-message');
    if (!n) return;
    n.textContent = message;
    n.className = 'notice ' + (ok ? 'ok' : 'bad');
    n.hidden = false;
  }

  function unavailable() {
    note('تنظیمات Supabase را در assets/js/supabase-client.js بررسی کن.');
  }

  function setBusy(button, busy, text) {
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.textContent = text || 'لطفاً صبر کن…';
    } else {
      button.disabled = false;
      if (button.dataset.originalText) {
        button.textContent = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    }
  }

  function getResendButton() {
    let button = $('resend-confirmation');
    if (button) return button;

    const form = $('signup-form');
    if (!form) return null;

    button = document.createElement('button');
    button.id = 'resend-confirmation';
    button.type = 'button';
    button.className = 'btn';
    button.textContent = 'ارسال مجدد ایمیل تأیید';
    button.style.marginTop = '10px';

    const actions = form.querySelector('.actions');
    if (actions) {
      actions.appendChild(button);
    } else {
      form.appendChild(button);
    }

    return button;
  }

  async function refresh() {
    if (!B?.client) {
      unavailable();
      return;
    }

    const { data, error } = await B.client.auth.getSession();

    if (error) {
      note('بررسی وضعیت ورود ناموفق بود: ' + error.message);
      return;
    }

    const session = data.session;

    $('auth-forms').hidden = !!session;
    $('profile-panel').hidden = !session;

    if (!session) return;

    const { data: profile, error: profileError } = await B.client
      .from('profiles')
      .select('full_name, phone, role')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profileError) {
      note('دریافت پروفایل ناموفق بود: ' + profileError.message);
    }

    $('profile-email').textContent = session.user.email || '';
    $('profile-name').value = profile?.full_name || '';
    $('profile-phone').value = profile?.phone || '';
    $('profile-role').textContent =
      profile?.role === 'admin' ? 'مدیر سایت' : 'مشتری';

    $('admin-link').hidden = profile?.role !== 'admin';
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!B?.client) {
      unavailable();
      return;
    }

    const resendButton = getResendButton();

    $('signup-form').addEventListener('submit', async e => {
      e.preventDefault();

      const form = e.currentTarget;
      const submitButton = form.querySelector(
        'button[type="submit"]'
      );

      const email = $('signup-email').value.trim();
      const password = $('signup-password').value;
      const name = $('signup-name').value.trim();
      const phone = $('signup-phone')
        ? $('signup-phone').value.trim()
        : '';

      if (!name) return note('نام و نام خانوادگی را وارد کن.');

      if (password.length < 10) {
        return note('رمز عبور باید حداقل ۱۰ نویسه داشته باشد.');
      }

      setBusy(submitButton, true, 'در حال ثبت‌نام…');

      try {
        const { data, error } = await B.client.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              phone
            },
            emailRedirectTo: ACCOUNT_URL
          }
        });

        if (error) {
          note('ثبت‌نام ناموفق بود: ' + error.message);
          return;
        }

        if (data.session) {
          note('ثبت‌نام موفق بود.', true);
          await refresh();
        } else {
          note(
            'درخواست ثبت‌نام ارسال شد. صندوق ورودی و هرزنامه را بررسی کن. اگر ایمیل نیامد، از دکمه ارسال مجدد استفاده کن.',
            true
          );
        }
      } catch (err) {
        note('خطای غیرمنتظره: ' + (err.message || err));
      } finally {
        setBusy(submitButton, false);
      }
    });

    if (resendButton) {
      resendButton.addEventListener('click', async () => {
        const email = $('signup-email').value.trim();

        if (!email) {
          return note(
            'ابتدا ایمیل خودت را در کادر ایمیل ثبت‌نام وارد کن.'
          );
        }

        setBusy(resendButton, true, 'در حال ارسال…');

        try {
          const { error } = await B.client.auth.resend({
            type: 'signup',
            email,
            options: {
              emailRedirectTo: ACCOUNT_URL
            }
          });

          if (error) {
            note('ارسال مجدد ناموفق بود: ' + error.message);
          } else {
            note(
              'اگر حساب تأییدنشده‌ای با این ایمیل وجود داشته باشد، درخواست ارسال مجدد ثبت شده است. صندوق ورودی و هرزنامه را بررسی کن.',
              true
            );
          }
        } catch (err) {
          note('خطای ارسال ایمیل: ' + (err.message || err));
        } finally {
          setBusy(resendButton, false);
        }
      });
    }

    $('login-form').addEventListener('submit', async e => {
      e.preventDefault();

      const button = e.currentTarget.querySelector(
        'button[type="submit"]'
      );

      setBusy(button, true, 'در حال ورود…');

      try {
        const { error } = await B.client.auth.signInWithPassword({
          email: $('login-email').value.trim(),
          password: $('login-password').value
        });

        if (error) {
          note('ورود ناموفق بود: ' + error.message);
          return;
        }

        note('با موفقیت وارد شدی.', true);
        await refresh();
      } catch (err) {
        note('خطای ورود: ' + (err.message || err));
      } finally {
        setBusy(button, false);
      }
    });

    $('profile-form').addEventListener('submit', async e => {
      e.preventDefault();

      const button = e.currentTarget.querySelector(
        'button[type="submit"]'
      );

      setBusy(button, true, 'در حال ذخیره…');

      try {
        const { data, error: userError } =
          await B.client.auth.getUser();

        if (userError || !data.user) {
          note('نشست معتبر نیست؛ دوباره وارد حساب شو.');
          return;
        }

        const { error } = await B.client
          .from('profiles')
          .update({
            full_name: $('profile-name').value.trim(),
            phone: $('profile-phone').value.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', data.user.id);

        if (error) {
          note('ذخیره پروفایل ناموفق بود: ' + error.message);
        } else {
          note('اطلاعات پروفایل ذخیره شد.', true);
        }
      } catch (err) {
        note('خطای ذخیره پروفایل: ' + (err.message || err));
      } finally {
        setBusy(button, false);
      }
    });

    $('logout').addEventListener('click', async () => {
      const { error } = await B.client.auth.signOut();

      if (error) {
        note('خروج ناموفق بود: ' + error.message);
        return;
      }

      await refresh();
      note('از حساب خارج شدی.', true);
    });

    $('reset-password').addEventListener('click', async () => {
      const email = $('login-email').value.trim();

      if (!email) {
        return note('ابتدا ایمیل خودت را در کادر ورود بنویس.');
      }

      const { error } =
        await B.client.auth.resetPasswordForEmail(email, {
          redirectTo: ACCOUNT_URL
        });

      note(
        error
          ? 'درخواست بازیابی ناموفق بود: ' + error.message
          : 'اگر ایمیل قابل بازیابی باشد، درخواست ارسال لینک ثبت شده است. صندوق ورودی و هرزنامه را بررسی کن.',
        !error
      );
    });

    refresh();

    B.client.auth.onAuthStateChange(() => {
      setTimeout(refresh, 0);
    });
  });
})();
