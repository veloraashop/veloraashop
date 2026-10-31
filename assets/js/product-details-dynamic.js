/* Veloraa Shop - Dynamic Product Details + SEO + Google Product Schema */
(function () {
  "use strict";

  const $ = (selector, root = document) =>
    root.querySelector(selector);

  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  const money = value =>
    new Intl.NumberFormat("fa-IR").format(
      Math.max(0, Number(value) || 0)
    );

  const text = (element, value) => {
    if (element) element.textContent = value ?? "";
  };

  function getId(product) {
    return String(
      product?.$id ??
      product?.$rowId ??
      product?.id ??
      ""
    );
  }

  function getBrand(product) {
    const brand = product?.brand;

    return Array.isArray(brand)
      ? (brand[0] || "Veloraa")
      : (brand || "Veloraa");
  }

  function getImage(product) {
    return product?.image_url || product?.image || "";
  }

  function getStock(product) {
    return Number(
      product?.stock_quantity ??
      product?.stock ??
      0
    );
  }

  function getDiscount(product) {
    return Math.max(
      0,
      Math.min(
        100,
        Number(
          product?.discount_percent ??
          product?.discount ??
          0
        )
      )
    );
  }

  function getFinalPrice(product) {
    if (
      product?.sale_price != null &&
      product.sale_price !== ""
    ) {
      return Number(product.sale_price) || 0;
    }

    const price = Number(product?.price) || 0;

    return Math.round(
      price * (1 - getDiscount(product) / 100)
    );
  }

  function getOriginalPrice(product) {
    return Number(
      product?.original_price ??
      product?.originalPrice ??
      product?.oldPrice ??
      product?.price ??
      0
    );
  }

  function showMessage(message) {
    let box = $("#dynamic-product-message");

    if (!box) {
      box = document.createElement("div");
      box.id = "dynamic-product-message";
      box.setAttribute("role", "status");

      box.style.cssText = [
        "max-width:900px",
        "margin:30px auto",
        "padding:24px",
        "border-radius:16px",
        "background:#fff0f5",
        "color:#71364d",
        "text-align:center",
        "font-family:inherit",
        "line-height:2"
      ].join(";");

      const main = $("main");

      if (main) main.prepend(box);
      else document.body.prepend(box);
    }

    box.textContent = message;
  }

  /* =========================
     SEO HELPERS
  ========================= */

  function setMeta(name, content, attribute = "name") {
    if (!content) return;

    let element = document.head.querySelector(
      `meta[${attribute}="${name}"]`
    );

    if (!element) {
      element = document.createElement("meta");
      element.setAttribute(attribute, name);
      document.head.appendChild(element);
    }

    element.setAttribute("content", content);
  }

  function setCanonical(url) {
    let canonical = document.head.querySelector(
      'link[rel="canonical"]'
    );

    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }

    canonical.href = url;
  }

  function updateProductSEO(product) {
    const id = getId(product);

    const name = String(
      product.name ||
      product.title ||
      "محصول"
    ).trim();

    const brand = String(getBrand(product)).trim();

    const description = String(
      product.description || ""
    ).replace(/\s+/g, " ").trim();

    const seoDescription = (
      description
        ? `${name} از برند ${brand}. ${description}`
        : `مشاهده مشخصات، قیمت و اطلاعات خرید ${name} در فروشگاه ولورا شاپ.`
    ).slice(0, 300);

    const image = getImage(product);

    let imageURL = "";

    if (image) {
      try {
        imageURL = new URL(image, location.origin).href;
      } catch (error) {
        console.warn(
          "[Veloraa] Invalid product image URL:",
          image
        );
      }
    }

    const canonicalURL = new URL(
      "product-details.html",
      location.origin
    );

    canonicalURL.searchParams.set("id", id);

    const title = `${name} | خرید از Veloraa Shop`;

    document.title = title;

    document.documentElement.lang = "fa";
    document.documentElement.dir = "rtl";

    setMeta("description", seoDescription);
    setMeta("robots", "index, follow");

    setCanonical(canonicalURL.href);

    // Open Graph
    setMeta("og:type", "product", "property");
    setMeta("og:title", title, "property");
    setMeta("og:description", seoDescription, "property");
    setMeta("og:url", canonicalURL.href, "property");

    if (imageURL) {
      setMeta("og:image", imageURL, "property");
      setMeta("og:image:alt", name, "property");
      setMeta("twitter:image", imageURL);
    }

    // Twitter
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", seoDescription);

    console.info(
      "[Veloraa SEO] Product metadata updated:",
      {
        id,
        title,
        canonical: canonicalURL.href
      }
    );
  }

  /* =========================
     GOOGLE PRODUCT SCHEMA
  ========================= */

  function updateProductSchema(product) {
    const id = getId(product);

    const name = String(
      product.name ||
      product.title ||
      "محصول"
    ).trim();

    const description = String(
      product.description ||
      `مشاهده مشخصات و خرید ${name} از فروشگاه Veloraa Shop.`
    ).replace(/\s+/g, " ").trim();

    const image = getImage(product);

    let imageURL = "";

    if (image) {
      try {
        imageURL = new URL(
          image,
          location.origin
        ).href;
      } catch (error) {
        console.warn(
          "[Veloraa Schema] Invalid image URL:",
          image
        );
      }
    }

    const priceToman = getFinalPrice(product);
    const priceRial = Math.round(priceToman * 10);
    const stock = getStock(product);

    const productURL = new URL(
      "product-details.html",
      location.origin
    );

    productURL.searchParams.set("id", id);

    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": name,
      "description": description,
      "brand": {
        "@type": "Brand",
        "name": String(getBrand(product))
      },
      "url": productURL.href
    };

    if (imageURL) {
      schema.image = [imageURL];
    }

    if (priceRial > 0) {
      schema.offers = {
        "@type": "Offer",
        "url": productURL.href,
        "priceCurrency": "IRR",
        "price": String(priceRial),
        "availability": stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        "itemCondition": "https://schema.org/NewCondition"
      };
    }

    let script = document.getElementById(
      "veloraa-product-schema"
    );

    if (!script) {
      script = document.createElement("script");
      script.id = "veloraa-product-schema";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }

    script.textContent = JSON.stringify(schema);

    console.info(
      "[Veloraa Schema] Product structured data updated:",
      schema
    );
  }

  /* =========================
     PRODUCT DISPLAY
  ========================= */

  function updateImage(product) {
    const image = $("#main-product-image");
    const url = getImage(product);

    if (!image) return;

    if (url) {
      image.src = url;

      image.alt =
        `${product.name || product.title || "محصول"} - ${getBrand(product)} | Veloraa Shop`;

      image.hidden = false;
      image.loading = "eager";
      image.decoding = "async";
    } else {
      image.removeAttribute("src");
      image.alt = "این محصول تصویر ندارد";
      image.hidden = true;
    }

    $$(".thumb-btn").forEach(
      button => button.remove()
    );
  }

  function updateBrand(product) {
    const heading = $("h1");

    if (!heading) return;

    const panel = heading.parentElement;

    const brandLink = $(
      'a[data-path="products-listing"]',
      panel
    );

    if (brandLink) {
      brandLink.textContent = getBrand(product);
      brandLink.href = "products.html";
    }
  }

  function updateBreadcrumb(product) {
    const nav = $('nav[aria-label="مسیریابی"]');

    if (!nav) return;

    const spans = $$("span", nav);
    const last = spans[spans.length - 1];

    if (last) {
      text(
        last,
        product.name || product.title || "جزئیات محصول"
      );
    }
  }

  function updatePrice(product) {
    const heading = $("h1");
    const panel = heading?.parentElement;

    if (!panel) return;

    const priceLabel = $$("span", panel).find(
      element =>
        element.textContent.includes(
          "قیمت نهایی با احتساب مالیات"
        )
    );

    const priceBox = priceLabel?.closest(
      ".flex.items-baseline.justify-between"
    );

    if (!priceBox) return;

    const price = getFinalPrice(product);
    const original = getOriginalPrice(product);
    const discount = getDiscount(product);

    const priceValue = priceBox.querySelector(
      ".text-primary.font-bold"
    );

    text(priceValue, money(price));

    const rightSide = priceBox.lastElementChild;

    if (rightSide) {
      const discountLabel = $$("span", rightSide).find(
        element =>
          element.textContent.includes("تخفیف")
      );

      const originalLabel = $$("span", rightSide).find(
        element =>
          element.classList.contains("line-through")
      );

      if (discount > 0 && original > price) {
        const actualDiscount = original > 0
          ? Math.round(((original - price) / original) * 100)
          : discount;

        text(
          discountLabel,
          `${new Intl.NumberFormat("fa-IR").format(Math.max(0, actualDiscount))}٪ تخفیف`
        );

        text(
          originalLabel,
          `${money(original)} تومان`
        );

        if (discountLabel) {
          discountLabel.hidden = false;
        }

        if (originalLabel) {
          originalLabel.hidden = false;
        }
      } else {
        if (discountLabel) {
          discountLabel.hidden = true;
        }

        if (originalLabel) {
          originalLabel.hidden = true;
        }
      }
    }
  }

  function updateStock(product) {
    const heading = $("h1");
    const panel = heading?.parentElement;

    if (!panel) return;

    const stock = getStock(product);

    const stockLabel = $$("span", panel).find(
      element =>
        element.textContent.includes("موجود در انبار") ||
        element.textContent.includes("ناموجود")
    );

    if (stockLabel) {
      text(
        stockLabel,
        stock > 0
          ? `موجود در انبار (${new Intl.NumberFormat("fa-IR").format(Math.max(0, stock))} عدد)`
          : "این محصول فعلاً ناموجود است"
      );
    }

    const addButton = $("#add-to-cart-btn");

    if (addButton) {
      addButton.disabled = stock <= 0;

      addButton.style.opacity =
        stock > 0 ? "1" : "0.55";

      addButton.style.cursor =
        stock > 0 ? "pointer" : "not-allowed";
    }

    const quantity = $("#product-qty");

    if (quantity) {
      text(quantity, "۱");
    }
  }

  function updateDescription(product) {
    const description = String(
      product.description ||
      "توضیحی برای این محصول ثبت نشده است."
    );

    const descriptionTab = $("#tab-desc");

    if (descriptionTab) {
      const paragraphs = $$("p", descriptionTab);

      if (paragraphs.length) {
        text(paragraphs[0], description);

        paragraphs.slice(1).forEach(
          paragraph => paragraph.remove()
        );
      }
    }
  }

  function parseDetails(product) {
    const raw = product?.details_json ?? product?.detailsJson ?? product?.details;
    if (raw && typeof raw === "object") return raw;
    if (typeof raw === "string" && raw.trim()) {
      try { return JSON.parse(raw); } catch (error) {
        console.warn("[Veloraa] Invalid details_json", error);
      }
    }
    return {};
  }

  function safeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    })[char]);
  }

  function updateExtendedDetails(product) {
    const details = parseDetails(product);
    const specsTab = $("#tab-specs");
    if (specsTab) {
      const specifications = Array.isArray(details.specifications) ? details.specifications : [];
      const rows = specifications.map(item => {
        const label = typeof item === "string" ? item.split(":")[0] : (item.label || item.name || "");
        const value = typeof item === "string" ? item.slice(item.indexOf(":") + 1).trim() : (item.value || "");
        return `<div class="p-3.5 rounded-xl bg-surface-container-low flex justify-between items-start gap-4"><span class="font-label-md text-label-md text-on-surface-variant">${safeHTML(label)}</span><span class="font-label-lg text-label-lg font-semibold text-on-surface text-left">${safeHTML(value)}</span></div>`;
      }).join("");
      specsTab.innerHTML = `<div class="max-w-3xl space-y-3"><h3 class="font-headline-sm text-headline-sm text-on-surface mb-space-md">مشخصات فنی و اطلاعات محصول</h3>${rows ? `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${rows}</div>` : `<p class="text-on-surface-variant">مشخصات فنی برای این محصول ثبت نشده است.</p>`}</div>`;
    }

    const usageTab = $("#tab-usage");
    if (usageTab) {
      const usage = Array.isArray(details.usage) ? details.usage : [];
      usageTab.innerHTML = `<div class="max-w-3xl space-y-4"><h3 class="font-headline-sm text-headline-sm text-on-surface">نحوه و دستور مصرف</h3><ol class="space-y-3">${usage.map((item, index) => `<li class="flex items-start gap-3 p-4 rounded-xl bg-surface-container-low"><span class="flex-shrink-0 rounded-full bg-primary text-on-primary w-8 h-8 flex items-center justify-center font-bold">${index + 1}</span><span class="pt-1">${safeHTML(item)}</span></li>`).join("")}</ol>${usage.length ? "" : `<p class="text-on-surface-variant">دستور مصرفی ثبت نشده است.</p>`}</div>`;
    }

    const ingredientsTab = $("#tab-ingredients");
    if (ingredientsTab) {
      const ingredients = Array.isArray(details.ingredients) ? details.ingredients : [];
      ingredientsTab.innerHTML = `<div class="max-w-3xl space-y-4"><h3 class="font-headline-sm text-headline-sm text-on-surface">ترکیبات محصول</h3><ul class="grid grid-cols-1 sm:grid-cols-2 gap-3">${ingredients.map(item => `<li class="p-3.5 rounded-xl bg-surface-container-low">${safeHTML(item)}</li>`).join("")}</ul>${ingredients.length ? "" : `<p class="text-on-surface-variant">ترکیباتی ثبت نشده است.</p>`}</div>`;
    }

    const descriptionTab = $("#tab-desc");
    if (descriptionTab && Array.isArray(details.highlights) && details.highlights.length) {
      let highlights = $("#admin-product-highlights", descriptionTab);
      if (!highlights) {
        highlights = document.createElement("div");
        highlights.id = "admin-product-highlights";
        highlights.className = "grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5";
        descriptionTab.prepend(highlights);
      }
      highlights.innerHTML = details.highlights.map(item => `<div class="p-3.5 rounded-xl bg-surface-container-low flex items-center gap-2"><span class="text-primary">✓</span><span>${safeHTML(item)}</span></div>`).join("");
    }

    const gallery = details.gallery;
    if (Array.isArray(gallery) && gallery.length) {
      const galleryGrid = $("#main-product-image")?.parentElement?.parentElement?.querySelector(".grid.grid-cols-4");
      if (galleryGrid) {
        galleryGrid.innerHTML = "";
        gallery.slice(0, 8).forEach((url, index) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "relative aspect-square rounded-lg overflow-hidden bg-surface-container-lowest p-2 shadow-sm";
          const img = document.createElement("img");
          img.src = url;
          img.alt = `${product.name || "محصول"} - تصویر ${index + 2}`;
          img.className = "w-full h-full object-contain";
          button.appendChild(img);
          button.addEventListener("click", () => {
            const mainImage = $("#main-product-image");
            if (mainImage) mainImage.src = url;
          });
          galleryGrid.appendChild(button);
        });
      }
    }

    if (Array.isArray(details.badges) && details.badges.length) {
      const badgeContainer = $("#main-product-image")?.parentElement?.querySelector(".absolute.top-5.right-5");
      if (badgeContainer) {
        badgeContainer.innerHTML = details.badges.map((item, index) => `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${index === 0 ? "bg-primary text-on-primary" : "bg-secondary-fixed text-on-secondary-fixed"} font-label-md text-label-md shadow-sm">${safeHTML(item)}</span>`).join("");
      }
    }
  }

  function updateVariant(product) {
    const variant = String(
      product.variant || ""
    ).trim();

    const label = $("#selected-volume-label");
    const buttons = $$(".vol-btn");

    if (label) {
      text(
        label,
        variant || "بدون تنوع ثبت‌شده"
      );
    }

    buttons.forEach(
      button => button.remove()
    );
  }

  function updateRelatedLinks(products, currentProduct) {
    const currentId = getId(currentProduct);

    const relatedLinks = $$(
      'a[data-path="product-details"]'
    );

    const availableProducts = products.filter(
      item => getId(item) !== currentId
    );

    relatedLinks.forEach((link, index) => {
      const product = availableProducts[index];

      if (!product) {
        link.closest(".group")?.remove();
        return;
      }

      link.href =
        "product-details.html?id=" +
        encodeURIComponent(getId(product));

      text(
        link,
        product.name ||
        product.title ||
        "مشاهده محصول"
      );

      const card = link.closest(".group");

      if (!card) return;

      const image = $("img", card);

      if (image) {
        const url = getImage(product);

        if (url) {
          image.src = url;
        }

        image.alt =
          `${product.name || product.title || "محصول"} - ${getBrand(product)}`;
      }

      const price = $(
        ".font-price-numeral",
        card
      );

      if (price) {
        text(
          price,
          money(getFinalPrice(product))
        );
      }

      const brand = $(
        ".font-label-md.text-outline",
        card
      );

      if (brand) {
        text(brand, getBrand(product));
      }
    });
  }

  /* =========================
     MAIN INITIALIZATION
  ========================= */

  async function init() {
    const params = new URLSearchParams(
      location.search
    );

    const productId = params.get("id");

    if (!productId) {
      setMeta("robots", "noindex, follow");

      showMessage(
        "شناسه محصول در آدرس وجود ندارد. لطفاً از صفحه فروشگاه یک محصول انتخاب کنید."
      );

      return;
    }

    try {
      if (!window.VeloraaProducts?.load) {
        throw new Error(
          "ماژول دریافت محصولات بارگذاری نشده است."
        );
      }

      const products =
        await window.VeloraaProducts.load();

      const product = products.find(
        item => getId(item) === productId
      );

      if (!product) {
        setMeta("robots", "noindex, follow");

        showMessage(
          "محصول پیدا نشد یا در حال حاضر قابل نمایش نیست. از صفحه فروشگاه دوباره انتخابش کنید."
        );

        return;
      }

      if (!getId(product)) {
        throw new Error(
          "شناسه معتبر برای محصول وجود ندارد."
        );
      }

      const heading = $("h1");

      text(
        heading,
        product.name || product.title || "محصول"
      );

      // SEO + Google Product Schema
      updateProductSEO(product);
      updateProductSchema(product);

      // Product details
      updateBrand(product);
      updateBreadcrumb(product);
      updateImage(product);
      updatePrice(product);
      updateStock(product);
      updateDescription(product);
      updateExtendedDetails(product);
      updateVariant(product);
      updateRelatedLinks(products, product);

      window.VeloraaCurrentProduct = product;

      document.dispatchEvent(
        new CustomEvent("veloraa:product-loaded", {
          detail: { product }
        })
      );

    } catch (error) {
      console.error(
        "[Veloraa] Product details error:",
        error
      );

      showMessage(
        "دریافت اطلاعات محصول با خطا روبه‌رو شد. لطفاً صفحه را دوباره بارگذاری کنید."
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();
