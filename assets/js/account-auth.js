/**
 * Veloraa Shop — Appwrite Account Authentication
 * File: assets/js/account-auth.js
 */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const B = window.VeloraaAppwrite;

  let currentUser = null;
  let currentProfile = null;
  let currentIsAdmin = false;

  function note(message, ok = false) {
    const el = $("auth-message");
    if (!el) return;

    el.textContent = message;
    el.className = "notice " + (ok ? "ok" : "bad");
    el.hidden = false;
  }

  function clearNote() {
    const el = $("auth-message");
    if (el) el.hidden = true;
  }

  function show(el, visible) {
    if (el) el.hidden = !visible;
  }

  function ready() {
    if (!B?.account || typeof B.getCurrentUser !== "function") {
      note(
        "اتصال Appwrite آماده نیست. فایل appwrite-client.js را بررسی کن."
      );
      return false;
    }

    return true;
  }

  async function getProfile(userId) {
    if (
      !B?.tablesDB ||
      !B.config?.databaseId ||
      !B.config?.profilesTableId
    ) {
      return null;
    }

    try {
      return await B.tablesDB.getRow({
        databaseId: B.config.databaseId,
        tableId: B.config.profilesTableId,
        rowId: userId
      });
    } catch (error) {
      if (error?.code === 404) return null;

      console.error("[Veloraa] Profile read error:", error);
      return null;
    }
  }

  async function checkAdminAccess() {
    if (!B?.adminRequest || !B?.config?.adminApiUrl) {
      console.warn(
        "[Veloraa] Admin API is not configured in appwrite-client.js"
      );
      return false;
    }

    try {
      const result = await B.adminRequest({
        url: B.config.adminApiUrl,
        method: "GET"
      });

      return result?.success === true &&
             result?.isAdmin === true;
    } catch (error) {
      console.warn(
        "[Veloraa] Admin verification failed:",
        error
      );

      return false;
    }
  }

  async function saveProfile(userId, values) {
    if (
      !B?.tablesDB ||
      !B.config?.databaseId ||
      !B.config?.profilesTableId
    ) {
      throw new Error("اتصال جدول پروفایل‌های Appwrite آماده نیست.");
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
      show($("admin-link"), false);
      return;
    }

    currentUser = await B.getCurrentUser();

    show($("auth-forms"), !currentUser);
    show($("profile-panel"), !!currentUser);

    if (!currentUser) {
      currentProfile = null;
      currentIsAdmin = false;
      show($("admin-link"), false);
      return;
    }

    // اطلاعات پروفایل و مجوز مدیریت دو موضوع جدا هستند.
    const results = await Promise.allSettled([
      getProfile(currentUser.$id),
      checkAdminAccess()
    ]);

    currentProfile =
      results[0].status === "fulfilled"
        ? results[0].value
        : null;

    currentIsAdmin =
      results[1].status === "fulfilled" &&
      results[1].value === true;

    if ($("profile-email")) {
      $("profile-email").textContent = currentUser.email || "";
    }

    if ($("profile-name")) {
      $("profile-name").value =
        currentProfile?.full_name ||
        currentUser.name ||
        "";
    }

    if ($("profile-phone")) {
      $("profile-phone").value =
        currentProfile?.phone || "";
    }

    if ($("profile-role")) {
      $("profile-role").textContent =
        currentIsAdmin ? "مدیر سایت" : "مشتری";
    }

    show($("admin-link"), currentIsAdmin);
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

        clearNote();

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

          await refresh();

          if (currentIsAdmin) {
            note("ورود مدیر با موفقیت انجام شد.", true);
            location.href = "admin.html";
            return;
          }

          note("ورود موفق بود؛ این حساب دسترسی مدیریت ندارد.", true);
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

        clearNote();

        try {
          const email = $("signup-email")?.value.trim();
          const password = $("signup-password")?.value;
          const name = $("signup-name")?.value.trim();
          const phone = $("signup-phone")?.value.trim();

          if (!email || !password || !name) {
            throw new Error("نام، ایمیل و رمز عبور الزامی هستند.");
          }

          if (password.length < 10) {
            throw new Error("رمز عبور باید حداقل ۱۰ نویسه داشته باشد.");
          }

          const user = await B.account.create({
            userId: window.Appwrite.ID.unique(),
            email,
            password,
            name
          });

          // نقش مدیر هرگز هنگام ثبت‌نام عمومی تعیین نمی‌شود.
          try {
            await saveProfile(user.$id, {
              full_name: name,
              phone: phone || ""
            });
          } catch (profileError) {
            console.error(
              "[Veloraa] Profile creation error:",
              profileError
            );

            note(
              "حساب ساخته شد، اما پروفایل ذخیره نشد. " +
              "تنظیمات جدول profiles را بررسی کن."
            );
            return;
          }

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

        await B.account.deleteSession({
          sessionId: "current"
        });

        currentUser = null;
        currentProfile = null;
        currentIsAdmin = false;

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

        note(
          "اگر ایمیل معتبر باشد، لینک بازیابی ارسال می‌شود.",
          true
        );
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
