(function () {
  "use strict";

  const A = window.VeloraaAppwrite;
  const $ = id => document.getElementById(id);

  let products = [];
  let orders = [];
  let profiles = [];
  let categories = [];
  let coupons = [];
  let authorized = false;

  const fmt = n =>
    new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 })
      .format(Number(n || 0));

  const money = n => fmt(n) + " تومان";

  const esc = value =>
    String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);

  const statusLabels = {
    pending: "در انتظار بررسی",
    confirmed: "تأییدشده",
    processing: "در حال آماده‌سازی",
    shipped: "ارسال‌شده",
    delivered: "تحویل‌شده",
    cancelled: "لغوشده"
  };

  function note(message, success = false) {
    const el = $("admin-message");
    if (!el) {
      console[success ? "info" : "error"](message);
      return;
    }
    el.textContent = message;
    el.className = "notice" + (success ? " ok" : "");
    el.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearNote() {
    if ($("admin-message")) $("admin-message").hidden = true;
  }

  function emptyRow(cols, message = "موردی ثبت نشده است.") {
    return `<tr><td colspan="${cols}" class="empty">${esc(message)}</td></tr>`;
  }

  function statusPill(status) {
    const cls = status === "delivered" ? "green" :
      status === "cancelled" ? "red" : "";
    return `<span class="pill ${cls}">${esc(statusLabels[status] || status || "نامشخص")}</span>`;
  }

  function go(view) {
    document.querySelectorAll(".tabs [data-view]").forEach(button => {
      button.classList.toggle("active", button.dataset.view === view);
    });

    document.querySelectorAll(".view").forEach(section => {
      section.hidden = section.id !== "view-" + view;
    });

    clearNote();
  }

  function normalize(resource, item) {
    const row = { ...item, id: item.$id || item.id };

    if (resource === "products") {
      row.price = row.price ?? row.originalPrice ?? row.oldPrice ?? 0;
      row.discount_percent = row.discount_percent ?? row.discount ?? 0;
      row.stock_quantity = row.stock_quantity ?? row.stock ?? 0;
      row.image_url = row.image_url ?? row.image ?? "";
      row.is_active = row.is_active ?? row.isActive ?? true;
      row.brand = row.brand ?? "";
      row.category = row.category ?? "other";
    }

    if (resource === "profiles") {
      row.email = row.email ?? "";
      row.full_name = row.full_name ?? "";
      row.phone = row.phone ?? "";
      row.role = row.role ?? "customer";
      row.created_at = row.created_at ?? row.$createdAt;
    }

    if (resource === "orders") {
      row.created_at = row.created_at ?? row.$createdAt;
      row.total = row.total ?? row.amount ?? 0;
    }

    return row;
  }

  function apiUrl(resource, id) {
    if (!A?.config?.adminApiUrl) {
      throw new Error("آدرس Admin API در appwrite-client.js تنظیم نشده است.");
    }

    const url = new URL(A.config.adminApiUrl);
    url.searchParams.set("resource", resource);
    if (id) url.searchParams.set("id", id);
    return url.toString();
  }

  async function api(resource, method = "GET", id, body) {
    if (!A?.adminRequest) {
      throw new Error("Appwrite Client بارگذاری نشده است.");
    }

    const result = await A.adminRequest({
      url: apiUrl(resource, id),
      method,
      body
    });

    return result.item ?? result.items ?? result;
  }

  async function ensureAdmin() {
    $("admin-app").hidden = true;
    $("admin-login-needed").hidden = false;

    const user = await A.getCurrentUser();

    if (!user) {
      note("برای ورود به پنل، ابتدا وارد حساب Appwrite خود شو.");
      return false;
    }

    // The server validates the JWT and the ADMIN_USER_IDS allowlist.
    await api("products");

    authorized = true;
    $("admin-login-needed").hidden = true;
    $("admin-app").hidden = false;

    if ($("logout-top")) $("logout-top").hidden = false;
    return true;
  }

  async function loadResource(resource) {
    const result = await api(resource);

    if (!Array.isArray(result)) {
      throw new Error("پاسخ نامعتبر از API: " + resource);
    }

    return result.map(item => normalize(resource, item));
  }

  async function loadAll() {
    if (!authorized) return;

    clearNote();

    const tasks = [
      ["products", value => products = value],
      ["orders", value => orders = value],
      ["profiles", value => profiles = value],
      ["categories", value => categories = value],
      ["coupons", value => coupons = value]
    ];

    const results = await Promise.allSettled(
      tasks.map(async ([resource, setter]) => {
        const rows = await loadResource(resource);
        setter(rows);
        return resource;
      })
    );

    renderAll();

    const errors = results
      .map((result, index) => result.status === "rejected"
        ? tasks[index][0] + ": " + (result.reason?.message || "خطا")
        : null)
      .filter(Boolean);

    if (errors.length) {
      note("بعضی بخش‌ها بارگذاری نشدند: " + errors.join(" | "));
    }
  }

  function renderAll() {
    renderDashboard();
    renderProducts();
    renderOrders();
    renderCustomers();
    renderCategories();
    renderCoupons();
    renderCategoryOptions();
  }

  function renderDashboard() {
    $("stat-products").textContent = fmt(products.length);
    $("stat-orders").textContent = fmt(orders.length);

    $("stat-sales").textContent = money(
      orders.filter(o => o.status !== "cancelled")
        .reduce((sum, o) => sum + Number(o.total || 0), 0)
    );

    $("stat-low").textContent = fmt(
      products.filter(p => p.is_active && Number(p.stock_quantity) <= 5).length
    );

    const recent = [...orders]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 6);

    $("recent-orders").innerHTML = recent.map(o => `
      <tr>
        <td>${esc(String(o.id).slice(0, 8))}</td>
        <td>${esc(o.customer_name || "—")}</td>
        <td>${money(o.total)}</td>
        <td>${statusPill(o.status)}</td>
      </tr>
    `).join("") || emptyRow(4, "سفارشی ثبت نشده است.");

    const low = products.filter(
      p => p.is_active && Number(p.stock_quantity) <= 5
    );

    $("attention").innerHTML = low.length
      ? "محصولات با موجودی کم:<ul>" +
        low.map(p => `<li>${esc(p.name)} — ${fmt(p.stock_quantity)}</li>`).join("") +
        "</ul>"
      : "محصول فعالی با موجودی ۵ عدد یا کمتر وجود ندارد.";
  }

  function renderProducts() {
    const term = ($("product-search")?.value || "").trim().toLowerCase();

    const list = products.filter(p =>
      `${p.name || ""} ${p.brand || ""}`.toLowerCase().includes(term)
    );

    $("product-count").textContent = fmt(list.length) + " محصول";

    $("products-table").innerHTML = list.map(p => {
      const stock = Number(p.stock_quantity || 0);
      const status = !p.is_active ? "پنهان" : stock <= 0 ? "ناموجود" : "موجود";
      const cls = !p.is_active ? "muted" : stock <= 0 ? "red" : "green";

      return `<tr>
        <td>${p.image_url
          ? `<img class="thumb" src="${esc(p.image_url)}" alt="" loading="lazy">`
          : "—"}</td>
        <td>${esc(p.name)}<div class="muted">${esc(p.brand)}</div></td>
        <td>${money(p.price)}</td>
        <td>${fmt(p.discount_percent)}٪</td>
        <td><input class="inline-stock" type="number" min="0" step="1"
          value="${stock}" data-stock-input="${esc(p.id)}" style="width:82px"></td>
        <td><span class="pill ${cls}">${status}</span></td>
        <td class="product-actions">
          <button class="small" data-save-stock="${esc(p.id)}">ذخیره موجودی</button>
          <button class="small secondary" data-toggle-product="${esc(p.id)}">${p.is_active ? "پنهان‌کردن" : "نمایش در فروشگاه"}</button>
          <button class="small" data-edit-product="${esc(p.id)}">ویرایش</button>
          <button class="small danger" data-delete-product="${esc(p.id)}">حذف</button>
        </td>
      </tr>`;
    }).join("") || emptyRow(7, "محصولی ثبت نشده است.");
  }

  function resetProduct() {
    $("product-form").reset();
    $("product-id").value = "";
    $("product-form-title").textContent = "افزودن محصول";
    $("p-discount").value = 0;
    $("p-stock").value = 0;
    $("p-active").checked = true;
    if ($("p-image-file")) $("p-image-file").value = "";
  }

  function fillProduct(p) {
    $("product-id").value = p.id;
    $("product-form-title").textContent = "ویرایش محصول";
    $("p-name").value = p.name || "";
    $("p-brand").value = p.brand || "";
    $("p-category").value = p.category || "other";
    $("p-price").value = p.price ?? 0;
    $("p-discount").value = p.discount_percent ?? 0;
    $("p-stock").value = p.stock_quantity ?? 0;
    $("p-variant").value = p.variant || "";
    $("p-image-url").value = p.image_url || "";
    $("p-description").value = p.description || "";
    $("p-active").checked = !!p.is_active;
    go("products");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function productPayload() {
    const price = Number($("p-price").value);
    const discount = Number($("p-discount").value);
    const stock = Number($("p-stock").value);

    if (!Number.isFinite(price) || price < 0 ||
        !Number.isInteger(stock) || stock < 0 ||
        !Number.isFinite(discount) || discount < 0 || discount > 100) {
      throw new Error("قیمت، تخفیف یا موجودی معتبر نیست.");
    }

    const name = $("p-name").value.trim();
    if (!name) throw new Error("نام محصول الزامی است.");

    if ($("p-image-file")?.files?.length) {
      throw new Error("آپلود تصویر هنوز در API فعال نشده است؛ فعلاً URL تصویر را وارد کن.");
    }

    return {
      name,
      brand: $("p-brand").value.trim(),
      category: $("p-category").value,
      price,
      discount_percent: discount,
      sale_price: Math.round(price * (1 - discount / 100)),
      stock_quantity: stock,
      variant: $("p-variant").value.trim(),
      image_url: $("p-image-url").value.trim(),
      description: $("p-description").value.trim(),
      is_active: $("p-active").checked
    };
  }

  async function saveProduct(event) {
    event.preventDefault();
    const button = $("save-product");
    button.disabled = true;

    try {
      const id = $("product-id").value;
      const data = productPayload();
      await api("products", id ? "PATCH" : "POST",
        id || undefined, id ? { id, ...data } : data);

      resetProduct();
      await loadAll();
      note("درخواست ذخیره محصول با موفقیت انجام شد.", true);
    } catch (error) {
      note(error.message || "ذخیره محصول ناموفق بود.");
    } finally {
      button.disabled = false;
    }
  }

  async function changeProduct(id, data, message) {
    await api("products", "PATCH", id, { id, ...data });
    await loadAll();
    note(message, true);
  }

  function renderOrders() {
    const term = ($("order-search")?.value || "").trim().toLowerCase();
    const filter = $("order-filter")?.value || "all";

    const list = [...orders].filter(o =>
      (filter === "all" || o.status === filter) &&
      [o.id, o.customer_name, o.phone].some(
        v => String(v || "").toLowerCase().includes(term)
      )
    ).sort((a, b) =>
      new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );

    $("orders-table").innerHTML = list.map(o => `
      <tr>
        <td>${esc(String(o.id).slice(0, 8))}</td>
        <td>${o.created_at ? esc(new Date(o.created_at).toLocaleDateString("fa-IR")) : "—"}</td>
        <td>${esc(o.customer_name || "—")}</td>
        <td>${esc(o.phone || "—")}</td>
        <td>${money(o.total)}</td>
        <td><select data-order-status="${esc(o.id)}">
          ${Object.entries(statusLabels).map(([value, label]) =>
            `<option value="${value}" ${o.status === value ? "selected" : ""}>${label}</option>`
          ).join("")}
        </select></td>
        <td><button class="small secondary" data-order-detail="${esc(o.id)}">جزئیات</button></td>
      </tr>
    `).join("") || emptyRow(7, "سفارشی مطابق این فیلتر پیدا نشد.");
  }

  async function renderOrderDetail(id) {
    const order = orders.find(o => o.id === id);
    const box = $("order-detail");

    box.hidden = false;
    box.textContent =
      "اطلاعات سفارش: " + String(id) +
      "\nنام مشتری: " + (order?.customer_name || "—") +
      "\nوضعیت: " + (statusLabels[order?.status] || order?.status || "نامشخص") +
      "\nآدرس: " + (order?.address || "—") +
      "\nیادداشت: " + (order?.notes || "—") +
      "\nبرای نمایش اقلام سفارش، API باید فیلتر order_id را پشتیبانی کند.";
  }

  function renderCategoryOptions() {
    const fallback = [
      ["skincare", "مراقبت پوست"], ["makeup", "آرایش"],
      ["haircare", "مراقبت مو"], ["fragrance", "عطر و ادکلن"],
      ["hygiene", "بهداشت"], ["tools", "ابزار آرایش"],
      ["nails", "ناخن"], ["bodycare", "مراقبت بدن"],
      ["other", "سایر"]
    ];

    const values = categories.length
      ? categories.map(c => [c.slug, c.name])
      : fallback;

    $("p-category").innerHTML = values.map(([value, label]) =>
      `<option value="${esc(value)}">${esc(label)}</option>`
    ).join("");
  }

  function renderCategories() {
    const counts = {};
    products.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });

    $("categories-table").innerHTML = categories.map(c => `
      <tr>
        <td>${esc(c.name)}</td>
        <td><code>${esc(c.slug)}</code></td>
        <td>${fmt(counts[c.slug] || 0)}</td>
        <td>
          <button class="small" data-edit-category="${esc(c.id)}">ویرایش</button>
          <button class="small danger" data-delete-category="${esc(c.id)}">حذف</button>
        </td>
      </tr>
    `).join("") || emptyRow(4, "دسته‌بندی‌ای ثبت نشده است.");
  }

  function resetCategory() {
    $("category-form").reset();
    $("category-id").value = "";
  }

  async function saveCategory(event) {
    event.preventDefault();

    const id = $("category-id").value;
    const name = $("category-name").value.trim();
    const slug = $("category-slug").value.trim().toLowerCase();

    if (!name) return note("نام دسته‌بندی الزامی است.");
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return note("شناسه دسته‌بندی فقط می‌تواند شامل حروف انگلیسی کوچک، عدد و خط تیره باشد.");
    }

    try {
      await api("categories", id ? "PATCH" : "POST",
        id || undefined, id ? { id, name, slug } : { name, slug });

      resetCategory();
      await loadAll();
      note("دسته‌بندی ذخیره شد.", true);
    } catch (error) {
      note(error.message);
    }
  }

  function renderCoupons() {
    const now = Date.now();

    $("coupons-table").innerHTML = coupons.map(c => {
      const valid = !!c.is_active &&
        (!c.starts_at || new Date(c.starts_at).getTime() <= now) &&
        (!c.ends_at || new Date(c.ends_at).getTime() >= now) &&
        (!Number(c.usage_limit) || Number(c.usage_count) < Number(c.usage_limit));

      return `<tr>
        <td><b>${esc(c.code)}</b></td>
        <td>${c.discount_type === "percent" ? fmt(c.discount_value) + "٪" : money(c.discount_value)}</td>
        <td>${c.ends_at ? esc(new Date(c.ends_at).toLocaleDateString("fa-IR")) : "بدون تاریخ پایان"}</td>
        <td>${fmt(c.usage_count)} / ${Number(c.usage_limit) ? fmt(c.usage_limit) : "∞"}</td>
        <td><span class="pill ${valid ? "green" : "red"}">${valid ? "قابل استفاده" : "غیرفعال/نامعتبر"}</span></td>
        <td>
          <button class="small" data-edit-coupon="${esc(c.id)}">ویرایش</button>
          <button class="small danger" data-delete-coupon="${esc(c.id)}">حذف</button>
        </td>
      </tr>`;
    }).join("") || emptyRow(6, "کدی ثبت نشده است.");
  }

  function resetCoupon() {
    $("coupon-form").reset();
    $("coupon-id").value = "";
    $("coupon-form-title").textContent = "ساخت کد تخفیف";
    $("coupon-type").value = "percent";
    $("coupon-active").checked = true;
    $("coupon-minimum").value = 0;
    $("coupon-max").value = 0;
    $("coupon-limit").value = 0;
  }

  function couponPayload() {
    const code = $("coupon-code").value.trim().toUpperCase();
    const type = $("coupon-type").value;
    const value = Number($("coupon-value").value);
    const minimum = Number($("coupon-minimum").value || 0);
    const maximum = Number($("coupon-max").value || 0);
    const limit = Number($("coupon-limit").value || 0);
    const start = $("coupon-start").value
      ? new Date($("coupon-start").value).toISOString() : null;
    const end = $("coupon-end").value
      ? new Date($("coupon-end").value).toISOString() : null;

    if (!/^[A-Z0-9_-]+$/.test(code) || !Number.isFinite(value) ||
        value <= 0 || minimum < 0 || maximum < 0 || limit < 0 ||
        (type === "percent" && value > 100)) {
      throw new Error("مقادیر کد تخفیف نامعتبر است.");
    }

    if (start && end && new Date(start) >= new Date(end)) {
      throw new Error("تاریخ پایان باید بعد از شروع باشد.");
    }

    return {
      code,
      discount_type: type,
      discount_value: value,
      minimum_order: minimum,
      maximum_discount: maximum,
      usage_limit: limit,
      starts_at: start,
      ends_at: end,
      is_active: $("coupon-active").checked
    };
  }

  async function saveCoupon(event) {
    event.preventDefault();

    try {
      const id = $("coupon-id").value;
      const data = couponPayload();

      await api("coupons", id ? "PATCH" : "POST",
        id || undefined, id ? { id, ...data } : data);

      resetCoupon();
      await loadAll();
      note("کد تخفیف ذخیره شد. اعمال آن در پرداخت نیز باید جداگانه پیاده‌سازی شود.", true);
    } catch (error) {
      note(error.message);
    }
  }

  function renderCustomers() {
    const term = ($("customer-search")?.value || "").trim().toLowerCase();

    const list = profiles.filter(p =>
      [p.full_name, p.email, p.phone, p.role].some(
        v => String(v || "").toLowerCase().includes(term)
      )
    );

    $("customer-count").textContent = fmt(list.length) + " حساب";

    $("customers-table").innerHTML = list.map(p => `
      <tr>
        <td>${esc(p.full_name || "—")}</td>
        <td>${esc(p.email || "—")}</td>
        <td>${esc(p.phone || "—")}</td>
        <td><span class="pill ${p.role === "admin" ? "green" : ""}">${p.role === "admin" ? "مدیر" : "مشتری"}</span></td>
        <td>${p.created_at ? esc(new Date(p.created_at).toLocaleDateString("fa-IR")) : "—"}</td>
      </tr>
    `).join("") || emptyRow(5, "پروفایلی یافت نشد.");
  }

  function bind() {
    document.querySelectorAll("[data-view]").forEach(button =>
      button.addEventListener("click", () => go(button.dataset.view))
    );

    document.querySelectorAll("[data-jump]").forEach(button =>
      button.addEventListener("click", () => go(button.dataset.jump))
    );

    document.querySelectorAll("[data-refresh]").forEach(button =>
      button.addEventListener("click", loadAll)
    );

    $("check-access").addEventListener("click", async () => {
      try {
        if (await ensureAdmin()) await loadAll();
      } catch (error) {
        note(error.message || "بررسی دسترسی ناموفق بود.");
      }
    });

    $("logout-top").addEventListener("click", async () => {
      try {
        await A.account.deleteSession("current");
      } finally {
        location.href = "account.html";
      }
    });

    $("product-form").addEventListener("submit", saveProduct);
    $("reset-product").addEventListener("click", resetProduct);
    $("product-search").addEventListener("input", renderProducts);
    $("order-search").addEventListener("input", renderOrders);
    $("order-filter").addEventListener("change", renderOrders);
    $("customer-search").addEventListener("input", renderCustomers);

    $("products-table").addEventListener("click", async event => {
      const edit = event.target.closest("[data-edit-product]");
      const del = event.target.closest("[data-delete-product]");
      const save = event.target.closest("[data-save-stock]");
      const toggle = event.target.closest("[data-toggle-product]");

      try {
        if (edit) {
          const p = products.find(x => x.id === edit.dataset.editProduct);
          if (p) fillProduct(p);
        }

        if (save) {
          const id = save.dataset.saveStock;
          const input = document.querySelector(`[data-stock-input="${CSS.escape(id)}"]`);
          const stock = Number(input?.value);

          if (!Number.isInteger(stock) || stock < 0) {
            throw new Error("موجودی باید عدد صحیح و صفر یا بیشتر باشد.");
          }

          const p = products.find(x => x.id === id);
          if (!p) throw new Error("محصول پیدا نشد.");

          const field = Object.hasOwn(p, "stock") ? "stock" : "stock_quantity";
          await changeProduct(id, { [field]: stock }, "موجودی به‌روزرسانی شد.");
        }

        if (toggle) {
          const p = products.find(x => x.id === toggle.dataset.toggleProduct);
          if (p) {
            const field = Object.hasOwn(p, "isActive") ? "isActive" : "is_active";
            await changeProduct(
              p.id,
              { [field]: !p.is_active },
              "وضعیت نمایش محصول تغییر کرد."
            );
          }
        }

        if (del) {
          const p = products.find(x => x.id === del.dataset.deleteProduct);
          if (p && confirm(`محصول «${p.name}» حذف شود؟`)) {
            await api("products", "DELETE", p.id, { id: p.id });
            await loadAll();
            note("محصول حذف شد.", true);
          }
        }
      } catch (error) {
        note(error.message || "عملیات محصول ناموفق بود.");
      }
    });

    $("orders-table").addEventListener("change", async event => {
      const select = event.target.closest("[data-order-status]");
      if (!select) return;

      try {
        await api("orders", "PATCH", select.dataset.orderStatus, {
          id: select.dataset.orderStatus,
          status: select.value
        });
        await loadAll();
        note("وضعیت سفارش به‌روزرسانی شد.", true);
      } catch (error) {
        note(error.message);
      }
    });

    $("orders-table").addEventListener("click", event => {
      const button = event.target.closest("[data-order-detail]");
      if (button) renderOrderDetail(button.dataset.orderDetail);
    });

    $("category-form").addEventListener("submit", saveCategory);
    $("reset-category").addEventListener("click", resetCategory);

    $("categories-table").addEventListener("click", async event => {
      const edit = event.target.closest("[data-edit-category]");
      const del = event.target.closest("[data-delete-category]");

      try {
        if (edit) {
          const c = categories.find(x => x.id === edit.dataset.editCategory);
          if (c) {
            $("category-id").value = c.id;
            $("category-name").value = c.name || "";
            $("category-slug").value = c.slug || "";
            go("categories");
          }
        }

        if (del) {
          const c = categories.find(x => x.id === del.dataset.deleteCategory);
          if (c && confirm(`دسته‌بندی «${c.name}» حذف شود؟`)) {
            await api("categories", "DELETE", c.id, { id: c.id });
            await loadAll();
            note("دسته‌بندی حذف شد.", true);
          }
        }
      } catch (error) {
        note(error.message);
      }
    });

    $("coupon-form").addEventListener("submit", saveCoupon);
    $("reset-coupon").addEventListener("click", resetCoupon);

    $("coupons-table").addEventListener("click", async event => {
      const edit = event.target.closest("[data-edit-coupon]");
      const del = event.target.closest("[data-delete-coupon]");

      try {
        if (edit) {
          const c = coupons.find(x => x.id === edit.dataset.editCoupon);

          if (c) {
            $("coupon-id").value = c.id;
            $("coupon-form-title").textContent = "ویرایش کد تخفیف";
            $("coupon-code").value = c.code || "";
            $("coupon-type").value = c.discount_type || "percent";
            $("coupon-value").value = c.discount_value ?? 0;
            $("coupon-minimum").value = c.minimum_order ?? 0;
            $("coupon-max").value = c.maximum_discount ?? 0;
            $("coupon-limit").value = c.usage_limit ?? 0;
            $("coupon-start").value = toLocal(c.starts_at);
            $("coupon-end").value = toLocal(c.ends_at);
            $("coupon-active").checked = !!c.is_active;
            go("coupons");
          }
        }

        if (del) {
          const c = coupons.find(x => x.id === del.dataset.deleteCoupon);
          if (c && confirm(`کد «${c.code}» حذف شود؟`)) {
            await api("coupons", "DELETE", c.id, { id: c.id });
            await loadAll();
            note("کد تخفیف حذف شد.", true);
          }
        }
      } catch (error) {
        note(error.message);
      }
    });
  }

  function toLocal(value) {
    if (!value) return "";
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (!$("admin-app")) return;

    if (!A) {
      note("فایل appwrite-client.js یا SDK بارگذاری نشده است.");
      return;
    }

    bind();

    try {
      if (await ensureAdmin()) await loadAll();
    } catch (error) {
      authorized = false;
      $("admin-app").hidden = true;
      $("admin-login-needed").hidden = false;
      note(error.message || "راه‌اندازی پنل ناموفق بود.");
    }
  });
})();
