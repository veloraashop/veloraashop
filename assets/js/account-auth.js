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

  const PROFILE_FIELDS = {
    full_name: "name",
    phone: "phone",
    national_id: "national-id",
    birth_date: "birth-date",
    recipient_name: "recipient",
    alternate_phone: "alt-phone",
    province: "province",
    city: "city",
    postal_code: "postal",
    street: "street",
    alley: "alley",
    building_number: "building",
    floor: "floor",
    unit: "unit",
    address_details: "address-details"
  };

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
    if (
      !B?.account ||
      typeof B.getCurrentUser !== "function" ||
      !B.tablesDB ||
      !B.config?.databaseId ||
      !B.config?.profilesTableId
    ) {
      note("اتصال Appwrite یا تنظیمات جدول profiles آماده نیست.");
      return false;
    }

    return true;
  }

  function getFieldValue(prefix, field) {
    const el = $(prefix + "-" + PROFILE_FIELDS[field]);
    return el ? el.value.trim() : "";
  }

  function dateToDatetime(value) {
    if (!value) return "";

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error("فرمت تاریخ تولد معتبر نیست.");
    }

    const date = new Date(value + "T00:00:00.000Z");

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new Error("تاریخ تولد معتبر نیست.");
    }

    return date.toISOString();
  }

  function datetimeToDate(value) {
    if (!value) return "";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? ""
      : date.toISOString().slice(0, 10);
  }

  function collectProfile(prefix) {
    const data = {};

    for (const field of Object.keys(PROFILE_FIELDS)) {
      data[field] = getFieldValue(prefix, field);
    }

    data.birth_date = dateToDatetime(data.birth_date);

    return data;
  }

  function validateProfile(data) {
    if (!data.full_name) {
      throw new Error("نام و نام خانوادگی را وارد کن.");
    }

    if (!data.phone) {
      throw new Error("شماره موبایل الزامی است.");
    }

    if (!/^\d{10}$/.test(data.national_id)) {
      throw new Error("کد ملی باید دقیقاً ۱۰ رقم انگلیسی باشد.");
    }

    if (
      data.postal_code &&
      !/^\d{10}$/.test(data.postal_code)
    ) {
      throw new Error("کد پستی باید ۱۰ رقم انگلیسی باشد.");
    }

    return data;
  }

  function normalizeProfile(data) {
    const result = { ...data };

    // برای ستون Datetime، مقدار رشته خالی ارسال نکن.
    if (!result.birth_date) {
      delete result.birth_date;
    }

    return result;
  }

  async function getProfile(userId) {
    try {
      return await B.tablesDB.getRow({
        databaseId: B.config.databaseId,
        tableId: B.config.profilesTableId,
        rowId: userId
      });
    } catch (error) {
      if (error?.code === 404) return null;

      console.error("[Veloraa] Profile read error:", error);
      throw error;
    }
  }

  async function checkAdminAccess() {
    if (!B?.adminRequest || !B?.config?.adminApiUrl) {
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
      console.warn("[Veloraa] Admin verification failed:", error);
      return false;
    }
  }

  async function saveProfile(userId, values) {
    const existing = await getProfile(userId);
    const data = normalizeProfile(values);

    if (existing) {
      // نقش حساب از فرم عمومی قابل تغییر نیست.
      delete data.role;

       data.userId = userId;

return B.tablesDB.createRow({
  databaseId: B.config.databaseId,
  tableId: B.config.profilesTableId,
  rowId: userId,
  data,
  permissions: [
    `read("user:${userId}")`,
    `update("user:${userId}")`,
    `delete("user:${userId}")`
  ]
});
    }

    // نقش اولیه مشتری؛ هرگز از ورودی کاربر دریافت نمی‌شود.
    data.role = "customer";

    return B.tablesDB.createRow({
      databaseId: B.config.databaseId,
      tableId: B.config.profilesTableId,
      rowId: userId,
      data
    });
  }

  function populateProfile(profile, user) {
    const values = {
      full_name: profile?.full_name || user?.name || "",
      phone: profile?.phone || "",
      national_id: profile?.national_id || "",
      birth_date: datetimeToDate(profile?.birth_date),
      recipient_name: profile?.recipient_name || "",
      alternate_phone: profile?.alternate_phone || "",
      province: profile?.province || "",
      city: profile?.city || "",
      postal_code: profile?.postal_code || "",
      street: profile?.street || "",
      alley: profile?.alley || "",
      building_number: profile?.building_number || "",
      floor: profile?.floor || "",
      unit: profile?.unit || "",
      address_details: profile?.address_details || ""
    };

    for (const [field, suffix] of Object.entries(PROFILE_FIELDS)) {
      const el = $("profile-" + suffix);
      if (!el) continue;

      el.value = values[field] || "";
    }
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

    if ($("profile-email")) {
      $("profile-email").textContent = currentUser.email || "";
    }

    const results = await Promise.allSettled([
      getProfile(currentUser.$id),
      checkAdminAccess()
    ]);

    if (results[0].status === "fulfilled") {
      currentProfile = results[0].value;
    } else {
      currentProfile = null;
      console.error(
        "[Veloraa] Profile read failed:",
        results[0].reason
      );
    }

    currentIsAdmin =
      results[1].status === "fulfilled" &&
      results[1].value === true;

    if (currentProfile) {
      populateProfile(currentProfile, currentUser);
    } else {
      populateProfile({}, currentUser);
    }

    if ($("profile-role")) {
      $("profile-role").textContent =
        currentIsAdmin ? "مدیر سایت" : "مشتری";
    }

    show($("admin-link"), currentIsAdmin);

    if (!currentProfile) {
      
note(
  "خطای ذخیره پروفایل: " +
  (profileError?.message || String(profileError)) +
  " | Code: " + (profileError?.code ?? "نامشخص") +
  " | Type: " + (profileError?.type ?? "نامشخص")
);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    const loginForm = $("login-form");
    const signupForm = $("signup-form");
    const profileForm = $("profile-form");

    // ورود
    loginForm?.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (!ready()) return;

      const btn = loginForm.querySelector('[type="submit"]');
      const oldText = btn?.textContent;

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
          note("ورود مدیر موفق بود.", true);
          location.href = "admin.html";
          return;
        }

        if (currentProfile) {
          note("با موفقیت وارد حساب کاربری شدی.", true);
        }
      } catch (error) {
        console.error("[Veloraa] Login error:", error);
        note(error?.message || "ورود ناموفق بود.");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = oldText || "ورود به حساب";
        }
      }
    });

    // ثبت‌نام
    signupForm?.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (!ready()) return;

      const btn = signupForm.querySelector('[type="submit"]');
      const oldText = btn?.textContent;

      if (btn) {
        btn.disabled = true;
        btn.textContent = "در حال ثبت‌نام…";
      }

      clearNote();

      let accountCreated = false;

      try {
        const email = $("signup-email")?.value.trim();
        const password = $("signup-password")?.value;
        const name = $("signup-name")?.value.trim();

        if (!email || !password || !name) {
          throw new Error("نام، ایمیل و رمز عبور الزامی هستند.");
        }

        if (password.length < 10) {
          throw new Error("رمز عبور باید حداقل ۱۰ نویسه باشد.");
        }

        const values = validateProfile(collectProfile("signup"));

        const user = await B.account.create({
          userId: window.Appwrite.ID.unique(),
          email,
          password,
          name
        });

        accountCreated = true;

        // مهم: ابتدا نشست ایجاد می‌شود.
        await B.account.createEmailPasswordSession({
          email,
          password
        });

        // سپس پروفایل در جدول ذخیره می‌شود.
        try {
          await saveProfile(user.$id, values);
        } catch (profileError) {
          console.error(
            "[Veloraa] Profile creation error:",
            profileError
          );

          note(
            "حساب ساخته شد و وارد شدی، اما پروفایل ذخیره نشد. " +
            "خطای Console و مجوزهای جدول profiles را بررسی کن."
          );
          return;
        }

        await refresh();
        note("ثبت‌نام و ذخیره پروفایل موفق بود.", true);
      } catch (error) {
        console.error("[Veloraa] Signup error:", error);

        if (accountCreated) {
          note(
            "حساب ساخته شده است، اما مرحله بعدی کامل نشد. " +
            (error?.message || "خطای ناشناخته")
          );
        } else {
          note(error?.message || "ثبت‌نام انجام نشد.");
        }
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = oldText || "ساخت حساب کاربری";
        }
      }
    });

    // ویرایش پروفایل
    profileForm?.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (!ready()) return;

      const btn = profileForm.querySelector('[type="submit"]');
      const oldText = btn?.textContent;

      if (btn) {
        btn.disabled = true;
        btn.textContent = "در حال ذخیره…";
      }

      clearNote();

      try {
        const user = await B.getCurrentUser();

        if (!user) {
          throw new Error("ابتدا وارد حساب کاربری شو.");
        }

        const values = validateProfile(collectProfile("profile"));

        await saveProfile(user.$id, values);
        await refresh();

        if (currentProfile) {
          note("اطلاعات پروفایل ذخیره شد.", true);
        }
      } catch (error) {
        console.error("[Veloraa] Profile save error:", error);
        note(error?.message || "ذخیره پروفایل ناموفق بود.");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = oldText || "ذخیره تغییرات";
        }
      }
    });

    // خروج
    $("logout")?.addEventListener("click", async function () {
      try {
        if (!ready()) return;

        await B.account.deleteSession({
          sessionId: "current"
        });

        currentUser = null;
        currentProfile = null;
        currentIsAdmin = false;

        await refresh();
        note("از حساب خارج شدی.", true);
      } catch (error) {
        console.error("[Veloraa] Logout error:", error);
        note(error?.message || "خروج ناموفق بود.");
      }
    });

    // بازیابی رمز
    $("reset-password")?.addEventListener("click", async function () {
      if (!ready()) return;

      const email = $("login-email")?.value.trim();

      if (!email) {
        note("ابتدا ایمیل خودت را وارد کن.");
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
        note(error?.message || "ارسال لینک بازیابی ناموفق بود.");
      }
    });

    refresh().catch(function (error) {
      console.error("[Veloraa] Account refresh error:", error);
      note(error?.message || "بارگذاری حساب انجام نشد.");
    });
  });
})();
