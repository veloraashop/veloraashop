(function () {
  "use strict";

  const A = window.VeloraaAppwrite;
  const $ = (id) => document.getElementById(id);

  let products = [];
  let authorized = false;
  let loading = false;

  const unsupportedViews = new Set([
    "orders",
    "categories",
    "coupons",
    "customers"
  ]);

  const fmt = (value) =>
    new Intl.NumberFormat("fa-IR", {
      maximumFractionDigits: 0
    }).format(Number(value) || 0);

  const money = (value) => fmt(value) + " تومان";

  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  function note(message, type = "error") {
    const el = $("admin-message");
    if (!el) {
      console[type === "ok" ? "info" : "error"](message);
      return;
    }

    el.textContent = message;
    el.className = "notice" + (type === "ok" ? " ok" : "");
    el.hidden = false;
  }

  function clearNote() {
    if ($("admin-message")) {
      $("admin-message").hidden = true;
    }
  }

  function emptyRow(columns, message) {
    return `<tr><td colspan="${columns}" class="empty-state">${esc(message)}</td></tr>`;
  }

  function getId(product) {
    return String(product?.$id ?? product?.id ?? "");
  }

  function normalizeProduct(item) {
    const p = { ...item };

    p.id = getId(item);
    p.name = p.name ?? "";
    p.brand = p.brand ?? "";
    p.category = p.category ?? "other";
    p.price = Number(p.price ?? p.originalPrice ?? p.oldPrice ?? 0);
    p.discount = Number(
      p.discount_percent ?? p.discount ?? 0
    );
    p.stock = Number(
      p.stock_quantity ?? p.stock ?? 0
    );
    p.image = p.image_url ?? p.image ?? "";
    p.variant = p.variant ?? "";
    p.description = p.description ?? "";
    p.active = p.is_active ?? p.isActive ?? true;

    return p;
  }

  function getApiBase() {
    const base = A?.config?.adminApiUrl;

    if (!base) {
      throw new Error(
        "آدرس Admin API در assets/js/appwrite-client.js تنظیم نشده است."
      );
    }

    return base.endsWith("/") ? base : base + "/";
  }

  async function api(path, method = "GET", body) {
    if (!A?.adminRequest) {
      throw new Error(
        "اتصال Appwrite بارگذاری نشده است. فایل appwrite-client.js را بررسی کن."
      );
    }

    const url = getApiBase() + path.replace(/^\/+/, "");

    const options = { url, method };

    if (body !== undefined) {
      options.body = body;
    }

    return await A.adminRequest(options);
  }

  async function getCurrentUser() {
    if (typeof A?.getCurrentUser === "function") {
      return await A.getCurrentUser();
    }

    if (A?.account?.get) {
      return await A.account.get();
    }

    throw new Error(
      "تابع بررسی حساب در appwrite-client.js پیدا نشد."
    );
  }

  async function ensureAdmin() {
    $("admin-app").hidden = true;
    $("admin-login-needed").hidden = false;

    const user = await getCurrentUser();

    if (!user) {
      note("ابتدا وارد حساب کاربری مدیر شو.");
      return false;
    }

    // مجوز واقعی ادمین در سمت سرور بررسی می‌شود.
    const result = await api("");

    if (!result?.success || result.isAdmin !== true) {
      throw new Error("حساب فعلی مجوز مدیریت فروشگاه را ندارد.");
    }

    authorized = true;
    $("admin-login-needed").hidden = true;
    $("admin-app").hidden = false;

    return true;
  }

  function go(view) {
    const knownViews = [
      "dashboard",
      "products",
      "orders",
      "categories",
      "coupons",
      "customers"
    ];

    if (!knownViews.includes(view)) {
      view = "dashboard";
    }

    document.querySelectorAll("[data-view]").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.view === view
      );
    });

    document.querySelectorAll("[data-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== view;
    });

    clearNote();

    if (unsupportedViews.has(view)) {
      note(
        "این بخش هنوز به API و جدول مربوطه متصل نشده است. " +
        "برای جلوگیری از نمایش اطلاعات نادرست، فعلاً غیرفعال است.",
        "error"
      );
    }
  }

  function productPayload() {
    const name = $("p-name").value.trim();
    const price = Number($("p-price").value);
    const discount = Number($("p-discount").value || 0);
    const stock = Number($("p-stock").value || 0);
    const image = $("p-image-url").value.trim();

    if (!name) {
      throw new Error("نام محصول الزامی است.");
    }

    if (!Number.isFinite(price) || price < 0) {
      throw new Error("قیمت باید عددی معتبر و غیرمنفی باشد.");
    }

    if (
      !Number.isInteger(discount) ||
      discount < 0 ||
      discount > 100
    ) {
      throw new Error("تخفیف باید عدد صحیح بین صفر تا ۱۰۰ باشد.");
    }

    if (!Number.isInteger(stock) || stock < 0) {
      throw new Error("موجودی باید عدد صحیح و غیرمنفی باشد.");
    }

    if ($("p-image-file")?.files?.length) {
      throw new Error(
        "آپلود فایل تصویر هنوز فعال نیست. فعلاً نشانی تصویر را وارد کن."
      );
    }

    if (image) {
      try {
        const parsed = new URL(image);

        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
          throw new Error();
        }
      } catch {
        throw new Error("نشانی تصویر معتبر نیست.");
      }
    }

    return {
      name,
      brand: $("p-brand").value.trim(),
      category: $("p-category").value.trim() || "other",
      price,
      discount,
      stock,
      variant: $("p-variant").value.trim(),
      image,
      description: $("p-description").value.trim(),
      isActive: $("p-active").checked
    };
  }

  function resetProduct() {
    $("product-form").reset();
    $("product-id").value = "";
    $("product-form-title").textContent = "افزودن محصول";
    $("p-discount").value = 0;
    $("p-stock").value = 0;
    $("p-active").checked = true;

    if ($("p-image-file")) {
      $("p-image-file").value = "";
    }
  }

  function fillProduct(product) {
    $("product-id").value = product.id;
    $("product-form-title").textContent = "ویرایش محصول";
    $("p-name").value = product.name;
    $("p-brand").value = product.brand;
    $("p-category").value = product.category;
    $("p-price").value = product.price;
    $("p-discount").value = product.discount;
    $("p-stock").value = product.stock;
    $("p-variant").value = product.variant;
    $("p-image-url").value = product.image;
    $("p-description").value = product.description;
    $("p-active").checked = Boolean(product.active);

    go("products");

    $("product-form-card").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function renderProducts() {
    const term = ($("product-search")?.value || "")
      .trim()
      .toLowerCase();

    const filtered = products.filter((p) =>
      `${p.name} ${p.brand} ${p.category}`
        .toLowerCase()
        .includes(term)
    );

    $("product-count").textContent =
      fmt(filtered.length) + " محصول";

    $("products-table").innerHTML = filtered.map((p) => {
      const status = !p.active
        ? "پنهان"
        : p.stock <= 0
          ? "ناموجود"
          : "موجود";

      const statusClass = !p.active
        ? ""
        : p.stock <= 0
          ? "danger"
          : "success";

      const image = p.image
        ? `<img src="${esc(p.image)}" alt="${esc(p.name)}"
             loading="lazy"
             style="width:46px;height:46px;object-fit:cover;border-radius:9px"
             onerror="this.style.display='none'">`
        : "—";

      return `
        <tr>
          <td>${image}</td>
          <td>
            <strong>${esc(p.name)}</strong>
            <div class="muted small">${esc(p.brand || "بدون برند")}</div>
          </td>
          <td>${money(p.price)}</td>
          <td>${fmt(p.discount)}٪</td>
          <td>${fmt(p.stock)}</td>
          <td><span class="badge ${statusClass}">${status}</span></td>
          <td>
            <div class="table-actions">
              <button type="button" class="btn btn-secondary btn-small"
                data-edit-product="${esc(p.id)}">ویرایش</button>
              <button type="button" class="btn btn-secondary btn-small"
                data-stock-product="${esc(p.id)}">موجودی</button>
              <button type="button" class="btn btn-secondary btn-small"
                data-toggle-product="${esc(p.id)}">
                ${p.active ? "پنهان‌کردن" : "نمایش"}
              </button>
              <button type="button" class="btn btn-danger btn-small"
                data-delete-product="${esc(p.id)}">حذف</button>
            </div>
          </td>
        </tr>
      `;
    }).join("") || emptyRow(7, "محصولی پیدا نشد.");
  }

  function renderDashboard() {
    $("stat-products").textContent = fmt(products.length);

    $("stat-orders").textContent = "—";
    $("stat-sales").textContent = "—";

    $("stat-low").textContent = fmt(
      products.filter((p) => p.active && p.stock <= 5).length
    );

    $("recent-orders").innerHTML =
      emptyRow(5, "اتصال سفارش‌ها هنوز پیاده‌سازی نشده است.");

    const low = products.filter((p) => p.active && p.stock <= 5);

    $("attention").textContent = low.length
      ? "محصولات با موجودی کم: " +
        low.map((p) => `${p.name} (${fmt(p.stock)})`).join("، ")
      : "محصول فعالی با موجودی ۵ عدد یا کمتر وجود ندارد.";
  }

  async function loadProducts() {
    if (!authorized || loading) return;

    loading = true;
    clearNote();

    const buttons = document.querySelectorAll("[data-refresh]");
    buttons.forEach((button) => {
      button.disabled = true;
    });

    $("products-table").innerHTML =
      emptyRow(7, "در حال دریافت محصولات...");

    try {
      const result = await api("products");

      if (!result || !Array.isArray(result.rows)) {
        throw new Error(
          "پاسخ API با قالب مورد انتظار مطابقت ندارد."
        );
      }

      products = result.rows.map(normalizeProduct);

      renderProducts();
      renderDashboard();
    } catch (error) {
      $("products-table").innerHTML =
        emptyRow(7, "دریافت محصولات ناموفق بود.");

      note(error.message || "خطا در دریافت محصولات.");
    } finally {
      loading = false;

      buttons.forEach((button) => {
        button.disabled = false;
      });
    }
  }

  async function saveProduct(event) {
    event.preventDefault();

    const button = $("save-product");
    button.disabled = true;

    try {
      const id = $("product-id").value.trim();
      const data = productPayload();

      if (id) {
        await api(
          "products/" + encodeURIComponent(id),
          "PATCH",
          data
        );

        note("محصول ویرایش شد.", "ok");
      } else {
        await api("products", "POST", data);

        note("محصول به دیتابیس ارسال شد.", "ok");
      }

      resetProduct();
      await loadProducts();
    } catch (error) {
      note(error.message || "ذخیره محصول ناموفق بود.");
    } finally {
      button.disabled = false;
    }
  }

  async function editProduct(id) {
    const product = products.find((p) => p.id === id);

    if (!product) {
      throw new Error("محصول موردنظر پیدا نشد.");
    }

    fillProduct(product);
  }

  async function changeStock(id) {
    const product = products.find((p) => p.id === id);

    if (!product) {
      throw new Error("محصول موردنظر پیدا نشد.");
    }

    const answer = prompt(
      `موجودی جدید «${product.name}» را وارد کن:`,
      String(product.stock)
    );

    if (answer === null) return;

    const stock = Number(answer);

    if (!Number.isInteger(stock) || stock < 0) {
      throw new Error("موجودی باید عدد صحیح و غیرمنفی باشد.");
    }

    await api(
      "products/" + encodeURIComponent(id),
      "PATCH",
      { stock }
    );

    await loadProducts();
    note("موجودی محصول به‌روزرسانی شد.", "ok");
  }

  async function toggleProduct(id) {
    const product = products.find((p) => p.id === id);

    if (!product) {
      throw new Error("محصول موردنظر پیدا نشد.");
    }

    await api(
      "products/" + encodeURIComponent(id),
      "PATCH",
      { isActive: !product.active }
    );

    await loadProducts();
    note("وضعیت محصول تغییر کرد.", "ok");
  }

  async function deleteProduct(id) {
    const product = products.find((p) => p.id === id);

    if (!product) {
      throw new Error("محصول موردنظر پیدا نشد.");
    }

    if (!confirm(`محصول «${product.name}» حذف شود؟`)) {
      return;
    }

    await api(
      "products/" + encodeURIComponent(id),
      "DELETE"
    );

    await loadProducts();
    note("درخواست حذف محصول انجام شد.", "ok");
  }

  function bindEvents() {
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", () => {
        go(button.dataset.view);
      });
    });

    document.querySelectorAll("[data-jump]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.dataset.jump;

        if (target === "product-form") {
          go("products");
          $("product-form-card").scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        } else {
          go(target);
        }
      });
    });

    document.querySelectorAll("[data-refresh]").forEach((button) => {
      button.addEventListener("click", loadProducts);
    });

    $("check-access").addEventListener("click", async () => {
      try {
        if (await ensureAdmin()) {
          await loadProducts();
        }
      } catch (error) {
        note(error.message || "بررسی دسترسی ناموفق بود.");
      }
    });

    $("logout-top").addEventListener("click", async () => {
      try {
        if (typeof A?.logout === "function") {
          await A.logout();
        } else if (A?.account?.deleteSession) {
          await A.account.deleteSession("current");
        } else {
          throw new Error(
            "تابع خروج در appwrite-client.js پیدا نشد."
          );
        }

        location.href = "account.html";
      } catch (error) {
        note(error.message || "خروج از حساب ناموفق بود.");
      }
    });

    $("product-form").addEventListener("submit", saveProduct);

    $("reset-product").addEventListener("click", () => {
      resetProduct();
    });

    $("product-search").addEventListener("input", renderProducts);

    $("products-table").addEventListener("click", async (event) => {
      const edit = event.target.closest("[data-edit-product]");
      const stock = event.target.closest("[data-stock-product]");
      const toggle = event.target.closest("[data-toggle-product]");
      const del = event.target.closest("[data-delete-product]");

      try {
        if (edit) {
          await editProduct(edit.dataset.editProduct);
        } else if (stock) {
          await changeStock(stock.dataset.stockProduct);
        } else if (toggle) {
          await toggleProduct(toggle.dataset.toggleProduct);
        } else if (del) {
          await deleteProduct(del.dataset.deleteProduct);
        }
      } catch (error) {
        note(error.message || "عملیات محصول ناموفق بود.");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (!$("admin-app")) return;

    if (!A) {
      note("فایل appwrite-client.js بارگذاری نشده است.");
      return;
    }

    bindEvents();

    try {
      if (await ensureAdmin()) {
        go("dashboard");
        await loadProducts();
      }
    } catch (error) {
      authorized = false;
      $("admin-app").hidden = true;
      $("admin-login-needed").hidden = false;

      note(
        error.message ||
        "راه‌اندازی پنل مدیریت ناموفق بود."
      );
    }
  });
})();
