/**
 * Veloraa Shop — Admin Panel
 * File: assets/js/admin.js
 *
 * Backend: Appwrite Function
 * Product API: /products and /products/:id
 */
(function () {
  "use strict";

  const A = window.VeloraaAppwrite;
  const $ = (id) => document.getElementById(id);

  let products = [];
  let authorized = false;
  let busy = false;

  const implementedViews = new Set(["dashboard", "products"]);

  const fmt = (value) =>
    new Intl.NumberFormat("fa-IR", {
      maximumFractionDigits: 0
    }).format(Number(value) || 0);

  const money = (value) => `${fmt(value)} تومان`;

  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  function notify(message, success = false) {
    const el = $("admin-message");

    if (!el) {
      console[success ? "info" : "error"](message);
      return;
    }

    el.textContent = message;
    el.className = "notice " + (success ? "ok" : "bad");
    el.hidden = false;
  }

  function clearNotice() {
    const el = $("admin-message");
    if (el) el.hidden = true;
  }

  function show(el, visible) {
    if (el) el.hidden = !visible;
  }

  function emptyRow(columns, message) {
    return `
      <tr>
        <td colspan="${columns}" class="empty">
          ${esc(message)}
        </td>
      </tr>
    `;
  }

  function productId(item) {
    return String(item?.$id ?? item?.id ?? "");
  }

  function normalizeProduct(item) {
    const price = Number(
      item.price ?? item.originalPrice ?? item.oldPrice ?? 0
    );

    const discount = Number(
      item.discount_percent ?? item.discount ?? 0
    );

    const stock = Number(
      item.stock_quantity ?? item.stock ?? 0
    );

    return {
      ...item,
      id: productId(item),
      name: item.name ?? "",
      brand: item.brand ?? "",
      category: item.category ?? "other",
      price,
      discount,
      stock,
      variant: item.variant ?? "",
      image: item.image_url ?? item.image ?? "",
      description: item.description ?? "",
      active: item.is_active ?? item.isActive ?? true,
      salePrice: Number(
        item.sale_price ?? Math.round(price * (1 - discount / 100))
      )
    };
  }

  function apiBase() {
    const value = A?.config?.adminApiUrl;

    if (!value) {
      throw new Error(
        "آدرس Admin API تنظیم نشده است. فایل appwrite-client.js را بررسی کن."
      );
    }

    return value.endsWith("/") ? value : value + "/";
  }

  async function api(path = "", method = "GET", body) {
    if (typeof A?.adminRequest !== "function") {
      throw new Error(
        "تابع adminRequest پیدا نشد. فایل appwrite-client.js را بررسی کن."
      );
    }

    const url = apiBase() + String(path).replace(/^\/+/, "");
    const options = { url, method };

    if (body !== undefined) {
      options.body = body;
    }

    const result = await A.adminRequest(options);

    if (result?.success === false) {
      throw new Error(
        result.message || result.error || "درخواست توسط سرور رد شد."
      );
    }

    return result;
  }

  async function getCurrentUser() {
    if (typeof A?.getCurrentUser === "function") {
      return await A.getCurrentUser();
    }

    if (typeof A?.account?.get === "function") {
      return await A.account.get();
    }

    throw new Error(
      "تابع دریافت کاربر در appwrite-client.js موجود نیست."
    );
  }

  async function checkAdmin() {
    const user = await getCurrentUser();

    if (!user) return false;

    // مجوز باید در سمت سرور تأیید شود.
    const result = await api("");

    return result?.success === true &&
           result?.isAdmin === true;
  }

  function go(view) {
    const allowed = [
      "dashboard",
      "products",
      "orders",
      "categories",
      "coupons",
      "customers"
    ];

    if (!allowed.includes(view)) view = "dashboard";

    document.querySelectorAll("[data-view]").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.view === view
      );
    });

    document.querySelectorAll("[data-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== view;
    });

    clearNotice();

    if (!implementedViews.has(view)) {
      notify(
        "این بخش هنوز در API پیاده‌سازی نشده است؛ " +
        "ابتدا باید مسیر سرور مربوط به آن ساخته شود."
      );
    }
  }

  function getProductPayload() {
    const name = $("p-name")?.value.trim() ?? "";
    const brand = $("p-brand")?.value.trim() ?? "";
    const category = $("p-category")?.value.trim() || "other";
    const price = Number($("p-price")?.value);
    const discount = Number($("p-discount")?.value || 0);
    const stock = Number($("p-stock")?.value || 0);
    const variant = $("p-variant")?.value.trim() ?? "";
    const imageUrl = $("p-image-url")?.value.trim() ?? "";
    const description = $("p-description")?.value.trim() ?? "";
    const isActive = Boolean($("p-active")?.checked);

    if (!name) {
      throw new Error("نام محصول را وارد کن.");
    }

    if (!Number.isFinite(price) || price < 0) {
      throw new Error("قیمت باید عدد معتبر و غیرمنفی باشد.");
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

    if (imageUrl) {
      let parsed;

      try {
        parsed = new URL(imageUrl);
      } catch {
        throw new Error("آدرس تصویر معتبر نیست.");
      }

      if (!["https:", "http:"].includes(parsed.protocol)) {
        throw new Error("آدرس تصویر باید با http یا https شروع شود.");
      }
    }

    if ($("p-image-file")?.files?.length) {
      throw new Error(
        "آپلود مستقیم تصویر هنوز به Appwrite Storage متصل نشده است. " +
        "فعلاً آدرس تصویر را در فیلد مربوط وارد کن."
      );
    }

    // نام فیلدها مطابق قرارداد API محصولات است.
    return {
      name,
      brand,
      category,
      price,
      discount_percent: discount,
      sale_price: Math.round(price * (1 - discount / 100)),
      stock_quantity: stock,
      variant,
      image_url: imageUrl,
      description,
      is_active: isActive
    };
  }

  function resetProduct() {
    $("product-form")?.reset();

    if ($("product-id")) $("product-id").value = "";

    if ($("product-form-title")) {
      $("product-form-title").textContent = "افزودن محصول";
    }

    if ($("p-discount")) $("p-discount").value = "0";
    if ($("p-stock")) $("p-stock").value = "0";
    if ($("p-active")) $("p-active").checked = true;
    if ($("p-image-file")) $("p-image-file").value = "";
  }

  function editProduct(id) {
    const p = products.find((item) => item.id === id);

    if (!p) {
      throw new Error("محصول موردنظر پیدا نشد.");
    }

    $("product-id").value = p.id;
    $("product-form-title").textContent = "ویرایش محصول";
    $("p-name").value = p.name;
    $("p-brand").value = p.brand;
    $("p-category").value = p.category;
    $("p-price").value = p.price;
    $("p-discount").value = p.discount;
    $("p-stock").value = p.stock;
    $("p-variant").value = p.variant;
    $("p-image-url").value = p.image;
    $("p-description").value = p.description;
    $("p-active").checked = Boolean(p.active);

    go("products");

    $("product-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function renderProducts() {
    const table = $("products-table");
    if (!table) return;

    const search = ($("product-search")?.value || "")
      .trim()
      .toLocaleLowerCase();

    const filtered = products.filter((p) =>
      `${p.name} ${p.brand} ${p.category}`
        .toLocaleLowerCase()
        .includes(search)
    );

    if ($("product-count")) {
      $("product-count").textContent =
        `${fmt(filtered.length)} محصول`;
    }

    table.innerHTML = filtered.map((p) => {
      const status = !p.active
        ? "پنهان"
        : p.stock <= 0
          ? "ناموجود"
          : "فعال";

      const image = p.image
        ? `<img src="${esc(p.image)}"
                alt="${esc(p.name)}"
                loading="lazy"
                style="width:46px;height:46px;object-fit:cover;border-radius:9px"
                onerror="this.style.display='none'">`
        : "—";

      return `
        <tr>
          <td>${image}</td>
          <td>
            <strong>${esc(p.name)}</strong>
            <div>${esc(p.brand)}</div>
          </td>
          <td>${esc(p.category)}</td>
          <td>${money(p.price)}</td>
          <td>${fmt(p.discount)}٪</td>
          <td>${fmt(p.stock)}</td>
          <td>${status}</td>
          <td>
            <button type="button"
              data-edit-product="${esc(p.id)}">ویرایش</button>

            <button type="button"
              data-stock-product="${esc(p.id)}">موجودی</button>

            <button type="button"
              data-toggle-product="${esc(p.id)}">
              ${p.active ? "پنهان‌کردن" : "نمایش"}
            </button>

            <button type="button"
              data-delete-product="${esc(p.id)}">حذف</button>
          </td>
        </tr>
      `;
    }).join("") || emptyRow(8, "محصولی پیدا نشد.");
  }

  function renderDashboard() {
    if ($("stat-products")) {
      $("stat-products").textContent = fmt(products.length);
    }

    if ($("stat-low")) {
      $("stat-low").textContent = fmt(
        products.filter((p) => p.active && p.stock <= 5).length
      );
    }

    if ($("stat-orders")) $("stat-orders").textContent = "—";
    if ($("stat-sales")) $("stat-sales").textContent = "—";

    if ($("recent-orders")) {
      $("recent-orders").innerHTML =
        emptyRow(5, "اطلاعات سفارش‌ها هنوز به API متصل نشده است.");
    }

    if ($("attention")) {
      const low = products.filter((p) => p.active && p.stock <= 5);

      $("attention").textContent = low.length
        ? "موجودی کم: " + low.map(
            (p) => `${p.name} (${fmt(p.stock)})`
          ).join("، ")
        : "محصول فعالی با موجودی ۵ عدد یا کمتر وجود ندارد.";
    }
  }

  async function loadProducts() {
    if (!authorized || busy) return;

    busy = true;
    clearNotice();

    const refreshButtons = document.querySelectorAll("[data-refresh]");
    refreshButtons.forEach((button) => {
      button.disabled = true;
    });

    if ($("products-table")) {
      $("products-table").innerHTML =
        emptyRow(8, "در حال دریافت محصولات...");
    }

    try {
      const result = await api("products", "GET");

      if (!Array.isArray(result?.rows)) {
        throw new Error(
          "ساختار پاسخ API درست نیست؛ انتظار فهرست rows را داشتیم."
        );
      }

      products = result.rows.map(normalizeProduct);

      renderProducts();
      renderDashboard();
    } catch (error) {
      console.error("[Veloraa Admin] Load products:", error);

      if ($("products-table")) {
        $("products-table").innerHTML =
          emptyRow(8, "دریافت محصولات ناموفق بود.");
      }

      notify(error.message || "خطا در دریافت محصولات.");
    } finally {
      busy = false;
      refreshButtons.forEach((button) => {
        button.disabled = false;
      });
    }
  }

  async function saveProduct(event) {
    event.preventDefault();

    const button = $("save-product");
    if (button) button.disabled = true;

    try {
      const id = $("product-id")?.value.trim() || "";
      const payload = getProductPayload();

      if (id) {
        await api(
          "products/" + encodeURIComponent(id),
          "PATCH",
          payload
        );

        notify("درخواست ویرایش محصول با موفقیت انجام شد.", true);
      } else {
        await api("products", "POST", payload);
        notify("درخواست افزودن محصول با موفقیت انجام شد.", true);
      }

      resetProduct();
      await loadProducts();
    } catch (error) {
      console.error("[Veloraa Admin] Save product:", error);
      notify(error.message || "ذخیره محصول ناموفق بود.");
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function changeStock(id) {
    const p = products.find((item) => item.id === id);

    if (!p) {
      throw new Error("محصول موردنظر پیدا نشد.");
    }

    const answer = prompt(
      `موجودی جدید محصول «${p.name}» را وارد کن:`,
      String(p.stock)
    );

    if (answer === null) return;

    const stock = Number(answer);

    if (!Number.isInteger(stock) || stock < 0) {
      throw new Error("موجودی باید عدد صحیح و غیرمنفی باشد.");
    }

    await api(
      "products/" + encodeURIComponent(id),
      "PATCH",
      { stock_quantity: stock }
    );

    await loadProducts();
    notify("موجودی محصول به‌روزرسانی شد.", true);
  }

  async function toggleProduct(id) {
    const p = products.find((item) => item.id === id);

    if (!p) {
      throw new Error("محصول موردنظر پیدا نشد.");
    }

    await api(
      "products/" + encodeURIComponent(id),
      "PATCH",
      { is_active: !p.active }
    );

    await loadProducts();
    notify("وضعیت نمایش محصول تغییر کرد.", true);
  }

  async function deleteProduct(id) {
    const p = products.find((item) => item.id === id);

    if (!p) {
      throw new Error("محصول موردنظر پیدا نشد.");
    }

    if (!confirm(`آیا محصول «${p.name}» حذف شود؟`)) {
      return;
    }

    await api(
      "products/" + encodeURIComponent(id),
      "DELETE"
    );

    await loadProducts();
    notify("محصول حذف شد.", true);
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
          $("product-form")?.scrollIntoView({
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

    $("check-access")?.addEventListener("click", async () => {
      try {
        authorized = await checkAdmin();

        if (!authorized) {
          throw new Error(
            "این حساب دسترسی مدیر ندارد یا API نتوانسته آن را تأیید کند."
          );
        }

        show($("admin-login-needed"), false);
        show($("admin-app"), true);

        await loadProducts();
      } catch (error) {
        console.error("[Veloraa Admin] Access:", error);
        notify(error.message || "بررسی دسترسی ناموفق بود.");
      }
    });

    $("logout-top")?.addEventListener("click", async () => {
      try {
        if (typeof A?.logout === "function") {
          await A.logout();
        } else if (A?.account?.deleteSession) {
          await A.account.deleteSession({
            sessionId: "current"
          });
        } else {
          throw new Error("تابع خروج در appwrite-client.js موجود نیست.");
        }

        location.href = "account.html";
      } catch (error) {
        console.error("[Veloraa Admin] Logout:", error);
        notify(error.message || "خروج ناموفق بود.");
      }
    });

    $("product-form")?.addEventListener("submit", saveProduct);
    $("reset-product")?.addEventListener("click", resetProduct);
    $("product-search")?.addEventListener("input", renderProducts);

    $("products-table")?.addEventListener("click", async (event) => {
      const edit = event.target.closest("[data-edit-product]");
      const stock = event.target.closest("[data-stock-product]");
      const toggle = event.target.closest("[data-toggle-product]");
      const del = event.target.closest("[data-delete-product]");

      try {
        if (edit) {
          editProduct(edit.dataset.editProduct);
        } else if (stock) {
          await changeStock(stock.dataset.stockProduct);
        } else if (toggle) {
          await toggleProduct(toggle.dataset.toggleProduct);
        } else if (del) {
          await deleteProduct(del.dataset.deleteProduct);
        }
      } catch (error) {
        console.error("[Veloraa Admin] Product action:", error);
        notify(error.message || "عملیات محصول ناموفق بود.");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (!$("admin-app")) return;

    if (!A) {
      notify("فایل appwrite-client.js بارگذاری نشده است.");
      return;
    }

    bindEvents();

    show($("admin-app"), false);
    show($("admin-login-needed"), true);

    try {
      authorized = await checkAdmin();

      if (!authorized) {
        notify(
          "برای ورود به پنل باید با حساب مدیر وارد شوی."
        );
        return;
      }

      show($("admin-login-needed"), false);
      show($("admin-app"), true);

      go("dashboard");
      await loadProducts();
    } catch (error) {
      console.error("[Veloraa Admin] Initialization:", error);
      notify(error.message || "راه‌اندازی پنل ناموفق بود.");
    }
  });
})();
