/* =========================================================
   VELORAA SHOP - COMPLETE ADMIN PANEL
   Appwrite Backend Integration
   ========================================================= */

(() => {
  "use strict";

  const A = window.VeloraaAppwrite;

  const state = {
    products: [],
    categories: [],
    coupons: [],
    customers: [],
    orders: [],
    currentOrder: null
  };

  const $ = (id) => document.getElementById(id);

  const money = (value) =>
    new Intl.NumberFormat("fa-IR").format(Number(value || 0)) + " تومان";

  const number = (value) =>
    new Intl.NumberFormat("fa-IR").format(Number(value || 0));

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);

  const notify = (message, type = "ok") => {
    const box = $("admin-message");

    if (!box) {
      alert(message);
      return;
    }

    box.textContent = message;
    box.className = `notice ${type}`;
    box.hidden = false;

    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => {
      box.hidden = true;
    }, 4500);
  };

  /* =========================================================
     API
     ========================================================= */

  const API_BASE = String(A?.config?.adminApiUrl || "")
    .replace(/\/+$/, "");

  const api = async (path, method = "GET", body = undefined) => {
    if (!A?.adminRequest) {
      throw new Error("اتصال Appwrite در دسترس نیست.");
    }

    if (!API_BASE) {
      throw new Error("آدرس Admin API در appwrite-client.js تنظیم نشده است.");
    }

    const url = /^https?:\/\//i.test(path)
      ? path
      : `${API_BASE}/${String(path).replace(/^\/+/, "")}`;

    const result = await A.adminRequest({
      url,
      method,
      body
    });

    if (result?.success === false) {
      throw new Error(result.message || result.error || "درخواست ناموفق بود.");
    }

    return result;
  };

  const setBusy = (element, busy, text = "در حال ذخیره...") => {
    if (!element) return;

    if (busy) {
      if (!element.dataset.originalText) {
        element.dataset.originalText = element.textContent;
      }

      element.disabled = true;
      element.textContent = text;
    } else {
      element.disabled = false;
      element.textContent =
        element.dataset.originalText || element.textContent;

      delete element.dataset.originalText;
    }
  };

  const emptyRow = (columns, message = "موردی یافت نشد.") =>
    `<tr><td colspan="${columns}" class="empty-state">${escapeHTML(message)}</td></tr>`;

  const getList = (result, key) =>
    Array.isArray(result?.[key])
      ? result[key]
      : Array.isArray(result?.data)
        ? result.data
        : [];

  const parseDetails = (product) => {
    const value = product?.details_json ?? product?.detailsJson ?? product?.details;
    if (value && typeof value === "object") return value;
    if (typeof value === "string" && value.trim()) {
      try { return JSON.parse(value); } catch (error) {
        console.warn("Invalid product details_json", error);
      }
    }
    return {};
  };

  const linesToText = (value) =>
    Array.isArray(value) ? value.join("\n") : String(value || "");

  const textToLines = (value) =>
    String(value || "").split(/\r?\n/).map(line => line.trim()).filter(Boolean);

  const parseSpecifications = (value) =>
    String(value || "").split(/\r?\n/).map(line => {
      const index = line.indexOf(":");
      if (index < 1) return null;
      const label = line.slice(0, index).trim();
      const content = line.slice(index + 1).trim();
      return label && content ? { label, value: content } : null;
    }).filter(Boolean);

  /* =========================================================
     NAVIGATION
     ========================================================= */

  const go = (section) => {
    const panels = document.querySelectorAll(
      "[data-admin-section], [data-panel]"
    );

    panels.forEach((item) => {
      const name =
        item.dataset.adminSection ||
        item.dataset.panel;

      item.hidden = name !== section;
    });

    document.querySelectorAll(
      "[data-admin-nav], [data-view]"
    ).forEach((item) => {
      const name =
        item.dataset.adminNav ||
        item.dataset.view;

      item.classList.toggle("active", name === section);
    });

    const titles = {
      dashboard: "داشبورد مدیریت",
      products: "مدیریت محصولات",
      orders: "مدیریت سفارش‌ها",
      categories: "مدیریت دسته‌بندی‌ها",
      coupons: "کدهای تخفیف",
      customers: "مدیریت مشتریان"
    };

    const title = $("admin-page-title");

    if (title) {
      title.textContent = titles[section] || section;
    }

    if (section === "dashboard") loadDashboard();
    if (section === "products") loadProducts();
    if (section === "categories") loadCategories();
    if (section === "coupons") loadCoupons();
    if (section === "customers") loadCustomers();
    if (section === "orders") loadOrders();
  };

  const refreshCurrentSection = () => {
    const active = document.querySelector(
      "[data-view].active, [data-admin-nav].active"
    );

    const section =
      active?.dataset.view ||
      active?.dataset.adminNav ||
      "dashboard";

    go(section);
  };

  const jumpTo = (target) => {
    const sectionNames = [
      "dashboard",
      "products",
      "orders",
      "categories",
      "coupons",
      "customers"
    ];

    if (sectionNames.includes(target)) {
      go(target);
      return;
    }

    const element = $(target);

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  };

  /* =========================================================
     AUTHENTICATION
     ========================================================= */

  async function checkAdmin() {
    const loginNeeded = $("admin-login-needed");
    const adminApp = $("admin-app");

    try {
      if (!A?.getCurrentUser) {
        throw new Error("سرویس Appwrite بارگذاری نشده است.");
      }

      const user = await A.getCurrentUser();

      if (!user) {
        if (loginNeeded) loginNeeded.hidden = false;
        if (adminApp) adminApp.hidden = true;
        return false;
      }

      const result = await api("/admin-check");

      if (result?.isAdmin !== true) {
        throw new Error("این حساب مجوز مدیریت فروشگاه را ندارد.");
      }

      if (loginNeeded) loginNeeded.hidden = true;
      if (adminApp) adminApp.hidden = false;

      const adminName = $("admin-name");

      if (adminName) {
        adminName.textContent =
          user.name || user.email || "مدیر";
      }

      return true;

    } catch (error) {
      console.error("Admin authentication:", error);

      if (loginNeeded) loginNeeded.hidden = false;
      if (adminApp) adminApp.hidden = true;

      notify(
        error.message || "بررسی دسترسی مدیر ناموفق بود.",
        "error"
      );

      return false;
    }
  }

  async function logout() {
    try {
      await A.account.deleteSession("current");
      location.href = "account.html";
    } catch (error) {
      console.error(error);
      notify("خروج از حساب انجام نشد.", "error");
    }
  }

  /* =========================================================
     PRODUCTS
     ========================================================= */

  async function loadProducts() {
    const table = $("products-table");

    if (table) {
      table.innerHTML = emptyRow(8, "در حال دریافت محصولات...");
    }

    try {
      const result = await api("/products");

      state.products = getList(result, "products");

      renderProducts();
      updateProductCount();

    } catch (error) {
      console.error("Products:", error);

      if (table) {
        table.innerHTML = emptyRow(8, "خطا در دریافت محصولات.");
      }

      notify(error.message || "دریافت محصولات ناموفق بود.", "error");
    }
  }

  function updateProductCount() {
    const count = $("product-count");

    if (count) {
      count.textContent =
        `${number(state.products.length)} محصول`;
    }
  }

  function renderProducts() {
    const table = $("products-table");
    if (!table) return;

    const search = ($("product-search")?.value || "")
      .trim()
      .toLowerCase();

    const products = state.products.filter((product) => {
      const text = [
        product.name,
        product.brand,
        product.category
      ].join(" ").toLowerCase();

      return text.includes(search);
    });

    if (!products.length) {
      table.innerHTML = emptyRow(8);
      return;
    }

    table.innerHTML = products.map((product) => {
      const id = escapeHTML(product.$id);
      const active = product.is_active !== false;

      const price = Number(product.price || 0);
      const salePrice = Number(
        product.sale_price || price
      );

      const discount = Number(
        product.discount_percent || 0
      );

      return `
        <tr>
          <td>
            ${
              product.image_url
                ? `<img
                    src="${escapeHTML(product.image_url)}"
                    alt=""
                    width="48"
                    height="48"
                    style="object-fit:cover;border-radius:8px"
                  >`
                : "—"
            }
          </td>

          <td>
            ${escapeHTML(product.name || "—")}
            <small class="muted">
              ${escapeHTML(product.brand || "")}
            </small>
          </td>

          <td>${escapeHTML(product.category || "—")}</td>

          <td>${money(price)}</td>

          <td>
            ${discount > 0
              ? `${number(discount)}٪ · ${money(salePrice)}`
              : "بدون تخفیف"
            }
          </td>

          <td>${number(product.stock_quantity || 0)}</td>

          <td>
            <span class="badge ${active ? "success" : "danger"}">
              ${active ? "فعال" : "غیرفعال"}
            </span>
          </td>

          <td>
            <div class="table-actions">
              <button
                type="button"
                class="btn btn-secondary btn-small"
                data-action="edit-product"
                data-id="${id}"
              >ویرایش</button>

              <button
                type="button"
                class="btn btn-danger btn-small"
                data-action="delete-product"
                data-id="${id}"
              >حذف</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function resetProductForm() {
    $("product-form")?.reset();

    if ($("product-id")) $("product-id").value = "";
    if ($("p-active")) $("p-active").checked = true;

    const title = $("product-form-title");

    if (title) {
      title.textContent = "افزودن محصول";
    }

    const preview = $("image-preview");

    if (preview) {
      preview.innerHTML = "";
    }
  }

  function editProduct(id) {
    const product = state.products.find(
      (item) => item.$id === id
    );

    if (!product) return;

    $("product-id").value = product.$id;
    $("p-name").value = product.name || "";
    $("p-brand").value = product.brand || "";
    $("p-category").value = product.category || "";
    $("p-price").value = product.price || 0;
    $("p-discount").value = product.discount_percent || 0;
    $("p-stock").value = product.stock_quantity || 0;
    $("p-variant").value = product.variant || "";
    $("p-image-url").value = product.image_url || "";
    $("p-description").value = product.description || "";

    const details = parseDetails(product);
    const specs = Array.isArray(details.specifications)
      ? details.specifications.map(item =>
          typeof item === "string" ? item : `${item.label || item.name || ""}: ${item.value || ""}`
        )
      : [];
    $("p-specifications").value = specs.join("\n");
    $("p-highlights").value = linesToText(details.highlights);
    $("p-usage").value = linesToText(details.usage);
    $("p-ingredients").value = linesToText(details.ingredients);
    $("p-gallery").value = linesToText(details.gallery);
    $("p-badges").value = linesToText(details.badges);

    if ($("p-active")) {
      $("p-active").checked = product.is_active !== false;
    }

    const title = $("product-form-title");

    if (title) {
      title.textContent = "ویرایش محصول";
    }

    const preview = $("image-preview");

    if (preview) {
      preview.innerHTML = product.image_url
        ? `<img src="${escapeHTML(product.image_url)}"
             alt=""
             style="max-width:120px;border-radius:10px">`
        : "";
    }

    $("product-form-card")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  async function uploadProductImage(file) {
    if (!file) {
      return $("p-image-url")?.value.trim() || "";
    }

    if (!file.type.startsWith("image/")) {
      throw new Error("فایل انتخاب‌شده تصویر نیست.");
    }

    const maxSize = 8 * 1024 * 1024;

    if (file.size > maxSize) {
      throw new Error("حجم تصویر نباید بیشتر از ۸ مگابایت باشد.");
    }

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(
        new Error("خواندن تصویر ناموفق بود.")
      );

      reader.readAsDataURL(file);
    });

    const result = await api("/upload-image", "POST", {
      name: file.name,
      type: file.type,
      size: file.size,
      data: base64
    });

    return result.url || result.image_url || "";
  }

  async function saveProduct(event) {
    event.preventDefault();

    const button = $("save-product");
    setBusy(button, true);

    try {
      const id = $("product-id")?.value;

      const price = Number($("p-price")?.value || 0);

      const discount = Math.max(
        0,
        Math.min(100, Number($("p-discount")?.value || 0))
      );

      const stock = Number($("p-stock")?.value || 0);

      if (!Number.isFinite(price) || price < 0) {
        throw new Error("قیمت محصول معتبر نیست.");
      }

      if (!Number.isFinite(stock) || stock < 0) {
        throw new Error("موجودی محصول معتبر نیست.");
      }

      const file = $("p-image-file")?.files?.[0];
      const imageURL = await uploadProductImage(file);

      const payload = {
        name: $("p-name")?.value.trim(),
        brand: $("p-brand")?.value.trim(),
        category: $("p-category")?.value.trim(),
        price,
        sale_price: Math.round(
          price * (100 - discount) / 100
        ),
        discount_percent: discount,
        stock_quantity: stock,
        variant: $("p-variant")?.value.trim(),
        image_url: imageURL,
        description: $("p-description")?.value.trim(),
        details_json: JSON.stringify({
          specifications: parseSpecifications($("p-specifications")?.value),
          highlights: textToLines($("p-highlights")?.value),
          usage: textToLines($("p-usage")?.value),
          ingredients: textToLines($("p-ingredients")?.value),
          gallery: textToLines($("p-gallery")?.value),
          badges: textToLines($("p-badges")?.value)
        }),
        is_active: $("p-active")?.checked ?? true
      };

      if (!payload.name) {
        throw new Error("نام محصول را وارد کن.");
      }

      if (!payload.category) {
        throw new Error("دسته‌بندی محصول را وارد کن.");
      }

      if (id) {
        await api(
          `/products/${encodeURIComponent(id)}`,
          "PATCH",
          payload
        );

        notify("محصول با موفقیت ویرایش شد.");
      } else {
        await api("/products", "POST", payload);

        notify("محصول جدید اضافه شد.");
      }

      resetProductForm();
      await loadProducts();

    } catch (error) {
      console.error("Save product:", error);

      notify(
        error.message || "ذخیره محصول ناموفق بود.",
        "error"
      );
    } finally {
      setBusy(button, false);
    }
  }

  async function deleteProduct(id) {
    const product = state.products.find(
      (item) => item.$id === id
    );

    if (!confirm(
      `محصول «${product?.name || ""}» حذف شود؟`
    )) {
      return;
    }

    try {
      await api(
        `/products/${encodeURIComponent(id)}`,
        "DELETE"
      );

      notify("محصول حذف شد.");
      await loadProducts();

    } catch (error) {
      notify(error.message || "حذف محصول ناموفق بود.", "error");
    }
  }

  /* =========================================================
     CATEGORIES
     ========================================================= */

  async function loadCategories() {
    const table = $("categories-table");

    if (table) {
      table.innerHTML = emptyRow(3, "در حال دریافت دسته‌بندی‌ها...");
    }

    try {
      const result = await api("/categories");

      state.categories = getList(result, "categories");

      renderCategories();

    } catch (error) {
      console.error("Categories:", error);

      if (table) {
        table.innerHTML = emptyRow(3, "خطا در دریافت دسته‌بندی‌ها.");
      }

      notify(error.message || "دریافت دسته‌بندی‌ها ناموفق بود.", "error");
    }
  }

  function renderCategories() {
    const table = $("categories-table");
    if (!table) return;

    if (!state.categories.length) {
      table.innerHTML = emptyRow(3);
      return;
    }

    table.innerHTML = state.categories.map((category) => `
      <tr>
        <td>${escapeHTML(category.name)}</td>
        <td>${escapeHTML(category.slug || "—")}</td>
        <td>
          <div class="table-actions">
            <button
              type="button"
              class="btn btn-secondary btn-small"
              data-action="edit-category"
              data-id="${escapeHTML(category.$id)}"
            >ویرایش</button>

            <button
              type="button"
              class="btn btn-danger btn-small"
              data-action="delete-category"
              data-id="${escapeHTML(category.$id)}"
            >حذف</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  function resetCategoryForm() {
    $("category-form")?.reset();

    if ($("category-id")) {
      $("category-id").value = "";
    }
  }

  function editCategory(id) {
    const item = state.categories.find(
      (category) => category.$id === id
    );

    if (!item) return;

    $("category-id").value = item.$id;
    $("category-name").value = item.name || "";
    $("category-slug").value = item.slug || "";

    $("category-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  async function saveCategory(event) {
    event.preventDefault();

    const button = event.submitter;
    setBusy(button, true);

    try {
      const id = $("category-id")?.value;

      const name = $("category-name")?.value.trim();

      const slugInput = $("category-slug")?.value.trim();

      const slug = slugInput || name
        .toLowerCase()
        .replace(/\s+/g, "-");

      if (!name) {
        throw new Error("نام دسته‌بندی الزامی است.");
      }

      const payload = {
        name,
        slug
      };

      if (id) {
        await api(
          `/categories/${encodeURIComponent(id)}`,
          "PATCH",
          payload
        );

        notify("دسته‌بندی ویرایش شد.");
      } else {
        await api("/categories", "POST", payload);

        notify("دسته‌بندی جدید ایجاد شد.");
      }

      resetCategoryForm();
      await loadCategories();

    } catch (error) {
      notify(error.message || "ذخیره دسته‌بندی ناموفق بود.", "error");
    } finally {
      setBusy(button, false);
    }
  }

  async function deleteCategory(id) {
    if (!confirm("این دسته‌بندی حذف شود؟")) return;

    try {
      await api(
        `/categories/${encodeURIComponent(id)}`,
        "DELETE"
      );

      notify("دسته‌بندی حذف شد.");
      await loadCategories();

    } catch (error) {
      notify(error.message || "حذف دسته‌بندی ناموفق بود.", "error");
    }
  }

  /* =========================================================
     COUPONS
     ========================================================= */

  async function loadCoupons() {
    const table = $("coupons-table");

    if (table) {
      table.innerHTML = emptyRow(5, "در حال دریافت کدهای تخفیف...");
    }

    try {
      const result = await api("/coupons");

      state.coupons = getList(result, "coupons");

      renderCoupons();

    } catch (error) {
      console.error("Coupons:", error);

      if (table) {
        table.innerHTML = emptyRow(5, "خطا در دریافت کدهای تخفیف.");
      }

      notify(error.message || "دریافت کدهای تخفیف ناموفق بود.", "error");
    }
  }

  function renderCoupons() {
    const table = $("coupons-table");
    if (!table) return;

    if (!state.coupons.length) {
      table.innerHTML = emptyRow(5);
      return;
    }

    table.innerHTML = state.coupons.map((coupon) => {
      const type = coupon.type === "percent"
        ? "درصدی"
        : "مبلغ ثابت";

      const value = coupon.type === "percent"
        ? `${number(coupon.value)}٪`
        : money(coupon.value);

      return `
        <tr>
          <td>${escapeHTML(coupon.code)}</td>
          <td>${type}</td>
          <td>${value}</td>
          <td>
            <span class="badge ${coupon.active ? "success" : "danger"}">
              ${coupon.active ? "فعال" : "غیرفعال"}
            </span>
          </td>
          <td>
            <div class="table-actions">
              <button
                type="button"
                class="btn btn-secondary btn-small"
                data-action="edit-coupon"
                data-id="${escapeHTML(coupon.$id)}"
              >ویرایش</button>

              <button
                type="button"
                class="btn btn-danger btn-small"
                data-action="delete-coupon"
                data-id="${escapeHTML(coupon.$id)}"
              >حذف</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function resetCouponForm() {
    $("coupon-form")?.reset();

    if ($("coupon-id")) {
      $("coupon-id").value = "";
    }

    if ($("coupon-active")) {
      $("coupon-active").checked = true;
    }

    const title = $("coupon-form-title");

    if (title) {
      title.textContent = "ساخت کد تخفیف";
    }
  }

  function editCoupon(id) {
    const item = state.coupons.find(
      (coupon) => coupon.$id === id
    );

    if (!item) return;

    $("coupon-id").value = item.$id;
    $("coupon-code").value = item.code || "";
    $("coupon-type").value = item.type || "percent";
    $("coupon-value").value = item.value || 0;
    $("coupon-minimum").value = item.minimum_order || 0;
    $("coupon-max").value = item.maximum_discount || "";
    $("coupon-limit").value = item.usage_limit || "";

    if ($("coupon-start")) {
      $("coupon-start").value = item.start_at
        ? String(item.start_at).slice(0, 10)
        : "";
    }

    if ($("coupon-end")) {
      $("coupon-end").value = item.end_at
        ? String(item.end_at).slice(0, 10)
        : "";
    }

    if ($("coupon-active")) {
      $("coupon-active").checked = item.active !== false;
    }

    const title = $("coupon-form-title");

    if (title) {
      title.textContent = "ویرایش کد تخفیف";
    }

    $("coupon-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  async function saveCoupon(event) {
    event.preventDefault();

    const button = event.submitter;
    setBusy(button, true);

    try {
      const id = $("coupon-id")?.value;

      const existing = id
        ? state.coupons.find((item) => item.$id === id)
        : null;

      const payload = {
        code: $("coupon-code")?.value.trim().toUpperCase(),
        type: $("coupon-type")?.value,
        value: Number($("coupon-value")?.value || 0),
        minimum_order: Number($("coupon-minimum")?.value || 0),
        maximum_discount: Number($("coupon-max")?.value || 0),
        usage_limit: Number($("coupon-limit")?.value || 0),
        used_count: existing?.used_count || 0,
        start_at: $("coupon-start")?.value || null,
        end_at: $("coupon-end")?.value || null,
        active: $("coupon-active")?.checked ?? true
      };

      if (!payload.code || payload.value <= 0) {
        throw new Error("کد تخفیف و مقدار معتبر وارد کن.");
      }

      if (
        payload.type === "percent" &&
        payload.value > 100
      ) {
        throw new Error("درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد.");
      }

      if (id) {
        await api(
          `/coupons/${encodeURIComponent(id)}`,
          "PATCH",
          payload
        );

        notify("کد تخفیف ویرایش شد.");
      } else {
        await api("/coupons", "POST", payload);

        notify("کد تخفیف جدید ایجاد شد.");
      }

      resetCouponForm();
      await loadCoupons();

    } catch (error) {
      notify(error.message || "ذخیره کد تخفیف ناموفق بود.", "error");
    } finally {
      setBusy(button, false);
    }
  }

  async function deleteCoupon(id) {
    if (!confirm("این کد تخفیف حذف شود؟")) return;

    try {
      await api(
        `/coupons/${encodeURIComponent(id)}`,
        "DELETE"
      );

      notify("کد تخفیف حذف شد.");
      await loadCoupons();

    } catch (error) {
      notify(error.message || "حذف کد تخفیف ناموفق بود.", "error");
    }
  }

  /* =========================================================
     CUSTOMERS
     ========================================================= */

  async function loadCustomers() {
    const table = $("customers-table");

    if (table) {
      table.innerHTML = emptyRow(5, "در حال دریافت مشتریان...");
    }

    try {
      const result = await api("/customers");

      state.customers = getList(result, "customers");

      renderCustomers();

    } catch (error) {
      console.error("Customers:", error);

      if (table) {
        table.innerHTML = emptyRow(5, "خطا در دریافت مشتریان.");
      }

      notify(error.message || "دریافت مشتریان ناموفق بود.", "error");
    }
  }

  function renderCustomers() {
    const table = $("customers-table");
    if (!table) return;

    const search = ($("customer-search")?.value || "")
      .trim()
      .toLowerCase();

    const customers = state.customers.filter((customer) => {
      return [
        customer.full_name,
        customer.email,
        customer.phone,
        customer.role,
        customer.userId
      ].join(" ").toLowerCase().includes(search);
    });

    const count = $("customer-count");

    if (count) {
      count.textContent = `${number(customers.length)} مشتری`;
    }

    if (!customers.length) {
      table.innerHTML = emptyRow(5);
      return;
    }

    table.innerHTML = customers.map((customer) => `
      <tr>
        <td>${escapeHTML(customer.full_name || "بدون نام")}</td>
        <td>${escapeHTML(customer.email || "—")}</td>
        <td>${escapeHTML(customer.phone || "—")}</td>
        <td>${escapeHTML(customer.role || "customer")}</td>
        <td>${escapeHTML(customer.userId || customer.$id || "—")}</td>
      </tr>
    `).join("");
  }

  /* =========================================================
     ORDERS
     ========================================================= */

  const orderStatus = {
    pending: "در انتظار بررسی",
    processing: "در حال آماده‌سازی",
    shipped: "ارسال شده",
    delivered: "تحویل شده",
    cancelled: "لغو شده",
    paid: "پرداخت شده"
  };

  const paymentStatus = {
    pending: "پرداخت نشده",
    paid: "پرداخت شده",
    failed: "ناموفق",
    refunded: "بازپرداخت شده"
  };

  async function loadOrders() {
    const table = $("orders-table");

    if (table) {
      table.innerHTML = emptyRow(6, "در حال دریافت سفارش‌ها...");
    }

    try {
      const result = await api("/orders");

      state.orders = getList(result, "orders");

      renderOrders();

    } catch (error) {
      console.error("Orders:", error);

      if (table) {
        table.innerHTML = emptyRow(6, "خطا در دریافت سفارش‌ها.");
      }

      notify(error.message || "دریافت سفارش‌ها ناموفق بود.", "error");
    }
  }

  function renderOrders() {
    const table = $("orders-table");
    if (!table) return;

    const search = ($("order-search")?.value || "")
      .trim()
      .toLowerCase();

    const filter = $("order-filter")?.value || "";

    const orders = state.orders.filter((order) => {
      const matchesSearch = [
        order.order_number,
        order.recipient_name,
        order.phone,
        order.$id
      ].join(" ").toLowerCase().includes(search);

      const matchesFilter =
        !filter ||
        order.status === filter ||
        order.payment_status === filter;

      return matchesSearch && matchesFilter;
    });

    if (!orders.length) {
      table.innerHTML = emptyRow(6);
      return;
    }

    table.innerHTML = orders.map((order) => `
      <tr>
        <td>${escapeHTML(order.order_number || order.$id)}</td>
        <td>${escapeHTML(order.recipient_name || "—")}</td>
        <td>${money(order.total)}</td>
        <td>${escapeHTML(orderStatus[order.status] || order.status || "—")}</td>
        <td>${escapeHTML(order.createdAt || order.$createdAt || "—")}</td>
        <td>
          <button
            type="button"
            class="btn btn-secondary btn-small"
            data-action="view-order"
            data-id="${escapeHTML(order.$id)}"
          >جزئیات</button>
        </td>
      </tr>
    `).join("");
  }

  async function viewOrder(id) {
    try {
      const result = await api(
        `/orders/${encodeURIComponent(id)}`
      );

      const order = result.order || result;

      state.currentOrder = order;

      const box = $("order-detail");
      if (!box) return;

      const items = Array.isArray(order.items)
        ? order.items
        : [];

      box.innerHTML = `
        <h3>
          سفارش ${escapeHTML(order.order_number || order.$id)}
        </h3>

        <p>
          نام گیرنده:
          ${escapeHTML(order.recipient_name || "—")}
        </p>

        <p>
          شماره تماس:
          ${escapeHTML(order.phone || "—")}
        </p>

        <p>
          آدرس:
          ${escapeHTML(order.address || "—")}
        </p>

        <p>
          مبلغ کل:
          ${money(order.total)}
        </p>

        <h4>محصولات سفارش</h4>

        ${
          items.length
            ? items.map((item) => `
                <p>
                  ${escapeHTML(item.product_name || "محصول")}
                  — تعداد: ${number(item.quantity)}
                  — ${money(item.total_price)}
                </p>
              `).join("")
            : "<p>محصولی برای نمایش وجود ندارد.</p>"
        }

        <hr>

        <div class="field">
          <label for="detail-order-status">وضعیت سفارش</label>

          <select id="detail-order-status">
            ${Object.entries(orderStatus).map(([key, value]) => `
              <option
                value="${key}"
                ${order.status === key ? "selected" : ""}
              >${value}</option>
            `).join("")}
          </select>
        </div>

        <div class="field">
          <label for="detail-payment-status">وضعیت پرداخت</label>

          <select id="detail-payment-status">
            ${Object.entries(paymentStatus).map(([key, value]) => `
              <option
                value="${key}"
                ${order.payment_status === key ? "selected" : ""}
              >${value}</option>
            `).join("")}
          </select>
        </div>

        <div class="field">
          <label for="detail-tracking-code">کد رهگیری</label>
          <input
            id="detail-tracking-code"
            value="${escapeHTML(order.tracking_code || "")}"
          >
        </div>

        <div class="field">
          <label for="detail-order-notes">یادداشت</label>
          <textarea id="detail-order-notes">${escapeHTML(order.notes || "")}</textarea>
        </div>

        <div class="form-actions">
          <button
            type="button"
            class="btn btn-primary"
            id="save-order-detail"
          >ذخیره تغییرات</button>
        </div>
      `;

      $("save-order-detail")?.addEventListener(
        "click",
        saveOrderDetail
      );

    } catch (error) {
      notify(error.message || "دریافت جزئیات سفارش ناموفق بود.", "error");
    }
  }

  async function saveOrderDetail() {
    const order = state.currentOrder;
    if (!order) return;

    const button = $("save-order-detail");
    setBusy(button, true);

    try {
      const payload = {
        status: $("detail-order-status")?.value,
        payment_status: $("detail-payment-status")?.value,
        tracking_code: $("detail-tracking-code")?.value.trim(),
        notes: $("detail-order-notes")?.value.trim()
      };

      await api(
        `/orders/${encodeURIComponent(order.$id)}`,
        "PATCH",
        payload
      );

      notify("تغییرات سفارش ذخیره شد.");

      await loadOrders();

    } catch (error) {
      notify(error.message || "ذخیره سفارش ناموفق بود.", "error");
    } finally {
      setBusy(button, false);
    }
  }

  /* =========================================================
     DASHBOARD
     ========================================================= */

  async function loadDashboard() {
    try {
      const [productResult, orderResult] = await Promise.all([
        api("/products"),
        api("/orders")
      ]);

      state.products = getList(productResult, "products");
      state.orders = getList(orderResult, "orders");

      const products = state.products;
      const orders = state.orders;

      const lowStock = products.filter(
        (product) => Number(product.stock_quantity || 0) <= 5
      );

      const sales = orders
        .filter((order) => order.payment_status === "paid")
        .reduce(
          (sum, order) => sum + Number(order.total || 0),
          0
        );

      if ($("stat-products")) {
        $("stat-products").textContent = number(products.length);
      }

      if ($("stat-orders")) {
        $("stat-orders").textContent = number(orders.length);
      }

      if ($("stat-sales")) {
        $("stat-sales").textContent = money(sales);
      }

      if ($("stat-low")) {
        $("stat-low").textContent = number(lowStock.length);
      }

      const recent = $("recent-orders");

      if (recent) {
        const latest = [...orders]
          .sort((a, b) =>
            String(b.$createdAt || "").localeCompare(
              String(a.$createdAt || "")
            )
          )
          .slice(0, 5);

        recent.innerHTML = latest.length
          ? latest.map((order) => `
              <tr>
                <td>${escapeHTML(order.order_number || order.$id)}</td>
                <td>${escapeHTML(order.recipient_name || "—")}</td>
                <td>${money(order.total)}</td>
                <td>${escapeHTML(orderStatus[order.status] || order.status || "—")}</td>
                <td>${escapeHTML(order.createdAt || order.$createdAt || "—")}</td>
              </tr>
            `).join("")
          : emptyRow(5, "هنوز سفارشی ثبت نشده است.");
      }

      const attention = $("attention");

      if (attention) {
        attention.innerHTML = lowStock.length
          ? lowStock.map((product) => `
              <div class="notice warning">
                ${escapeHTML(product.name)}
                — موجودی:
                ${number(product.stock_quantity)}
              </div>
            `).join("")
          : `<div class="notice ok">
              همه محصولات موجودی مناسبی دارند.
            </div>`;
      }

    } catch (error) {
      console.error("Dashboard:", error);

      notify(
        error.message || "دریافت اطلاعات داشبورد با مشکل مواجه شد.",
        "error"
      );
    }
  }

  /* =========================================================
     EVENT HANDLERS
     ========================================================= */

  function bindEvents() {
    $("product-form")?.addEventListener("submit", saveProduct);

    $("reset-product")?.addEventListener("click", () => {
      resetProductForm();
    });

    $("product-search")?.addEventListener(
      "input",
      renderProducts
    );

    $("category-form")?.addEventListener(
      "submit",
      saveCategory
    );

    $("reset-category")?.addEventListener(
      "click",
      resetCategoryForm
    );

    $("coupon-form")?.addEventListener(
      "submit",
      saveCoupon
    );

    $("reset-coupon")?.addEventListener(
      "click",
      resetCouponForm
    );

    $("customer-search")?.addEventListener(
      "input",
      renderCustomers
    );

    $("order-search")?.addEventListener(
      "input",
      renderOrders
    );

    $("order-filter")?.addEventListener(
      "change",
      renderOrders
    );

    $("logout-top")?.addEventListener("click", logout);

    $("check-access")?.addEventListener("click", checkAdmin);

    document.querySelectorAll(
      "[data-admin-nav], [data-view]"
    ).forEach((button) => {
      button.addEventListener("click", () => {
        const section =
          button.dataset.adminNav ||
          button.dataset.view;

        if (section) go(section);
      });
    });

    document.querySelectorAll("[data-refresh]").forEach((button) => {
      button.addEventListener("click", refreshCurrentSection);
    });

    document.querySelectorAll("[data-jump]").forEach((button) => {
      button.addEventListener("click", () => {
        jumpTo(button.dataset.jump);
      });
    });

    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;

      const action = button.dataset.action;
      const id = button.dataset.id;

      switch (action) {
        case "edit-product":
          editProduct(id);
          break;

        case "delete-product":
          deleteProduct(id);
          break;

        case "edit-category":
          editCategory(id);
          break;

        case "delete-category":
          deleteCategory(id);
          break;

        case "edit-coupon":
          editCoupon(id);
          break;

        case "delete-coupon":
          deleteCoupon(id);
          break;

        case "view-order":
          viewOrder(id);
          break;
      }
    });

    $("p-image-file")?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      const preview = $("image-preview");

      if (!file || !preview) return;

      if (!file.type.startsWith("image/")) {
        notify("فقط فایل تصویری انتخاب کن.", "error");
        event.target.value = "";
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        notify("حجم تصویر نباید بیشتر از ۸ مگابایت باشد.", "error");
        event.target.value = "";
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        preview.innerHTML = `
          <img
            src="${reader.result}"
            alt=""
            style="max-width:120px;border-radius:10px"
          >
        `;
      };

      reader.onerror = () => {
        notify("نمایش تصویر ناموفق بود.", "error");
      };

      reader.readAsDataURL(file);
    });
  }

  /* =========================================================
     INITIALIZATION
     ========================================================= */

  document.addEventListener("DOMContentLoaded", async () => {
    if (!A) {
      notify(
        "فایل appwrite-client.js بارگذاری نشده است.",
        "error"
      );
      return;
    }

    bindEvents();

    const allowed = await checkAdmin();

    if (allowed) {
      go("dashboard");
    }
  });

})();
