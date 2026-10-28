/**
 * Veloraa Shop — Appwrite Account Authentication
 * File: assets/js/account-auth.js
 */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const B = window.VeloraaAppwrite;

  function note(message, ok = false) {
    const el = $("auth-message");
    if (!el) return;

    el.textContent = message;
    el.className = "notice " + (ok ? "ok" : "bad");
    el.hidden = false;
  }

  function ready() {
    if (!B?.account) {
      note("اتصال Appwrite آماده نیست. فایل appwrite-client.js و بارگذاری SDK را بررسی کن.");
      return false;
    }
    return true;
  }

  function show(el, visible) {
    if (el) el.hidden = !visible;
  }

  async function getProfile(userId) {
    if (!B?.tablesDB || !B.config?.databaseId || !B.config?.profilesTableId) {
      return null;
    }

    try {
      return await B.tablesDB.getRow({
        databaseId: B.config.databaseId,
        tableId: B.config.profilesTableId,
        rowId: userId
      });
    } catch (error) {
      // پروفایل ممکن است هنوز ایجاد نشده باشد.
      if (error?.code === 404) return null;
      throw error;
    }
  }

  async function saveProfile(userId, values) {
    if (!B?.tablesDB) {
      throw new Error("اتصال دیتابیس Appwrite آماده نیست.");
    }

    const databaseId = B.config.databaseId;
    const tableId = B.config.profilesTableId;

    const existing = await getProfile(userId);

    const data = {
      full_name: values.full_name || "",
      phone: values.phone || ""
    };

    if (existing) {
      return B.tablesDB.updateRow({
        databaseId,
        tableId,
        rowId: userId,
        data
      });
    }

    return B.tablesDB.createRow({
      databaseId,
      tableId,
      rowId: userId,
      data
    });
  }

  async function refresh() {
    if (!ready()) {
      show($("auth-forms"), true);
      show($("profile-panel"), false);
      return;
    }

    const user = await B.getCurrentUser();

    show($("auth-forms"), !user);
    show($("profile-panel"), !!user);

    if (!user) {
      show($("admin-link"), false);
      return;
    }

    const profile = await getProfile(user.$id);

    if ($("profile-email")) {
      $("profile-email").textContent = user.email || "";
    }

    if ($("profile-name")) {
      $("profile-name").value = profile?.full_name || user.name || "";
    }

    if ($("profile-phone")) {
      $("profile-phone").value = profile?.phone || "";
    }

    // نقش موجود در پروفایل برای نمایش است؛ مجوز مدیر
    // باید جداگانه توسط Admin API سمت سرور بررسی شود.
    const isAdmin = profile?.role === "admin";

    if ($("profile-role")) {
      $("profile-role").textContent = isAdmin ? "مدیر سایت" : "مشتری";
    }

    show($("admin-link"), isAdmin);
  }

  document.addEventListener("DOMContentLoaded", function () {
    const loginForm = $("login-form");
    const signupForm = $("signup-form");
    const profileForm = $("profile-form");

    if (loginForm) {
      loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!ready()) return;

        const btn = loginForm.querySelector('[type="submit"]');

        if (btn) {
          btn.disabled = true;
          btn.textContent = "در حال ورود…";
        }

        try {
          const email = $("login-email")?.value.trim();
          const password = $("login-password")?.value;

          if (!email || !password) {
            throw new Error("ایمیل و رمز عبور را وارد کن.");
          }

          await B.account.createEmailPasswordSession({
            email,
            password
          });

          const user = await B.getCurrentUser();
          const profile = user ? await getProfile(user.$id) : null;

          note("ورود موفق بود.", true);

          if (profile?.role === "admin") {
            location.href = "admin.html";
            return;
          }

          await refresh();
          note("وارد حساب شدی؛ این حساب دسترسی مدیریت ندارد.", true);
        } catch (error) {
          console.error("[Veloraa] Login error:", error);
          note(error?.message || "ورود ناموفق بود.");
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.textContent = "ورود به حساب";
          }
        }
      });
    }

    if (signupForm) {
      signupForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!ready()) return;

        const btn = signupForm.querySelector('[type="submit"]');

        if (btn) {
          btn.disabled = true;
          btn.textContent = "در حال ثبت‌نام…";
        }

        try {
          const email = $("signup-email")?.value.trim();
          const password = $("signup-password")?.value;
          const name = $("signup-name")?.value.trim();

          if (!email || !password) {
            throw new Error("ایمیل و رمز عبور را وارد کن.");
          }

          if (password.length < 10) {
            throw new Error("رمز عبور باید حداقل ۱۰ نویسه داشته باشد.");
          }

          const user = await B.account.create({
            userId: ID.unique(),
            email,
            password,
            name: name || email.split("@")[0]
          });

          // ساخت پروفایل ممکن است به مجوز و فیلدهای درست جدول نیاز داشته باشد.
          try {
            await saveProfile(user.$id, {
              full_name: name || "",
              phone: ""
            });
          } catch (profileError) {
            console.error("[Veloraa] Profile creation error:", profileError);
            note(
              "حساب ساخته شد، اما ذخیره پروفایل کامل نشد. تنظیمات مجوز و فیلدهای جدول profiles را بررسی کن."
            );
            return;
          }

          // ساخت حساب، لزوماً به معنی ورود خودکار نیست.
          await B.account.createEmailPasswordSession({
            email,
            password
          });

          await refresh();
          note("ثبت‌نام و ورود با موفقیت انجام شد.", true);
        } catch (error) {
          console.error("[Veloraa] Signup error:", error);
          note(error?.message || "ثبت‌نام انجام نشد.");
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.textContent = "ساخت حساب کاربری";
          }
        }
      });
    }

    if (profileForm) {
      profileForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!ready()) return;

        try {
          const user = await B.getCurrentUser();

          if (!user) {
            throw new Error("ابتدا وارد حساب کاربری شو.");
          }

          await saveProfile(user.$id, {
            full_name: $("profile-name")?.value.trim() || "",
            phone: $("profile-phone")?.value.trim() || ""
          });

          await refresh();
          note("اطلاعات پروفایل ذخیره شد.", true);
        } catch (error) {
          console.error("[Veloraa] Profile save error:", error);
          note(error?.message || "ذخیره اطلاعات ناموفق بود.");
        }
      });
    }

    $("logout")?.addEventListener("click", async function () {
      try {
        if (!ready()) return;

        await B.account.deleteSession({ sessionId: "current" });
        show($("admin-link"), false);
        await refresh();
        note("از حساب خارج شدی.", true);
      } catch (error) {
        console.error("[Veloraa] Logout error:", error);
        note(error?.message || "خروج ناموفق بود.");
      }
    });

    $("reset-password")?.addEventListener("click", async function () {
      if (!ready()) return;

      const email = $("login-email")?.value.trim();

      if (!email) {
        note("ابتدا ایمیل خودت را در کادر ورود بنویس.");
        return;
      }

      try {
        await B.account.createRecovery({
          email,
          url: location.origin + "/account.html"
        });

        note("اگر ایمیل معتبر باشد، لینک بازیابی ارسال می‌شود.", true);
      } catch (error) {
        console.error("[Veloraa] Recovery error:", error);
        note(error?.message || "ارسال لینک بازیابی انجام نشد.");
      }
    });

    refresh().catch(function (error) {
      console.error("[Veloraa] Account refresh error:", error);
      note(error?.message || "بارگذاری حساب انجام نشد.");
    });
  });
})();
