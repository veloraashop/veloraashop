/* =========================================================
   VELORAA SHOP - ADMIN PANEL
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

  const api = async (url, method = "GET", body = undefined) => {
    if (!A?.adminRequest) {
      throw new Error("اتصال Appwrite در دسترس نیست.");
    }

    return A.adminRequest({
      url,
      method,
      body
    });
  };

  const setBusy = (element, busy, text = "در حال ذخیره...") => {
    if (!element) return;

    if (busy) {
      element.dataset.originalText = element.textContent;
      element.disabled = true;
      element.textContent = text;
    } else {
      element.disabled = false;
      element.textContent =
        element.dataset.originalText || element.textContent;
    }
  };

  const emptyRow = (columns, message = "موردی یافت نشد.") =>
    `<tr><td colspan="${columns}" class="empty-state">${escapeHTML(message)}</td></tr>`;

  const go = (section) => {
    document.querySelectorAll("[data-admin-section]").forEach((item) => {
      item.hidden = item.dataset.adminSection !== section;
    });

    document.querySelectorAll("[data-admin-nav]").forEach((item) => {
      item.classList.toggle(
        "active",
        item.dataset.adminNav === section
      );
    });

    const title = $("admin-page-title");
    if (title) title.textContent = section;

    if (section === "dashboard") loadDashboard();
    if (section === "products") loadProducts();
    if (section === "categories") loadCategories();
    if (section === "coupons") loadCoupons();
    if (section === "customers") loadCustomers();
    if (section === "orders") loadOrders();
  };

  /* =========================================================
     AUTHENTICATION
     ========================================================= */

  async function checkAdmin() {
    const loginNeeded = $("admin-login-needed");
    const adminApp = $("admin-app");

    try {
      const user = await A.getCurrentUser();

      if (!user) {
        if (loginNeeded) loginNeeded.hidden = false;
        if (adminApp) adminApp.hidden = true;
        return false;
      }

      const result = await api("/admin-check");

      if (!result?.isAdmin) {
        throw new Error("این حساب دسترسی مدیریت ندارد.");
      }

      if (loginNeeded) loginNeeded.hidden = true;
      if (adminApp) adminApp.hidden = false;

      const adminName = $("admin-name");
      if (adminName) {
        adminName.textContent = user.name || user.email || "مدیر";
      }

      return true;

    } catch (error) {
      console.error("Admin authentication:", error);

      if (loginNeeded) loginNeeded.hidden = false;
      if (adminApp) adminApp.hidden = true;

      notify(error.message || "خطا در بررسی دسترسی مدیر.", "error");
      return false;
    }
  }

  async function logout() {
    try {
      await A.account.deleteSession("current");
      location.href = "account.html";
    } catch (error) {
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
      state.products = result.products || result.data || [];

      renderProducts();
      updateProductCount();

    } catch (error) {
      console.error(error);
      if (table) {
        table.innerHTML = emptyRow(8, "خطا در دریافت محصولات.");
      }
      notify(error.message, "error");
    }
  }

  function updateProductCount() {
    const count = $("product-count");
    if (count) {
      count.textContent = new Intl.NumberFormat("fa-IR")
        .format(state.products.length);
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

      return `
        <tr>
          <td>
            ${
              product.image_url
                ? `<img src="${escapeHTML(product.image_url)}"
                     alt="" width="48" height="48"
                     style="object-fit:cover;border-radius:8px">`
                : "—"
            }
          </td>

          <td>${escapeHTML(product.name)}</td>
          <td>${escapeHTML(product.brand || "—")}</td>
          <td>${escapeHTML(product.category || "—")}</td>
          <td>${money(product.price)}</td>
          <td>${money(product.sale_price || product.price)}</td>
          <td>${escapeHTML(product.stock_quantity ?? 0)}</td>

          <td>
            <span class="badge ${active ? "success" : "danger"}">
              ${active ? "فعال" : "غیرفعال"}
            </span>
          </td>

          <td>
            <button type="button" data-action="edit-product"
              data-id="${id}">ویرایش</button>

            <button type="button" data-action="delete-product"
              data-id="${id}">حذف</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  function resetProductForm() {
    $("product-form")?.reset();

    if ($("product-id")) $("product-id").value = "";
    if ($("product-active")) $("product-active").checked = true;
    if ($("p-active")) $("p-active").checked = true;

    const title = $("product-form-title");
    if (title) title.textContent = "افزودن محصول جدید";

    const preview = $("image-preview");
    if (preview) preview.innerHTML = "";
  }

  function editProduct(id) {
    const product = state.products.find((item) => item.$id === id);
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

    if ($("p-active")) {
      $("p-active").checked = product.is_active !== false;
    }

    const title = $("product-form-title");
    if (title) title.textContent = "ویرایش محصول";

    const preview = $("image-preview");
    if (preview && product.image_url) {
      preview.innerHTML = `
        <img src="${escapeHTML(product.image_url)}"
          alt="" style="max-width:120px;border-radius:10px">
      `;
    }

    $("product-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  async function uploadProductImage(file) {
    if (!file) return $("p-image-url")?.value || "";

    const form = new FormData();
    form.append("file", file);

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
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

      const file = $("p-image-file")?.files?.[0];
      const imageURL = await uploadProductImage(file);

      const salePrice = Math.round(
        price * (100 - discount) / 100
      );

      const payload = {
        name: $("p-name")?.value.trim(),
        brand: $("p-brand")?.value.trim(),
        category: $("p-category")?.value.trim(),
        price,
        sale_price: salePrice,
        discount_percent: discount,
        stock_quantity: Number($("p-stock")?.value || 0),
        variant: $("p-variant")?.value.trim(),
        image_url: imageURL,
        description: $("p-description")?.value.trim(),
        is_active: $("p-active")?.checked ?? true
      };

      if (!payload.name || !payload.category) {
        throw new Error("نام و دسته‌بندی محصول را وارد کن.");
      }

      if (id) {
        await api(`/products/${encodeURIComponent(id)}`, "PATCH", payload);
        notify("محصول با موفقیت ویرایش شد.");
      } else {
        await api("/products", "POST", payload);
        notify("محصول جدید اضافه شد.");
      }

      resetProductForm();
      await loadProducts();

    } catch (error) {
      console.error(error);
      notify(error.message || "ذخیره محصول ناموفق بود.", "error");
    } finally {
      setBusy(button, false);
    }
  }

  async function deleteProduct(id) {
    const product = state.products.find((item) => item.$id === id);

    if (!confirm(`محصول «${product?.name || ""}» حذف شود؟`)) {
      return;
    }

    try {
      await api(`/products/${encodeURIComponent(id)}`, "DELETE");
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
    if (table) table.innerHTML = emptyRow(4, "در حال دریافت...");

    try {
      const result = await api("/categories");
      state.categories = result.categories || result.data || [];
      renderCategories();

    } catch (error) {
      console.error(error);
      if (table) table.innerHTML = emptyRow(4, "خطا در دریافت دسته‌بندی‌ها.");
    }
  }

  function renderCategories() {
    const table = $("categories-table");
    if (!table) return;

    if (!state.categories.length) {
      table.innerHTML = emptyRow(4);
      return;
    }

    table.innerHTML = state.categories.map((category) => `
      <tr>
        <td>${escapeHTML(category.name)}</td>
        <td>${escapeHTML(category.slug)}</td>
        <td>
          <span class="badge ${category.active ? "success" : "danger"}">
            ${category.active ? "فعال" : "غیرفعال"}
          </span>
        </td>
        <td>
          <button type="button" data-action="edit-category"
            data-id="${escapeHTML(category.$id)}">ویرایش</button>
          <button type="button" data-action="delete-category"
            data-id="${escapeHTML(category.$id)}">حذف</button>
        </td>
      </tr>
    `).join("");
  }

  function resetCategoryForm() {
    $("category-form")?.reset();
    if ($("category-id")) $("category-id").value = "";
    if ($("category-active")) $("category-active").checked = true;
  }

  function editCategory(id) {
    const item = state.categories.find((x) => x.$id === id);
    if (!item) return;

    $("category-id").value = item.$id;
    $("category-name").value = item.name || "";
    $("category-slug").value = item.slug || "";

    if ($("category-description")) {
      $("category-description").value = item.description || "";
    }

    if ($("category-active")) {
      $("category-active").checked = item.active !== false;
    }

    $("category-form")?.scrollIntoView({ behavior: "smooth" });
  }

  async function saveCategory(event) {
    event.preventDefault();

    try {
      const id = $("category-id")?.value;

      const payload = {
        name: $("category-name")?.value.trim(),
        slug: $("category-slug")?.value.trim(),
        description: $("category-description")?.value.trim() || "",
        active: $("category-active")?.checked ?? true
      };

      if (!payload.name || !payload.slug) {
        throw new Error("نام و شناسه دسته‌بندی الزامی است.");
      }

      if (id) {
        await api(`/categories/${encodeURIComponent(id)}`, "PATCH", payload);
        notify("دسته‌بندی ویرایش شد.");
      } else {
        await api("/categories", "POST", payload);
        notify("دسته‌بندی جدید ایجاد شد.");
      }

      resetCategoryForm();
      await loadCategories();

    } catch (error) {
      notify(error.message || "ذخیره دسته‌بندی ناموفق بود.", "error");
    }
  }

  async function deleteCategory(id) {
    if (!confirm("این دسته‌بندی حذف شود؟")) return;

    try {
      await api(`/categories/${encodeURIComponent(id)}`, "DELETE");
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
    if (table) table.innerHTML = emptyRow(5, "در حال دریافت...");

    try {
      const result = await api("/coupons");
      state.coupons = result.coupons || result.data || [];
      renderCoupons();

    } catch (error) {
      console.error(error);
      if (table) table.innerHTML = emptyRow(5, "خطا در دریافت کدهای تخفیف.");
    }
  }

  function renderCoupons() {
    const table = $("coupons-table");
    if (!table) return;

    if (!state.coupons.length) {
      table.innerHTML = emptyRow(5);
      return;
    }

    table.innerHTML = state.coupons.map((coupon) => `
      <tr>
        <td>${escapeHTML(coupon.code)}</td>
        <td>
          ${
            coupon.type === "percentage"
              ? `${escapeHTML(coupon.value)}٪`
              : money(coupon.value)
          }
        </td>
        <td>${escapeHTML(coupon.used_count || 0)}</td>
        <td>
          <span class="badge ${coupon.active ? "success" : "danger"}">
            ${coupon.active ? "فعال" : "غیرفعال"}
          </span>
        </td>
        <td>
          <button type="button" data-action="edit-coupon"
            data-id="${escapeHTML(coupon.$id)}">ویرایش</button>
          <button type="button" data-action="delete-coupon"
            data-id="${escapeHTML(coupon.$id)}">حذف</button>
        </td>
      </tr>
    `).join("");
  }

  function resetCouponForm() {
    $("coupon-form")?.reset();
    if ($("coupon-id")) $("coupon-id").value = "";
    if ($("coupon-active")) $("coupon-active").checked = true;
  }

  function editCoupon(id) {
    const item = state.coupons.find((x) => x.$id === id);
    if (!item) return;

    $("coupon-id").value = item.$id;
    $("coupon-code").value = item.code || "";
    $("coupon-type").value = item.type || "percentage";
    $("coupon-value").value = item.value || 0;
    $("coupon-minimum").value = item.minimum_order || 0;
    $("coupon-max").value = item.maximum_discount || "";
    $("coupon-limit").value = item.usage_limit || "";

    if ($("coupon-start")) {
      $("coupon-start").value = item.start_at
        ? new Date(item.start_at).toISOString().slice(0, 16)
        : "";
    }

    if ($("coupon-end")) {
      $("coupon-end").value = item.end_at
        ? new Date(item.end_at).toISOString().slice(0, 16)
        : "";
    }

    if ($("coupon-active")) {
      $("coupon-active").checked = item.active !== false;
    }

    $("coupon-form")?.scrollIntoView({ behavior: "smooth" });
  }

  async function saveCoupon(event) {
    event.preventDefault();

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
        start_at: $("coupon-start")?.value
          ? new Date($("coupon-start").value).toISOString()
          : null,
        end_at: $("coupon-end")?.value
          ? new Date($("coupon-end").value).toISOString()
          : null,
        active: $("coupon-active")?.checked ?? true
      };

      if (!payload.code || payload.value <= 0) {
        throw new Error("کد تخفیف و مقدار معتبر وارد کن.");
      }

      if (id) {
        await api(`/coupons/${encodeURIComponent(id)}`, "PATCH", payload);
        notify("کد تخفیف ویرایش شد.");
      } else {
        await api("/coupons", "POST", payload);
        notify("کد تخفیف جدید ایجاد شد.");
      }

      resetCouponForm();
      await loadCoupons();

    } catch (error) {
      notify(error.message || "ذخیره کد تخفیف ناموفق بود.", "error");
    }
  }

  async function deleteCoupon(id) {
    if (!confirm("این کد تخفیف حذف شود؟")) return;

    try {
      await api(`/coupons/${encodeURIComponent(id)}`, "DELETE");
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
    if (table) table.innerHTML = emptyRow(5, "در حال دریافت مشتریان...");

    try {
      const result = await api("/customers");
      state.customers = result.customers || result.data || [];
      renderCustomers();

    } catch (error) {
      console.error(error);
      if (table) table.innerHTML = emptyRow(5, "خطا در دریافت مشتریان.");
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
        customer.phone
      ].join(" ").toLowerCase().includes(search);
    });

    const count = $("customer-count");
    if (count) {
      count.textContent = new Intl.NumberFormat("fa-IR")
        .format(customers.length);
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
        <td>${escapeHTML(customer.city || "—")}</td>
        <td>${escapeHTML(customer.createdAt || "—")}</td>
      </tr>
    `).join("");
  }

  /* =========================================================
     ORDERS
     ========================================================= */

  async function loadOrders() {
    const table = $("orders-table");
    if (table) table.innerHTML = emptyRow(7, "در حال دریافت سفارش‌ها...");

    try {
      const result = await api("/orders");
      state.orders = result.orders || result.data || [];
      renderOrders();

    } catch (error) {
      console.error(error);
      if (table) table.innerHTML = emptyRow(7, "خطا در دریافت سفارش‌ها.");
    }
  }

  const orderStatus = {
    pending: "در انتظار بررسی",
    processing: "در حال آماده‌سازی",
    shipped: "ارسال شده",
    delivered: "تحویل شده",
    cancelled: "لغو شده"
  };

  const paymentStatus = {
    pending: "پرداخت نشده",
    paid: "پرداخت شده",
    failed: "ناموفق",
    refunded: "بازپرداخت شده"
  };

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
        order.phone
      ].join(" ").toLowerCase().includes(search);

      const matchesFilter = !filter || order.status === filter;

      return matchesSearch && matchesFilter;
    });

    if (!orders.length) {
      table.innerHTML = emptyRow(7);
      return;
    }

    table.innerHTML = orders.map((order) => `
      <tr>
        <td>${escapeHTML(order.order_number || order.$id)}</td>
        <td>${escapeHTML(order.recipient_name || "—")}</td>
        <td>${money(order.total)}</td>
        <td>${escapeHTML(orderStatus[order.status] || order.status)}</td>
        <td>${escapeHTML(paymentStatus[order.payment_status] || order.payment_status)}</td>
        <td>${escapeHTML(order.phone || "—")}</td>
        <td>
          <button type="button" data-action="view-order"
            data-id="${escapeHTML(order.$id)}">جزئیات</button>
        </td>
      </tr>
    `).join("");
  }

  async function viewOrder(id) {
    try {
      const result = await api(`/orders/${encodeURIComponent(id)}`);
      const order = result.order || result;

      state.currentOrder = order;

      const box = $("order-detail");
      if (!box) return;

      const items = order.items || [];

      box.innerHTML = `
        <h3>سفارش ${escapeHTML(order.order_number || order.$id)}</h3>

        <p>نام گیرنده: ${escapeHTML(order.recipient_name || "—")}</p>
        <p>شماره تماس: ${escapeHTML(order.phone || "—")}</p>
        <p>آدرس: ${escapeHTML(order.address || "—")}</p>
        <p>مبلغ کل: ${money(order.total)}</p>

        <h4>محصولات سفارش</h4>

        ${
          items.length
            ? items.map((item) => `
                <p>
                  ${escapeHTML(item.product_name)}
                  — تعداد: ${escapeHTML(item.quantity)}
                  — ${money(item.total_price)}
                </p>
              `).join("")
            : "<p>محصولی برای نمایش وجود ندارد.</p>"
        }

        <hr>

        <label>وضعیت سفارش</label>
        <select id="detail-order-status">
          ${Object.entries(orderStatus).map(([key, value]) => `
            <option value="${key}"
              ${order.status === key ? "selected" : ""}>
              ${value}
            </option>
          `).join("")}
        </select>

        <label>وضعیت پرداخت</label>
        <select id="detail-payment-status">
          ${Object.entries(paymentStatus).map(([key, value]) => `
            <option value="${key}"
              ${order.payment_status === key ? "selected" : ""}>
              ${value}
            </option>
          `).join("")}
        </select>

        <label>کد رهگیری</label>
        <input id="detail-tracking-code"
          value="${escapeHTML(order.tracking_code || "")}">

        <label>یادداشت</label>
        <textarea id="detail-order-notes">${escapeHTML(order.notes || "")}</textarea>

        <button type="button" id="save-order-detail">
          ذخیره تغییرات
        </button>
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

    try {
      const payload = {
        status: $("detail-order-status")?.value,
        payment_status: $("detail-payment-status")?.value,
        tracking_code: $("detail-tracking-code")?.value.trim(),
        notes: $("detail-order-notes")?.value.trim()
      };

      await api(`/orders/${encodeURIComponent(order.$id)}`, "PATCH", payload);

      notify("تغییرات سفارش ذخیره شد.");
      await loadOrders();

    } catch (error) {
      notify(error.message || "ذخیره سفارش ناموفق بود.", "error");
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

      state.products = productResult.products || productResult.data || [];
      state.orders = orderResult.orders || orderResult.data || [];

      const products = state.products;
      const orders = state.orders;

      const lowStock = products.filter(
        (product) => Number(product.stock_quantity || 0) <= 5
      );

      const sales = orders
        .filter((order) => order.payment_status === "paid")
        .reduce((sum, order) => sum + Number(order.total || 0), 0);

      if ($("stat-products")) {
        $("stat-products").textContent = products.length;
      }

      if ($("stat-orders")) {
        $("stat-orders").textContent = orders.length;
      }

      if ($("stat-sales")) {
        $("stat-sales").textContent = money(sales);
      }

      if ($("stat-low")) {
        $("stat-low").textContent = lowStock.length;
      }

      const recent = $("recent-orders");

      if (recent) {
        const latest = [...orders].slice(0, 5);

        recent.innerHTML = latest.length
          ? latest.map((order) => `
              <tr>
                <td>${escapeHTML(order.order_number || order.$id)}</td>
                <td>${escapeHTML(order.recipient_name || "—")}</td>
                <td>${money(order.total)}</td>
                <td>${escapeHTML(orderStatus[order.status] || order.status)}</td>
              </tr>
            `).join("")
          : emptyRow(4, "هنوز سفارشی ثبت نشده است.");
      }

      const attention = $("attention");

      if (attention) {
        attention.innerHTML = lowStock.length
          ? lowStock.map((product) => `
              <div class="notice warning">
                ${escapeHTML(product.name)}
                — موجودی:
                ${escapeHTML(product.stock_quantity)}
              </div>
            `).join("")
          : `<div class="notice ok">همه محصولات موجودی مناسبی دارند.</div>`;
      }

    } catch (error) {
      console.error("Dashboard:", error);
      notify("دریافت اطلاعات داشبورد با مشکل مواجه شد.", "error");
    }
  }

  /* =========================================================
     EVENT HANDLERS
     ========================================================= */

  function bindEvents() {
    $("product-form")?.addEventListener("submit", saveProduct);
    $("reset-product")?.addEventListener("click", resetProductForm);

    $("product-search")?.addEventListener("input", renderProducts);

    $("category-form")?.addEventListener("submit", saveCategory);
    $("reset-category")?.addEventListener("click", resetCategoryForm);

    $("coupon-form")?.addEventListener("submit", saveCoupon);
    $("reset-coupon")?.addEventListener("click", resetCouponForm);

    $("customer-search")?.addEventListener("input", renderCustomers);

    $("order-search")?.addEventListener("input", renderOrders);
    $("order-filter")?.addEventListener("change", renderOrders);

    $("logout-top")?.addEventListener("click", logout);

    $("check-access")?.addEventListener("click", checkAdmin);

    document.querySelectorAll("[data-admin-nav]").forEach((button) => {
      button.addEventListener("click", () => {
        go(button.dataset.adminNav);
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

      const reader = new FileReader();

      reader.onload = () => {
        preview.innerHTML = `
          <img src="${reader.result}" alt=""
            style="max-width:120px;border-radius:10px">
        `;
      };

      reader.readAsDataURL(file);
    });
  }

  /* =========================================================
     INITIALIZATION
     ========================================================= */

  document.addEventListener("DOMContentLoaded", async () => {
    if (!A) {
      notify("فایل appwrite-client.js بارگذاری نشده است.", "error");
      return;
    }

    bindEvents();

    const allowed = await checkAdmin();

    if (allowed) {
      go("dashboard");
    }
  });

})();
